import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  ArrowUpDown, 
  Package, 
  Layers, 
  ArrowDownRight, 
  ArrowUpRight, 
  RefreshCw,
  Image,
  Barcode,
  Sparkles
} from 'lucide-react';
import { Product, Category, User, StockAdjustment } from '../../types/pos';
import { formatRupiah, PosStorage } from '../../services/storage';

interface InventoryManagementProps {
  products: Product[];
  categories: Category[];
  currentUser: User;
  onRefresh: () => void;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  products,
  categories,
  currentUser,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [stockAdjustModal, setStockAdjustModal] = useState<{
    isOpen: boolean;
    product: Product | null;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    reason: string;
  }>({
    isOpen: false,
    product: null,
    type: 'in',
    quantity: 10,
    reason: 'Restock supplier reguler',
  });

  // Filtered & searched products
  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);
    const matchLowStock = filterLowStockOnly ? p.stock <= p.minStock : true;
    return matchCat && matchSearch && matchLowStock;
  });

  const lowStockCount = products.filter((p) => p.stock <= p.minStock && p.isActive).length;

  const handleDeleteProduct = (product: Product) => {
    if (confirm(`Yakin ingin menghapus produk "${product.name}"?`)) {
      PosStorage.deleteProduct(product.id);
      onRefresh();
    }
  };

  const handleSaveProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const productData: Product = {
      id: editingProduct ? editingProduct.id : 'prod_' + Date.now(),
      name: String(formData.get('name') || ''),
      sku: String(formData.get('sku') || ''),
      barcode: String(formData.get('barcode') || ''),
      categoryId: String(formData.get('categoryId') || categories[0]?.id || ''),
      costPrice: Number(formData.get('costPrice') || 0),
      sellingPrice: Number(formData.get('sellingPrice') || 0),
      stock: Number(formData.get('stock') || 0),
      minStock: Number(formData.get('minStock') || 5),
      unit: String(formData.get('unit') || 'pcs'),
      imageUrl: String(
        formData.get('imageUrl') ||
          'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=400'
      ),
      description: String(formData.get('description') || ''),
      isActive: true,
      variants: editingProduct?.variants,
    };

    PosStorage.saveProduct(productData);
    setEditingProduct(null);
    setIsNewProductModalOpen(false);
    onRefresh();
  };

  const handleProcessStockAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockAdjustModal.product) return;

    try {
      PosStorage.adjustStock(
        stockAdjustModal.product.id,
        stockAdjustModal.type,
        Number(stockAdjustModal.quantity),
        stockAdjustModal.reason,
        currentUser
      );
      setStockAdjustModal({ ...stockAdjustModal, isOpen: false });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah stok');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner / Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Katalog Produk & Inventaris</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data master barang, barcode SKU, harga modal (HPP), harga jual, dan stok barang
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Low Stock Filter Button */}
          <button
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border ${
              filterLowStockOnly
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Stok Menipis ({lowStockCount})</span>
          </button>

          {/* Add Product Button */}
          <button
            onClick={() => {
              setEditingProduct(null);
              setIsNewProductModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/30 transition-all active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk Baru</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama produk, SKU, barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        {/* Category filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({products.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === c.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Produk & SKU</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-right">Harga Modal (HPP)</th>
                <th className="py-3 px-4 text-right">Harga Jual</th>
                <th className="py-3 px-4 text-right">Margin / Profit</th>
                <th className="py-3 px-4 text-center">Status Stok</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const profit = p.sellingPrice - p.costPrice;
                const marginPct = p.sellingPrice > 0 ? Math.round((profit / p.sellingPrice) * 100) : 0;
                const isLow = p.stock <= p.minStock && p.stock > 0;
                const isOut = p.stock <= 0;
                const category = categories.find((c) => c.id === p.categoryId);

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    
                    {/* Product & SKU */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-slate-900 text-xs sm:text-sm">{p.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                            <span>SKU: {p.sku}</span>
                            <span>•</span>
                            <span>Barcode: {p.barcode}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {category?.name || 'Umum'}
                    </td>

                    {/* Cost Price */}
                    <td className="py-3 px-4 text-right text-slate-600 font-medium">
                      {formatRupiah(p.costPrice)}
                    </td>

                    {/* Selling Price */}
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatRupiah(p.sellingPrice)}
                    </td>

                    {/* Margin */}
                    <td className="py-3 px-4 text-right">
                      <span className="font-semibold text-emerald-700 block">
                        +{formatRupiah(profit)}
                      </span>
                      <span className="text-[10px] text-slate-400">({marginPct}%)</span>
                    </td>

                    {/* Stock Status & Restock Button */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isOut
                              ? 'bg-red-100 text-red-700'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {p.stock} {p.unit}
                        </span>
                        {isLow && (
                          <span className="text-[10px] text-amber-600 font-semibold mt-0.5">
                            Min: {p.minStock} {p.unit}
                          </span>
                        )}
                        <button
                          onClick={() =>
                            setStockAdjustModal({
                              isOpen: true,
                              product: p,
                              type: 'in',
                              quantity: 10,
                              reason: 'Restock produk baru',
                            })
                          }
                          className="text-[10px] text-emerald-600 hover:text-emerald-800 hover:underline mt-1 font-semibold"
                        >
                          + Sesuaikan Stok
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            setIsNewProductModalOpen(true);
                          }}
                          title="Edit Produk"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p)}
                          title="Hapus Produk"
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Tidak ada produk ditemukan</p>
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT PRODUCT */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 my-auto">
            <h3 className="font-bold text-slate-900 text-lg mb-1">
              {editingProduct ? 'Edit Informasi Produk' : 'Tambah Produk Baru'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Lengkapi informasi SKU, barcode, harga beli (HPP), dan harga jual
            </p>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Product Name */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nama Produk *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingProduct?.name || ''}
                    placeholder="Contoh: Caramel Macchiato Iced"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                {/* SKU */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    SKU Kode *
                  </label>
                  <input
                    type="text"
                    name="sku"
                    required
                    defaultValue={editingProduct?.sku || `SKU-${Date.now().toString().slice(-6)}`}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase"
                  />
                </div>

                {/* Barcode */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Barcode (EAN-13/UPC) *
                  </label>
                  <input
                    type="text"
                    name="barcode"
                    required
                    defaultValue={editingProduct?.barcode || `899${Math.floor(100000000 + Math.random() * 900000000)}`}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Kategori *
                  </label>
                  <select
                    name="categoryId"
                    defaultValue={editingProduct?.categoryId || categories[0]?.id}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unit */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Satuan Unit
                  </label>
                  <input
                    type="text"
                    name="unit"
                    defaultValue={editingProduct?.unit || 'pcs'}
                    placeholder="pcs / cup / porsi / pack"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                {/* Cost Price */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Harga Modal / Beli (HPP Rp) *
                  </label>
                  <input
                    type="number"
                    name="costPrice"
                    min="0"
                    required
                    defaultValue={editingProduct?.costPrice || 10000}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Harga Jual (Rp) *
                  </label>
                  <input
                    type="number"
                    name="sellingPrice"
                    min="0"
                    required
                    defaultValue={editingProduct?.sellingPrice || 25000}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700"
                  />
                </div>

                {/* Stock Initial */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Jumlah Stok Sekarang *
                  </label>
                  <input
                    type="number"
                    name="stock"
                    min="0"
                    required
                    defaultValue={editingProduct?.stock || 50}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                {/* Min Stock */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Batas Minimum Stok (Alert) *
                  </label>
                  <input
                    type="number"
                    name="minStock"
                    min="0"
                    required
                    defaultValue={editingProduct?.minStock || 10}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                {/* Image URL */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    URL Foto Produk
                  </label>
                  <input
                    type="url"
                    name="imageUrl"
                    defaultValue={editingProduct?.imageUrl || 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400'}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  {editingProduct ? 'Simpan Perubahan' : 'Buat Produk Sekarang'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewProductModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STOCK ADJUSTMENT & RESTOCK */}
      {stockAdjustModal.isOpen && stockAdjustModal.product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Penyesuaian Stok Barang
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {stockAdjustModal.product.name} (Sisa saat ini: {stockAdjustModal.product.stock} {stockAdjustModal.product.unit})
            </p>

            <form onSubmit={handleProcessStockAdjust} className="space-y-4">
              
              {/* Type */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStockAdjustModal({ ...stockAdjustModal, type: 'in' })}
                  className={`py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
                    stockAdjustModal.type === 'in'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <ArrowDownRight className="w-3.5 h-3.5" /> Masuk (+)
                </button>
                <button
                  type="button"
                  onClick={() => setStockAdjustModal({ ...stockAdjustModal, type: 'out' })}
                  className={`py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
                    stockAdjustModal.type === 'out'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" /> Keluar (-)
                </button>
                <button
                  type="button"
                  onClick={() => setStockAdjustModal({ ...stockAdjustModal, type: 'adjustment' })}
                  className={`py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
                    stockAdjustModal.type === 'adjustment'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Opname (=)
                </button>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Jumlah {stockAdjustModal.type === 'adjustment' ? 'Stok Fisik Baru' : 'Jumlah Perubahan'}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={stockAdjustModal.quantity}
                  onChange={(e) =>
                    setStockAdjustModal({ ...stockAdjustModal, quantity: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Alasan Perubahan / Catatan Audit
                </label>
                <input
                  type="text"
                  required
                  value={stockAdjustModal.reason}
                  onChange={(e) =>
                    setStockAdjustModal({ ...stockAdjustModal, reason: e.target.value })
                  }
                  placeholder="Misal: Restock dari supplier CV Kopi Sejahtera / Barang rusak"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Simpan Perubahan Stok
                </button>
                <button
                  type="button"
                  onClick={() => setStockAdjustModal({ ...stockAdjustModal, isOpen: false })}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
