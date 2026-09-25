import React, { useState, useMemo } from 'react';
import { 
  X, 
  Banknote, 
  QrCode, 
  CreditCard, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  User as UserIcon, 
  Phone, 
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { CartItem, PaymentDetails, PaymentMethod, StoreConfig, User, Order } from '../../types/pos';
import { formatRupiah, PosStorage } from '../../services/storage';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  currentUser: User;
  config: StoreConfig;
  globalDiscountType: 'percent' | 'nominal';
  globalDiscountValue: number;
  onCheckoutSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  currentUser,
  config,
  globalDiscountType,
  globalDiscountValue,
  onCheckoutSuccess,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<string>('BCA');
  const [approvalCode, setApprovalCode] = useState<string>('APRV-' + Math.floor(100000 + Math.random() * 900000));
  const [notes, setNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Compute Grand Total
  const { subtotal, discountedSubtotal, taxAmount, grandTotal } = useMemo(() => {
    let sub = 0;
    cart.forEach((item) => {
      const unitPrice = item.product.sellingPrice + (item.selectedVariant?.priceAdjustment || 0);
      let disc = 0;
      if (item.discountType === 'percent' && item.discountValue) {
        disc = Math.round((unitPrice * item.discountValue) / 100);
      } else if (item.discountType === 'nominal' && item.discountValue) {
        disc = item.discountValue;
      }
      sub += Math.max(0, unitPrice - disc) * item.quantity;
    });

    let gDisc = 0;
    if (globalDiscountType === 'percent' && globalDiscountValue) {
      gDisc = Math.round((sub * globalDiscountValue) / 100);
    } else if (globalDiscountType === 'nominal' && globalDiscountValue) {
      gDisc = globalDiscountValue;
    }
    gDisc = Math.min(gDisc, sub);

    const discSub = Math.max(0, sub - gDisc);
    const taxRate = config.enableTax ? config.taxPercentage : 0;
    const tax = Math.round((discSub * taxRate) / 100);
    const grand = discSub + tax;

    return {
      subtotal: sub,
      discountedSubtotal: discSub,
      taxAmount: tax,
      grandTotal: grand,
    };
  }, [cart, globalDiscountType, globalDiscountValue, config]);

  // Cash suggestions
  const cashSuggestions = useMemo(() => {
    const list = [grandTotal];
    const rounded50 = Math.ceil(grandTotal / 50000) * 50000;
    const rounded100 = Math.ceil(grandTotal / 100000) * 100000;

    if (!list.includes(rounded50) && rounded50 > grandTotal) list.push(rounded50);
    if (!list.includes(rounded100) && rounded100 > grandTotal) list.push(rounded100);
    [50000, 100000, 200000, 500000].forEach((val) => {
      if (val >= grandTotal && !list.includes(val)) list.push(val);
    });
    return list.slice(0, 4);
  }, [grandTotal]);

  const change = typeof cashTendered === 'number' ? Math.max(0, cashTendered - grandTotal) : 0;
  const isCashInsufficient = selectedMethod === 'cash' && (typeof cashTendered !== 'number' || cashTendered < grandTotal);

  if (!isOpen) return null;

  const handleProcessCheckout = () => {
    setErrorMessage(null);
    setIsProcessing(true);

    const paymentDetails: PaymentDetails = {
      method: selectedMethod,
      amountTendered: selectedMethod === 'cash' ? Number(cashTendered) : grandTotal,
      change: selectedMethod === 'cash' ? change : 0,
      bankName: selectedMethod === 'bank_transfer' ? selectedBank : selectedMethod === 'card' ? `${selectedBank} Card EDC` : undefined,
      referenceNumber:
        selectedMethod === 'qris'
          ? 'QRIS-' + Date.now().toString().slice(-6)
          : selectedMethod === 'card'
          ? approvalCode
          : selectedMethod === 'bank_transfer'
          ? 'VA-' + Math.floor(100000000 + Math.random() * 900000000)
          : undefined,
    };

    // Atomic execution via storage service
    const result = PosStorage.processCheckout({
      cartItems: cart,
      payment: paymentDetails,
      cashier: currentUser,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      globalDiscountType,
      globalDiscountValue,
      notes: notes.trim() || undefined,
    });

    setIsProcessing(false);

    if (result.success && result.order) {
      onCheckoutSuccess(result.order);
      onClose();
    } else {
      setErrorMessage(result.error || 'Terjadi kesalahan saat memproses transaksi');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pembayaran Kasir</h2>
            <p className="text-xs text-slate-500">Pilih kanal pembayaran & verifikasi nominal</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Total Banner */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-4 sm:p-5 shadow-sm shadow-emerald-700/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-emerald-100 uppercase tracking-wider block">
                Total Tagihan
              </span>
              <span className="text-2xl sm:text-3xl font-black tracking-tight">
                {formatRupiah(grandTotal)}
              </span>
            </div>
            <div className="text-xs text-emerald-100 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 self-start sm:self-auto">
              <span>{cart.reduce((a, b) => a + b.quantity, 0)} Item</span>
              {config.enableTax && <span className="ml-1.5">• Termasuk PPN {config.taxPercentage}%</span>}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 block">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              
              {/* Cash */}
              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('cash');
                  setCashTendered(grandTotal);
                }}
                className={`p-3 rounded-xl border text-left flex flex-col items-center gap-2 transition-all ${
                  selectedMethod === 'cash'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${selectedMethod === 'cash' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Banknote className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold">Tunai (Cash)</span>
              </button>

              {/* QRIS */}
              <button
                type="button"
                onClick={() => setSelectedMethod('qris')}
                className={`p-3 rounded-xl border text-left flex flex-col items-center gap-2 transition-all ${
                  selectedMethod === 'qris'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${selectedMethod === 'qris' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <QrCode className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold">QRIS Dinamis</span>
              </button>

              {/* Bank Transfer */}
              <button
                type="button"
                onClick={() => setSelectedMethod('bank_transfer')}
                className={`p-3 rounded-xl border text-left flex flex-col items-center gap-2 transition-all ${
                  selectedMethod === 'bank_transfer'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${selectedMethod === 'bank_transfer' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold">Transfer / VA</span>
              </button>

              {/* Debit/Credit Card */}
              <button
                type="button"
                onClick={() => setSelectedMethod('card')}
                className={`p-3 rounded-xl border text-left flex flex-col items-center gap-2 transition-all ${
                  selectedMethod === 'card'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${selectedMethod === 'card' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold">Kartu / EDC</span>
              </button>

            </div>
          </div>

          {/* METHOD-SPECIFIC INTERFACE */}
          
          {/* 1. TUNAI / CASH */}
          {selectedMethod === 'cash' && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Uang Diterima dari Pembeli (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap gap-2">
                {cashSuggestions.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashTendered(amt)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-xs font-bold text-slate-800 transition-colors shadow-2xs"
                  >
                    {amt === grandTotal ? `Uang Pas (${formatRupiah(amt)})` : formatRupiah(amt)}
                  </button>
                ))}
              </div>

              {/* Kembalian Banner */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Uang Kembalian:
                </span>
                <span className={`text-xl font-black ${isCashInsufficient ? 'text-red-500' : 'text-emerald-700'}`}>
                  {isCashInsufficient ? 'Uang Kurang' : formatRupiah(change)}
                </span>
              </div>
            </div>
          )}

          {/* 2. QRIS DINAMIS */}
          {selectedMethod === 'qris' && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col items-center">
                {/* Simulated QR Code Graphic */}
                <div className="w-36 h-36 bg-slate-900 rounded-lg p-2 flex items-center justify-center relative">
                  <div className="w-full h-full bg-white p-1 rounded grid grid-cols-6 grid-rows-6 gap-0.5">
                    {/* Simulated pixel pattern */}
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-xs ${
                          [0, 1, 2, 6, 8, 12, 13, 14, 21, 22, 23, 27, 29, 33, 34, 35, 5, 11, 17, 30].includes(i)
                            ? 'bg-slate-900'
                            : (i % 3 === 0 ? 'bg-slate-900' : 'bg-slate-100')
                        }`}
                      />
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">
                      QRIS
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-500 mt-2">
                  NMID: {config.qrisNmid}
                </span>
              </div>

              <div className="space-y-1.5 flex-1">
                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Siap di-scan pembeli
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  {config.storeName}
                </h4>
                <p className="text-xs text-slate-500">
                  Mendukung GoPay, OVO, Dana, ShopeePay, BCA, Mandiri Livin, BRImo, dll.
                </p>
                <p className="text-xs font-bold text-emerald-700">
                  Nominal Pas: {formatRupiah(grandTotal)}
                </p>
                <div className="pt-2">
                  <span className="text-[10px] text-slate-400">
                    *QRIS ini bersifat statis/dinamis real-time tanpa input nominal manual di HP pelanggan.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. TRANSFER BANK & VA */}
          {selectedMethod === 'bank_transfer' && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <label className="text-xs font-bold text-slate-700 block">Pilih Bank Rekening Toko</label>
              <div className="grid grid-cols-4 gap-2">
                {['BCA', 'Mandiri', 'BRI', 'BNI'].map((bank) => (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => setSelectedBank(bank)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors ${
                      selectedBank === bank
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {bank}
                  </button>
                ))}
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <p className="text-slate-400">No. Rekening / Virtual Account:</p>
                  <p className="font-mono font-bold text-sm text-slate-800">8988 0812 3456 7890</p>
                  <p className="text-[10px] text-slate-500">a.n. {config.legalName}</p>
                </div>
                <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-1 rounded text-[11px]">
                  Terverifikasi
                </span>
              </div>
            </div>
          )}

          {/* 4. KARTU DEBIT / KREDIT */}
          {selectedMethod === 'card' && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Pilih Mesin EDC</label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="BCA">EDC BCA Merchant</option>
                    <option value="Mandiri">EDC Mandiri</option>
                    <option value="BRI">EDC BRI Merchant</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Kode Approval / RRN</label>
                  <input
                    type="text"
                    value={approvalCode}
                    onChange={(e) => setApprovalCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Silakan gesek / masukkan kartu chip pelanggan pada mesin EDC dan pastikan transaksi Approved.
              </p>
            </div>
          )}

          {/* Customer Metadata (Optional for digital receipt via WA) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                Nama Pelanggan (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: Bpk. Bambang"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                No. WhatsApp (Untuk Kirim Struk)
              </label>
              <input
                type="tel"
                placeholder="0812xxxxxxx"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={isCashInsufficient || isProcessing}
            onClick={handleProcessCheckout}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all ${
              isCashInsufficient || isProcessing
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 active:scale-99'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Memproses Database...</span>
              </>
            ) : (
              <>
                <span>Selesaikan Transaksi & Cetak Struk</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
