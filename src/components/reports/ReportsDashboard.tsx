import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Download, 
  Search, 
  Calendar, 
  Receipt, 
  Eye, 
  ArrowUpRight, 
  CreditCard, 
  QrCode, 
  Banknote,
  RotateCcw,
  Sparkles,
  Award
} from 'lucide-react';
import { Order, User, StoreConfig } from '../../types/pos';
import { formatRupiah, formatDateTime, PosStorage } from '../../services/storage';

interface ReportsDashboardProps {
  orders: Order[];
  currentUser: User;
  config: StoreConfig;
  onOpenReceipt: (order: Order) => void;
  onRefresh: () => void;
}

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({
  orders,
  currentUser,
  config,
  onOpenReceipt,
  onRefresh,
}) => {
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | 'month' | 'all'>('today');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [searchInvoice, setSearchInvoice] = useState<string>('');
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<Order | null>(null);

  // Filter orders based on active filters
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return orders.filter((o) => {
      const orderDate = new Date(o.createdAt);
      const orderDateStr = o.createdAt.split('T')[0];

      // Date match
      let matchDate = true;
      if (dateFilter === 'today') {
        matchDate = orderDateStr === todayStr;
      } else if (dateFilter === '7days') {
        const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        matchDate = diffDays <= 7;
      } else if (dateFilter === 'month') {
        matchDate =
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear();
      }

      // Method match
      const matchMethod =
        selectedMethod === 'all' || o.payment.method === selectedMethod;

      // Cashier match
      const matchCashier =
        selectedCashier === 'all' || o.cashierId === selectedCashier;

      // Invoice / Customer match
      const matchSearch =
        o.invoiceNumber.toLowerCase().includes(searchInvoice.toLowerCase()) ||
        (o.customerName &&
          o.customerName.toLowerCase().includes(searchInvoice.toLowerCase()));

      return matchDate && matchMethod && matchCashier && matchSearch;
    });
  }, [orders, dateFilter, selectedMethod, selectedCashier, searchInvoice]);

  // Aggregate Metrics (Omset, Transaksi, Laba Bersih, HPP)
  const metrics = useMemo(() => {
    let grossSales = 0;
    let totalCost = 0;
    let netProfit = 0;
    let completedCount = 0;
    const paymentBreakdown: Record<string, number> = {
      cash: 0,
      qris: 0,
      card: 0,
      bank_transfer: 0,
    };
    const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};

    filteredOrders.forEach((o) => {
      if (o.status === 'completed') {
        grossSales += o.grandTotal;
        totalCost += o.totalCost;
        netProfit += o.netProfit;
        completedCount++;

        const method = o.payment.method;
        paymentBreakdown[method] = (paymentBreakdown[method] || 0) + o.grandTotal;

        o.items.forEach((item) => {
          if (!productSalesMap[item.productId]) {
            productSalesMap[item.productId] = {
              name: item.productName,
              qty: 0,
              revenue: 0,
            };
          }
          productSalesMap[item.productId].qty += item.quantity;
          productSalesMap[item.productId].revenue += item.subtotal;
        });
      }
    });

    const topSelling = Object.values(productSalesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      grossSales,
      totalCost,
      netProfit,
      completedCount,
      paymentBreakdown,
      topSelling,
      marginPct: grossSales > 0 ? Math.round((netProfit / grossSales) * 100) : 0,
    };
  }, [filteredOrders]);

  // Unique cashiers
  const cashierList = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => map.set(o.cashierId, o.cashierName));
    return Array.from(map.entries());
  }, [orders]);

  // Cancel / Refund Order
  const handleCancelOrder = (order: Order) => {
    const reason = prompt('Masukkan alasan pembatalan / retur transaksi:');
    if (reason) {
      PosStorage.cancelOrder(order.id, reason);
      onRefresh();
      setSelectedDetailOrder(null);
    }
  };

  // Export to CSV / Excel
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      alert('Tidak ada data transaksi untuk diekspor');
      return;
    }

    const headers = [
      'No Faktur',
      'Tanggal & Waktu',
      'Kasir',
      'Pelanggan',
      'Jumlah Item',
      'Subtotal',
      'Diskon',
      'PPN',
      'Total Bayar',
      'Metode Bayar',
      'Status',
    ];

    const rows = filteredOrders.map((o) => [
      `"${o.invoiceNumber}"`,
      `"${formatDateTime(o.createdAt)}"`,
      `"${o.cashierName}"`,
      `"${o.customerName || 'Umum'}"`,
      o.items.reduce((acc, it) => acc + it.quantity, 0),
      o.subtotal,
      o.globalDiscountAmount,
      o.taxAmount,
      o.grandTotal,
      `"${o.payment.method}"`,
      `"${o.status}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Laporan_Penjualan_${config.storeName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Laporan Penjualan & Analisis</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis omset harian, keuntungan bersih, produk terlaris, dan riwayat mutasi kasir
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (Omset, Net Profit, Transactions, Margin) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Gross Sales */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Omset</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {formatRupiah(metrics.grossSales)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Dari {metrics.completedCount} transaksi sukses
          </p>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Keuntungan Bersih</span>
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-700">
            {formatRupiah(metrics.netProfit)}
          </div>
          <p className="text-[11px] text-teal-600 mt-1 font-semibold">
            Margin Bersih: {metrics.marginPct}% dari omset
          </p>
        </div>

        {/* Total Cost / HPP */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Modal (HPP)</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-800">
            {formatRupiah(metrics.totalCost)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Biaya pokok penjualan barang
          </p>
        </div>

        {/* Transactions count */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Transaksi</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {metrics.completedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Rata-rata: {metrics.completedCount > 0 ? formatRupiah(Math.round(metrics.grossSales / metrics.completedCount)) : 'Rp 0'}/order
          </p>
        </div>

      </div>

      {/* Analytics Mid-Row: Top Selling & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top 5 Selling Products */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Produk Terlaris (Top Selling)</span>
            </h3>
            <span className="text-xs text-slate-400">Berdasarkan kuantiti terjual</span>
          </div>

          <div className="space-y-3">
            {metrics.topSelling.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Belum ada data penjualan pada periode ini</p>
            ) : (
              metrics.topSelling.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-300 text-slate-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{item.name}</p>
                      <p className="text-[11px] text-slate-400">{item.qty} Porsi / Item Terjual</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700">
                    {formatRupiah(item.revenue)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Sebaran Metode Pembayaran
            </h3>
            <p className="text-xs text-slate-400 mb-4">Breakdown kanal pembayaran yang diterima</p>

            <div className="space-y-3">
              {/* Cash */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-700">Tunai (Cash)</span>
                </div>
                <span className="font-bold text-slate-900">{formatRupiah(metrics.paymentBreakdown.cash)}</span>
              </div>

              {/* QRIS */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-slate-700">QRIS Dinamis</span>
                </div>
                <span className="font-bold text-slate-900">{formatRupiah(metrics.paymentBreakdown.qris)}</span>
              </div>

              {/* Card */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-slate-700">Kartu EDC / Chip</span>
                </div>
                <span className="font-bold text-slate-900">{formatRupiah(metrics.paymentBreakdown.card)}</span>
              </div>

              {/* Transfer */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-teal-600" />
                  <span className="font-semibold text-slate-700">Transfer Bank</span>
                </div>
                <span className="font-bold text-slate-900">{formatRupiah(metrics.paymentBreakdown.bank_transfer)}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400">Semua transaksi tervalidasi real-time</span>
          </div>
        </div>

      </div>

      {/* Filter Toolbar for Transactions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        
        {/* Date Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'today', label: 'Hari Ini' },
            { id: '7days', label: '7 Hari Terakhir' },
            { id: 'month', label: 'Bulan Ini' },
            { id: 'all', label: 'Semua Waktu' },
          ].map((df) => (
            <button
              key={df.id}
              onClick={() => setDateFilter(df.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                dateFilter === df.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {df.label}
            </button>
          ))}
        </div>

        {/* Secondary filters: Cashier, Method, Search */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Cashier filter */}
          <select
            value={selectedCashier}
            onChange={(e) => setSelectedCashier(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
          >
            <option value="all">Semua Kasir</option>
            {cashierList.map(([id, name]) => (
              <option key={id} value={id}>
                Kasir: {name}
              </option>
            ))}
          </select>

          {/* Payment method filter */}
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
          >
            <option value="all">Semua Metode</option>
            <option value="cash">Tunai (Cash)</option>
            <option value="qris">QRIS</option>
            <option value="card">Kartu EDC</option>
            <option value="bank_transfer">Transfer Bank</option>
          </select>

          {/* Search Invoice */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari No. Faktur..."
              value={searchInvoice}
              onChange={(e) => setSearchInvoice(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-36 sm:w-44 focus:bg-white"
            />
          </div>
        </div>

      </div>

      {/* Transactions History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">No. Faktur</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Kasir</th>
                <th className="py-3 px-4">Pelanggan</th>
                <th className="py-3 px-4">Metode Bayar</th>
                <th className="py-3 px-4 text-right">Total Transaksi</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                  
                  {/* Invoice */}
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {order.invoiceNumber}
                  </td>

                  {/* Time */}
                  <td className="py-3 px-4 text-slate-500">
                    {formatDateTime(order.createdAt)}
                  </td>

                  {/* Cashier */}
                  <td className="py-3 px-4 text-slate-700 font-medium">
                    {order.cashierName}
                  </td>

                  {/* Customer */}
                  <td className="py-3 px-4 text-slate-600">
                    {order.customerName || 'Umum'}
                  </td>

                  {/* Payment */}
                  <td className="py-3 px-4">
                    <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {order.payment.method}
                    </span>
                  </td>

                  {/* Grand Total */}
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {formatRupiah(order.grandTotal)}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        order.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {order.status === 'completed' ? 'Selesai' : 'Dibatalkan'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedDetailOrder(order)}
                        title="Lihat Detail Pesanan"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onOpenReceipt(order)}
                        title="Cetak Ulang Struk Thermal"
                        className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Tidak ada riwayat transaksi</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan filter waktu atau pencarian.</p>
          </div>
        )}
      </div>

      {/* MODAL: ORDER DETAIL & RETUR */}
      {selectedDetailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 border border-slate-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Detail Transaksi</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedDetailOrder.invoiceNumber}</p>
              </div>
              <button
                onClick={() => setSelectedDetailOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs mb-5">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-400 block">Waktu:</span>
                  <span className="font-semibold text-slate-800">{formatDateTime(selectedDetailOrder.createdAt)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Kasir:</span>
                  <span className="font-semibold text-slate-800">{selectedDetailOrder.cashierName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Pelanggan:</span>
                  <span className="font-semibold text-slate-800">{selectedDetailOrder.customerName || 'Umum'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Metode Pembayaran:</span>
                  <span className="font-semibold uppercase text-slate-800">{selectedDetailOrder.payment.method}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                <div className="bg-slate-50 px-3 py-2 font-bold text-slate-600 flex justify-between">
                  <span>Daftar Menu / Produk</span>
                  <span>Subtotal</span>
                </div>
                {selectedDetailOrder.items.map((it) => (
                  <div key={it.id} className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-800">{it.productName}</p>
                      <p className="text-[11px] text-slate-400">
                        {it.quantity} × {formatRupiah(it.unitPrice)}
                        {it.discountAmount > 0 ? ` (Diskon: -${formatRupiah(it.discountAmount)})` : ''}
                      </p>
                    </div>
                    <span className="font-bold text-slate-900">{formatRupiah(it.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Financial summary */}
              <div className="space-y-1 p-3 bg-slate-50 rounded-xl">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(selectedDetailOrder.subtotal)}</span>
                </div>
                {selectedDetailOrder.globalDiscountAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Diskon Faktur:</span>
                    <span>-{formatRupiah(selectedDetailOrder.globalDiscountAmount)}</span>
                  </div>
                )}
                {selectedDetailOrder.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>PPN ({selectedDetailOrder.taxPercentage}%):</span>
                    <span>{formatRupiah(selectedDetailOrder.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Bayar:</span>
                  <span className="text-emerald-700">{formatRupiah(selectedDetailOrder.grandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onOpenReceipt(selectedDetailOrder);
                  setSelectedDetailOrder(null);
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Receipt className="w-4 h-4" />
                <span>Cetak Struk Thermal</span>
              </button>

              {currentUser.role === 'admin' && selectedDetailOrder.status === 'completed' && (
                <button
                  onClick={() => handleCancelOrder(selectedDetailOrder)}
                  className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Batalkan / Retur</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
