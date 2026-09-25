import React, { useState } from 'react';
import { 
  Printer, 
  Share2, 
  Download, 
  X, 
  Copy, 
  Check, 
  Send, 
  Receipt,
  Store,
  Layers
} from 'lucide-react';
import { Order, StoreConfig } from '../../types/pos';
import { formatRupiah, formatDateTime } from '../../services/storage';

interface ThermalReceiptModalProps {
  order: Order | null;
  onClose: () => void;
  config: StoreConfig;
  onNewTransaction?: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  order,
  onClose,
  config,
  onNewTransaction,
}) => {
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm');
  const [copied, setCopied] = useState<boolean>(false);
  const [waPhone, setWaPhone] = useState<string>(order?.customerPhone || '');
  const [showWaInput, setShowWaInput] = useState<boolean>(false);

  if (!order) return null;

  // Print directly to Thermal Printer
  const handlePrint = () => {
    window.print();
  };

  // Generate WhatsApp formatted text
  const generateReceiptText = () => {
    const lines = [
      `*${config.storeName.toUpperCase()}*`,
      `${config.address}`,
      `Telp: ${config.phone}`,
      `--------------------------------`,
      `No. Faktur: ${order.invoiceNumber}`,
      `Tanggal   : ${formatDateTime(order.createdAt)}`,
      `Kasir     : ${order.cashierName}`,
      `Pelanggan : ${order.customerName || 'Umum'}`,
      `--------------------------------`,
    ];

    order.items.forEach((item) => {
      lines.push(`${item.productName}`);
      lines.push(
        `  ${item.quantity}x @${formatRupiah(item.unitPrice).replace('Rp ', '')} = ${formatRupiah(item.subtotal)}`
      );
      if (item.discountAmount > 0) {
        lines.push(`  (Diskon: -${formatRupiah(item.discountAmount)})`);
      }
    });

    lines.push(`--------------------------------`);
    lines.push(`Subtotal  : ${formatRupiah(order.subtotal)}`);
    if (order.globalDiscountAmount > 0) {
      lines.push(`Diskon    : -${formatRupiah(order.globalDiscountAmount)}`);
    }
    if (order.taxAmount > 0) {
      lines.push(`PPN (${order.taxPercentage}%): ${formatRupiah(order.taxAmount)}`);
    }
    lines.push(`*TOTAL    : ${formatRupiah(order.grandTotal)}*`);
    lines.push(`--------------------------------`);
    lines.push(`Metode    : ${order.payment.method.toUpperCase()}`);
    if (order.payment.method === 'cash') {
      lines.push(`Tunai     : ${formatRupiah(order.payment.amountTendered)}`);
      lines.push(`Kembalian : ${formatRupiah(order.payment.change)}`);
    } else if (order.payment.referenceNumber) {
      lines.push(`Ref/RRN   : ${order.payment.referenceNumber}`);
    }
    lines.push(`--------------------------------`);
    lines.push(`${config.receiptFooter.replace(/\n/g, '\n')}`);

    return lines.join('\n');
  };

  // Copy Receipt Text
  const handleCopyText = () => {
    navigator.clipboard.writeText(generateReceiptText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Share via WhatsApp
  const handleShareWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    let phone = waPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    }
    const message = encodeURIComponent(generateReceiptText());
    const waUrl = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${message}`
      : `https://api.whatsapp.com/send?text=${message}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Control Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Struk Transaksi Selesai
            </h3>
          </div>

          {/* Paper Width Selector (58mm vs 80mm) */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setPaperWidth('58mm')}
              className={`px-2.5 py-1 rounded font-bold transition-colors ${
                paperWidth === '58mm'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              58mm (Kecil)
            </button>
            <button
              onClick={() => setPaperWidth('80mm')}
              className={`px-2.5 py-1 rounded font-bold transition-colors ${
                paperWidth === '80mm'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              80mm (Standar)
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Preview Body */}
        <div className="p-4 sm:p-6 bg-slate-200/60 max-h-[60vh] overflow-y-auto flex justify-center">
          
          {/* THE RECEIPT ELEMENT (Target for @media print) */}
          <div
            id="thermal-receipt-print-area"
            style={{
              width: paperWidth === '58mm' ? '280px' : '380px',
              fontFamily: '"Courier New", Courier, monospace',
            }}
            className="bg-white p-4 sm:p-5 text-slate-950 text-xs shadow-md border-t-4 border-slate-800 transition-all font-thermal select-text leading-tight"
          >
            {/* Store Header */}
            <div className="text-center space-y-1 mb-3">
              <h2 className="font-bold text-sm sm:text-base tracking-tight uppercase">
                {config.storeName}
              </h2>
              <p className="text-[11px] text-slate-700">{config.address}</p>
              <p className="text-[11px] text-slate-700">Telp: {config.phone}</p>
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            {/* Invoice Meta */}
            <div className="space-y-0.5 text-[11px] text-slate-800">
              <div className="flex justify-between">
                <span>No. Faktur:</span>
                <span className="font-bold">{order.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>{formatDateTime(order.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{order.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan:</span>
                <span>{order.customerName || 'Umum'}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            {/* Line Items */}
            <div className="space-y-2 text-[11px]">
              {order.items.map((item) => (
                <div key={item.id}>
                  <div className="font-bold">{item.productName}</div>
                  <div className="flex justify-between text-slate-700">
                    <span>
                      {item.quantity} × {formatRupiah(item.unitPrice).replace('Rp ', '')}
                    </span>
                    <span>{formatRupiah(item.subtotal)}</span>
                  </div>
                  {item.discountAmount > 0 && (
                    <div className="text-[10px] text-red-600 text-right">
                      (Potongan: -{formatRupiah(item.discountAmount)})
                    </div>
                  )}
                  {item.notes && (
                    <div className="text-[10px] text-slate-500 italic">
                      * {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            {/* Summary & Totals */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatRupiah(order.subtotal)}</span>
              </div>

              {order.globalDiscountAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Diskon Faktur:</span>
                  <span>-{formatRupiah(order.globalDiscountAmount)}</span>
                </div>
              )}

              {order.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>PPN ({order.taxPercentage}%):</span>
                  <span>{formatRupiah(order.taxAmount)}</span>
                </div>
              )}

              <div className="border-t border-slate-800 pt-1 flex justify-between font-bold text-xs sm:text-sm">
                <span>TOTAL:</span>
                <span>{formatRupiah(order.grandTotal)}</span>
              </div>

              <div className="flex justify-between pt-1">
                <span>Metode Bayar:</span>
                <span className="uppercase font-semibold">{order.payment.method}</span>
              </div>

              {order.payment.method === 'cash' ? (
                <>
                  <div className="flex justify-between">
                    <span>Tunai Diterima:</span>
                    <span>{formatRupiah(order.payment.amountTendered)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Kembalian:</span>
                    <span>{formatRupiah(order.payment.change)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-[10px]">
                  <span>Nomor Reff:</span>
                  <span className="font-mono">{order.payment.referenceNumber || 'OK-APPROVED'}</span>
                </div>
              )}
            </div>

            <div className="border-b border-dashed border-slate-400 my-3" />

            {/* Footer Notes & Barcode */}
            <div className="text-center space-y-2 text-[10px] text-slate-600">
              <p className="whitespace-pre-line leading-relaxed font-sans font-medium">
                {config.receiptFooter}
              </p>

              {/* Barcode representation */}
              <div className="pt-2 flex flex-col items-center">
                <div className="h-9 w-40 flex items-stretch justify-center gap-0.5 bg-white p-0.5 border border-slate-300">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-full ${
                        [1, 2, 4, 7, 8, 11, 14, 15, 18, 20, 22, 23, 27, 28].includes(i)
                          ? 'w-1 bg-black'
                          : 'w-0.5 bg-black'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-mono text-[9px] mt-1 tracking-widest text-slate-800">
                  *{order.invoiceNumber}*
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="p-4 bg-white border-t border-slate-100 space-y-3">
          
          {/* Main Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            
            {/* Direct Thermal Print */}
            <button
              onClick={handlePrint}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/30 transition-all active:scale-98"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak (Thermal)</span>
            </button>

            {/* Toggle WhatsApp Share */}
            <button
              onClick={() => setShowWaInput(!showWaInput)}
              className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span>Kirim WhatsApp</span>
            </button>

            {/* Copy Receipt Text */}
            <button
              onClick={handleCopyText}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
            </button>

            {/* New Transaction */}
            <button
              onClick={() => {
                onClose();
                if (onNewTransaction) onNewTransaction();
              }}
              className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>+ Transaksi Baru</span>
            </button>
          </div>

          {/* WhatsApp Phone Form Drawer */}
          {showWaInput && (
            <form onSubmit={handleShareWhatsApp} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex gap-2">
              <input
                type="tel"
                placeholder="Nomor WA Pelanggan (contoh: 08123456789)"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim</span>
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
