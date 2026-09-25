import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Barcode, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingBag, 
  Percent, 
  Receipt, 
  RotateCcw, 
  Check, 
  Tag, 
  Sparkles, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { Product, Category, CartItem, ProductVariant, StoreConfig, User } from '../../types/pos';
import { formatRupiah } from '../../services/storage';

interface PosTerminalProps {
  products: Product[];
  categories: Category[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  config: StoreConfig;
  currentUser: User;
  onOpenCheckout: () => void;
  globalDiscountType: 'percent' | 'nominal';
  setGlobalDiscountType: (type: 'percent' | 'nominal') => void;
  globalDiscountValue: number;
  setGlobalDiscountValue: (val: number) => void;
}

export const PosTerminal: React.FC<PosTerminalProps> = ({
  products,
  categories,
  cart,
  setCart,
  config,
  currentUser,
  onOpenCheckout,
  globalDiscountType,
  setGlobalDiscountType,
  globalDiscountValue,
  setGlobalDiscountValue,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [showItemDiscountModal, setShowItemDiscountModal] = useState<boolean>(false);
  const [showGlobalDiscountModal, setShowGlobalDiscountModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Filter products by category & search
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.isActive) return false;
      const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Handle Add to Cart
  const handleAddToCart = (product: Product, variant?: ProductVariant) => {
    if (product.stock <= 0) {
      showToast(`Stok "${product.name}" habis!`);
      return;
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) =>
          item.product.id === product.id &&
          (item.selectedVariant?.id || '') === (variant?.id || '')
      );

      if (existingIndex >= 0) {
        const currentQty = prevCart[existingIndex].quantity;
        if (currentQty + 1 > product.stock) {
          showToast(`Maksimal stok tercapai (${product.stock})`);
          return prevCart;
        }
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: currentQty + 1,
        };
        return updated;
      } else {
        const newItem: CartItem = {
          cartItemId: 'ci_' + Date.now() + Math.random().toString(36).substring(2, 5),
          product,
          quantity: 1,
          selectedVariant: variant,
          discountType: 'percent',
          discountValue: 0,
        };
        return [...prevCart, newItem];
      }
    });

    showToast(`Ditambahkan: ${product.name}`);
  };

  // Handle Barcode Scan
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const code = barcodeInput.trim();
    const foundProduct = products.find(
      (p) => p.barcode === code || p.sku.toLowerCase() === code.toLowerCase()
    );

    if (foundProduct) {
      if (foundProduct.variants && foundProduct.variants.length > 0) {
        setSelectedProductForVariant(foundProduct);
      } else {
        handleAddToCart(foundProduct);
      }
      setBarcodeInput('');
    } else {
      showToast(`Barcode "${code}" tidak ditemukan!`);
    }
  };

  // Cart Qty updates
  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.stock) {
              showToast(`Maksimal stok tersedia: ${item.product.stock}`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (confirm('Kosongkan keranjang belanja saat ini?')) {
      setCart([]);
      setGlobalDiscountValue(0);
    }
  };

  // Subtotal & Totals calculation
  const calculations = useMemo(() => {
    let subtotal = 0;
    let itemDiscountsTotal = 0;

    cart.forEach((item) => {
      const unitPrice =
        item.product.sellingPrice + (item.selectedVariant?.priceAdjustment || 0);
      let disc = 0;
      if (item.discountType === 'percent' && item.discountValue) {
        disc = Math.round((unitPrice * item.discountValue) / 100);
      } else if (item.discountType === 'nominal' && item.discountValue) {
        disc = item.discountValue;
      }
      const effectivePrice = Math.max(0, unitPrice - disc);
      itemDiscountsTotal += disc * item.quantity;
      subtotal += effectivePrice * item.quantity;
    });

    let globalDiscount = 0;
    if (globalDiscountType === 'percent' && globalDiscountValue) {
      globalDiscount = Math.round((subtotal * globalDiscountValue) / 100);
    } else if (globalDiscountType === 'nominal' && globalDiscountValue) {
      globalDiscount = globalDiscountValue;
    }
    globalDiscount = Math.min(globalDiscount, subtotal);

    const afterDiscountSubtotal = Math.max(0, subtotal - globalDiscount);
    const taxRate = config.enableTax ? config.taxPercentage : 0;
    const taxAmount = Math.round((afterDiscountSubtotal * taxRate) / 100);
    const grandTotal = afterDiscountSubtotal + taxAmount;

    return {
      subtotal,
      itemDiscountsTotal,
      globalDiscount,
      taxAmount,
      taxRate,
      grandTotal,
      itemCount: cart.reduce((acc, it) => acc + it.quantity, 0),
    };
  }, [cart, globalDiscountType, globalDiscountValue, config]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-150">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT SECTION: Catalog & Search (Col 8) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          
          {/* Top Search & Barcode Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
            
            {/* Text Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari produk (Nama atau SKU)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Barcode Scanner Input Form */}
            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <div className="relative w-full sm:w-56">
                <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Scan Barcode / Tekan Enter"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                Scan
              </button>
            </form>
          </div>

          {/* Quick Barcode Simulator Helpers */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-slate-500 scrollbar-none">
            <span className="font-semibold text-slate-600 shrink-0">Tes Barcode:</span>
            {products.slice(0, 5).map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setBarcodeInput(p.barcode);
                  const found = products.find((x) => x.barcode === p.barcode);
                  if (found) handleAddToCart(found);
                }}
                className="bg-white hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg font-mono text-[11px] text-slate-700 shrink-0 transition-colors"
                title={`Tambah ${p.name}`}
              >
                {p.barcode} ({p.name.substring(0, 10)}..)
              </button>
            ))}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Semua Menu ({products.length})
            </button>
            {categories.map((cat) => {
              const count = products.filter((p) => p.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredProducts.map((product) => {
              const isLow = product.stock <= product.minStock && product.stock > 0;
              const isOut = product.stock <= 0;

              return (
                <div
                  key={product.id}
                  onClick={() => {
                    if (isOut) return;
                    if (product.variants && product.variants.length > 0) {
                      setSelectedProductForVariant(product);
                    } else {
                      handleAddToCart(product);
                    }
                  }}
                  className={`group bg-white rounded-2xl border border-slate-200/80 p-2.5 flex flex-col justify-between transition-all duration-150 relative cursor-pointer hover:shadow-md hover:border-emerald-500/40 ${
                    isOut ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'active:scale-98'
                  }`}
                >
                  <div>
                    {/* Image & Badges */}
                    <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-100 mb-2">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {/* Stock Badge */}
                      <div className="absolute top-1.5 right-1.5">
                        {isOut ? (
                          <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                            Habis
                          </span>
                        ) : isLow ? (
                          <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                            Sisa {product.stock}
                          </span>
                        ) : (
                          <span className="bg-slate-900/70 backdrop-blur-xs text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md">
                            Stok {product.stock}
                          </span>
                        )}
                      </div>

                      {/* Has Variant Indicator */}
                      {product.variants && product.variants.length > 0 && (
                        <div className="absolute bottom-1.5 left-1.5 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          {product.variants.length} Varian
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                      {product.sku}
                    </p>
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
                      {product.name}
                    </h3>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-emerald-600">
                        {formatRupiah(product.sellingPrice)}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={isOut}
                      className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors shadow-2xs"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-slate-700">Produk Tidak Ditemukan</h4>
              <p className="text-xs text-slate-400 mt-1">
                Coba sesuaikan kata kunci pencarian atau kategori yang dipilih.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT SECTION: Cart Drawer / Billing Panel (Col 4) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md flex flex-col h-[calc(100vh-6rem)] sticky top-20">
            
            {/* Cart Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-slate-900 text-base">Keranjang Pesanan</h2>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">
                    {calculations.itemCount} Item
                  </span>
                </div>
                <p className="text-xs text-slate-400">Kasir: {currentUser.name}</p>
              </div>

              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  title="Batalkan / Kosongkan Keranjang"
                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <ShoppingBag className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">Keranjang Belanja Masih Kosong</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                    Pilih menu di katalog samping atau scan barcode produk untuk memulai transaksi.
                  </p>
                </div>
              ) : (
                cart.map((item) => {
                  const basePrice =
                    item.product.sellingPrice + (item.selectedVariant?.priceAdjustment || 0);
                  let itemDisc = 0;
                  if (item.discountType === 'percent' && item.discountValue) {
                    itemDisc = Math.round((basePrice * item.discountValue) / 100);
                  } else if (item.discountType === 'nominal' && item.discountValue) {
                    itemDisc = item.discountValue;
                  }
                  const finalUnitPrice = Math.max(0, basePrice - itemDisc);
                  const itemTotal = finalUnitPrice * item.quantity;

                  return (
                    <div key={item.cartItemId} className="py-3 flex flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-900 leading-tight">
                            {item.product.name}
                          </p>
                          {item.selectedVariant && (
                            <p className="text-[11px] text-indigo-600 font-medium">
                              Varian: {item.selectedVariant.name}
                            </p>
                          )}
                          <p className="text-[11px] text-slate-500">
                            {formatRupiah(finalUnitPrice)} × {item.quantity}
                          </p>
                          {item.discountValue ? (
                            <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.2 rounded font-semibold inline-block mt-0.5">
                              Diskon Item: {item.discountType === 'percent' ? `${item.discountValue}%` : formatRupiah(item.discountValue)}
                            </span>
                          ) : null}
                          {item.notes && (
                            <p className="text-[10px] text-slate-400 italic">
                              Catatan: {item.notes}
                            </p>
                          )}
                        </div>

                        {/* Item Total */}
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-900">
                            {formatRupiah(itemTotal)}
                          </span>
                        </div>
                      </div>

                      {/* Controls Row */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingCartItem(item);
                              setShowItemDiscountModal(true);
                            }}
                            className="text-[11px] text-slate-500 hover:text-emerald-700 hover:bg-slate-100 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1 transition-colors"
                          >
                            <Tag className="w-3 h-3" /> Diskon
                          </button>
                        </div>

                        {/* Qty Counter */}
                        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                          <button
                            onClick={() => updateQuantity(item.cartItemId, -1)}
                            className="w-6 h-6 rounded bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center shadow-2xs text-xs font-bold"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center font-bold text-xs text-slate-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.cartItemId, 1)}
                            className="w-6 h-6 rounded bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center shadow-2xs text-xs font-bold"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.cartItemId)}
                            className="w-6 h-6 rounded text-red-500 hover:bg-red-50 flex items-center justify-center ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Calculations & Checkout Button */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
              {/* Discount Promo Button */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <button
                  onClick={() => setShowGlobalDiscountModal(true)}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1 rounded-lg transition-colors border border-emerald-200/70"
                >
                  <Percent className="w-3.5 h-3.5" />
                  {globalDiscountValue > 0
                    ? `Diskon Faktur: ${globalDiscountType === 'percent' ? `${globalDiscountValue}%` : formatRupiah(globalDiscountValue)}`
                    : '+ Tambah Diskon Faktur'}
                </button>
                {globalDiscountValue > 0 && (
                  <button
                    onClick={() => setGlobalDiscountValue(0)}
                    className="text-[11px] text-red-500 hover:underline"
                  >
                    Hapus
                  </button>
                )}
              </div>

              {/* Subtotal */}
              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal Item</span>
                <span className="font-semibold text-slate-900">
                  {formatRupiah(calculations.subtotal)}
                </span>
              </div>

              {/* Global Discount */}
              {calculations.globalDiscount > 0 && (
                <div className="flex justify-between text-xs text-red-600">
                  <span>Diskon Faktur</span>
                  <span className="font-semibold">
                    -{formatRupiah(calculations.globalDiscount)}
                  </span>
                </div>
              )}

              {/* Tax PPN */}
              {config.enableTax && (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>PPN ({calculations.taxRate}%)</span>
                  <span className="font-semibold text-slate-900">
                    {formatRupiah(calculations.taxAmount)}
                  </span>
                </div>
              )}

              {/* Grand Total */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <div>
                  <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
                    Total Pembayaran
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-700">
                    {formatRupiah(calculations.grandTotal)}
                  </span>
                </div>
              </div>

              {/* Pay Button */}
              <button
                disabled={cart.length === 0}
                onClick={onOpenCheckout}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
                  cart.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 active:scale-99'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                <Receipt className="w-5 h-5" />
                <span>Bayar Transaksi (F9)</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* MODAL 1: Select Variant Modal */}
      {selectedProductForVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Pilih Varian
            </h3>
            <p className="text-xs text-slate-500 mb-4">{selectedProductForVariant.name}</p>

            <div className="space-y-2 mb-5">
              {selectedProductForVariant.variants?.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    handleAddToCart(selectedProductForVariant, v);
                    setSelectedProductForVariant(null);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-left transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-800">{v.name}</span>
                  <span className="text-xs font-bold text-emerald-600">
                    {v.priceAdjustment > 0
                      ? `+${formatRupiah(v.priceAdjustment)}`
                      : 'Harga Dasar'}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setSelectedProductForVariant(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Item Discount & Notes Modal */}
      {showItemDiscountModal && editingCartItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Diskon & Catatan Item
            </h3>
            <p className="text-xs text-slate-500 mb-4">{editingCartItem.product.name}</p>

            <div className="space-y-4 mb-5">
              {/* Discount Type */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setEditingCartItem({ ...editingCartItem, discountType: 'percent' })
                  }
                  className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                    editingCartItem.discountType === 'percent'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Persentase (%)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditingCartItem({ ...editingCartItem, discountType: 'nominal' })
                  }
                  className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                    editingCartItem.discountType === 'nominal'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Nominal (Rp)
                </button>
              </div>

              {/* Discount Value */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Nilai Diskon
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingCartItem.discountValue || ''}
                  onChange={(e) =>
                    setEditingCartItem({
                      ...editingCartItem,
                      discountValue: Number(e.target.value),
                    })
                  }
                  placeholder={editingCartItem.discountType === 'percent' ? 'Contoh: 10' : 'Contoh: 5000'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Catatan Khusus
                </label>
                <input
                  type="text"
                  value={editingCartItem.notes || ''}
                  onChange={(e) =>
                    setEditingCartItem({
                      ...editingCartItem,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Misal: Less ice, jangan pakai sedotan"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCart((prev) =>
                    prev.map((it) =>
                      it.cartItemId === editingCartItem.cartItemId ? editingCartItem : it
                    )
                  );
                  setShowItemDiscountModal(false);
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                Simpan Perubahan
              </button>
              <button
                onClick={() => setShowItemDiscountModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Global Invoice Discount Modal */}
      {showGlobalDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Diskon Total Transaksi
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Diskon akan diterapkan pada subtotal keseluruhan faktur.
            </p>

            <div className="space-y-4 mb-5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGlobalDiscountType('percent')}
                  className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                    globalDiscountType === 'percent'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Persentase (%)
                </button>
                <button
                  type="button"
                  onClick={() => setGlobalDiscountType('nominal')}
                  className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                    globalDiscountType === 'nominal'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Nominal (Rp)
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Nilai Diskon
                </label>
                <input
                  type="number"
                  min="0"
                  value={globalDiscountValue || ''}
                  onChange={(e) => setGlobalDiscountValue(Number(e.target.value))}
                  placeholder={globalDiscountType === 'percent' ? 'Misal: 10 (%)' : 'Misal: 15000 (Rp)'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Quick Percentage Chips */}
              {globalDiscountType === 'percent' && (
                <div className="flex gap-2">
                  {[5, 10, 15, 20, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setGlobalDiscountValue(pct)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowGlobalDiscountModal(false)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                Terapkan Diskon
              </button>
              <button
                onClick={() => {
                  setGlobalDiscountValue(0);
                  setShowGlobalDiscountModal(false);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
