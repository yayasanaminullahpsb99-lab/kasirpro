import React, { useState } from 'react';
import { 
  Database, 
  Server, 
  FolderTree, 
  ShieldCheck, 
  Copy, 
  Check, 
  Code2, 
  Layers, 
  Workflow, 
  Terminal, 
  Cpu, 
  FileCode2,
  Printer
} from 'lucide-react';

export const ArchitectureDocs: React.FC = () => {
  const [activeDocTab, setActiveDocTab] = useState<'sql' | 'erd' | 'api' | 'folder' | 'backend' | 'thermal'>('sql');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // SQL DDL SCHEMA SCRIPT
  const sqlSchemaScript = `-- ====================================================================
-- SISTEM POS ENTERPRISE - POSTGRESQL / MYSQL PRODUCTION SCHEMA
-- Mendukung Multi-Role RBAC, Inventory Management, Atomic Orders & Payments
-- ====================================================================

-- 1. TABEL PENGGUNA & RBAC (users)
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL, -- PIN 4-6 digit untuk login kasir cepat
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'cashier')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- 2. TABEL KATEGORI PRODUK (categories)
CREATE TABLE categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    icon VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABEL MASTER PRODUK & INVENTARIS (products)
CREATE TABLE products (
    id VARCHAR(36) PRIMARY KEY,
    category_id VARCHAR(36) REFERENCES categories(id) ON DELETE SET NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0,    -- Harga Beli / HPP
    selling_price NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Harga Jual
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),  -- Constraint mencegah stok negatif
    min_stock INT NOT NULL DEFAULT 5,                -- Threshold Low Stock Alert
    unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
    image_url TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_stock ON products(stock);

-- 4. TABEL VARIAN PRODUK (product_variants)
CREATE TABLE product_variants (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- Misal: 'Large', 'Less Sugar'
    price_adjustment NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABEL TRANSAKSI / FAKTUR PENJUALAN (orders)
CREATE TABLE orders (
    id VARCHAR(36) PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL, -- Contoh: INV-20260925-0001
    cashier_id VARCHAR(36) NOT NULL REFERENCES users(id),
    customer_name VARCHAR(100) DEFAULT 'Pelanggan Umum',
    customer_phone VARCHAR(30),
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percent', 'nominal')),
    tax_percentage NUMERIC(5, 2) NOT NULL DEFAULT 11.00, -- PPN 11%
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,       -- Total HPP untuk hitung Net Profit
    net_profit NUMERIC(15, 2) NOT NULL DEFAULT 0,       -- (GrandTotal - Tax) - TotalCost
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'refunded')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_invoice ON orders(invoice_number);
CREATE INDEX idx_orders_cashier ON orders(cashier_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- 6. TABEL RINCIAN ITEM TRANSAKSI (order_items)
CREATE TABLE order_items (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(36) NOT NULL REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(15, 2) NOT NULL,
    cost_price NUMERIC(15, 2) NOT NULL,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(15, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- 7. TABEL PEMBAYARAN MULTI-CHANNEL (payments)
CREATE TABLE payments (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    method VARCHAR(20) NOT NULL CHECK (method IN ('cash', 'qris', 'bank_transfer', 'card')),
    amount_tendered NUMERIC(15, 2) NOT NULL, -- Uang diterima
    change_amount NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Kembalian
    bank_name VARCHAR(50),                   -- BCA, Mandiri, BRI
    reference_number VARCHAR(100),           -- EDC approval / QRIS RRN
    status VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'pending', 'failed')),
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_method ON payments(method);

-- 8. TABEL AUDIT LOG MUTASI STOK (stock_movements)
CREATE TABLE stock_movements (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL REFERENCES products(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'sale', 'refund')),
    quantity INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    reference_id VARCHAR(50), -- ID Order atau No PO
    reason TEXT NOT NULL,
    user_id VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);`;

  // BACKEND ATOMIC TRANSACTION CODE
  const backendAtomicCode = `// ====================================================================
// CONTROLLER: CHECKOUT ATOMIK DENGAN DATABASE TRANSACTION (ACID)
// Framework: Node.js + Express + PostgreSQL (Pool Client / Prisma / Drizzle)
// Memastikan integritas stok dan mencegah Overselling / Race Condition!
// ====================================================================

import { Request, Response } from 'express';
import { dbPool } from '../config/database'; // pg.Pool instance

export async function processCheckout(req: Request, res: Response) {
  const { 
    items, 
    payment, 
    customerName, 
    customerPhone, 
    discountType, 
    discountValue,
    notes 
  } = req.body;
  const cashierId = req.user.id; // Diambil dari JWT Auth Middleware

  // Buka koneksi dedicated dari pool untuk Transaction
  const client = await dbPool.connect();

  try {
    // 1. MULAI ATOMIC TRANSACTION
    await client.query('BEGIN');

    let subtotal = 0;
    let totalCost = 0;
    const validatedItems = [];

    // 2. KUNCI ROW DENGAN SELECT ... FOR UPDATE (Mencegah Race Condition stok)
    for (const item of items) {
      const productRes = await client.query(
        'SELECT id, name, sku, cost_price, selling_price, stock, is_active FROM products WHERE id = $1 FOR UPDATE',
        [item.productId]
      );

      if (productRes.rowCount === 0) {
        throw new Error(\`Produk ID \${item.productId} tidak ditemukan\`);
      }

      const product = productRes.rows[0];

      if (!product.is_active) {
        throw new Error(\`Produk "\${product.name}" sedang nonaktif\`);
      }

      // Verifikasi stok fisik
      if (product.stock < item.quantity) {
        throw new Error(
          \`Stok produk "\${product.name}" tidak mencukupi! Sisa: \${product.stock}, Diminta: \${item.quantity}\`
        );
      }

      // Kalkulasi subtotal item & diskon
      const unitPrice = Number(product.selling_price);
      const costPrice = Number(product.cost_price);
      let itemDisc = 0;

      if (item.discountType === 'percent' && item.discountValue) {
        itemDisc = Math.round((unitPrice * item.discountValue) / 100);
      } else if (item.discountType === 'nominal' && item.discountValue) {
        itemDisc = item.discountValue;
      }

      const finalPrice = Math.max(0, unitPrice - itemDisc);
      const itemSubtotal = finalPrice * item.quantity;

      subtotal += itemSubtotal;
      totalCost += costPrice * item.quantity;

      validatedItems.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice,
        costPrice,
        discountAmount: itemDisc * item.quantity,
        subtotal: itemSubtotal,
        notes: item.notes || null,
        previousStock: product.stock,
      });

      // 3. POTONG STOK SECARA ATOMIK
      await client.query(
        'UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2',
        [item.quantity, product.id]
      );
    }

    // 4. HITUNG DISKON FAKTUR, PPN 11%, DAN GRAND TOTAL
    let globalDiscount = 0;
    if (discountType === 'percent' && discountValue) {
      globalDiscount = Math.round((subtotal * discountValue) / 100);
    } else if (discountType === 'nominal' && discountValue) {
      globalDiscount = discountValue;
    }
    const discountedSubtotal = Math.max(0, subtotal - globalDiscount);
    const taxPercentage = 11.00;
    const taxAmount = Math.round((discountedSubtotal * taxPercentage) / 100);
    const grandTotal = discountedSubtotal + taxAmount;
    const netProfit = Math.max(0, discountedSubtotal - totalCost);

    // Verifikasi pembayaran tunai
    let changeAmount = 0;
    if (payment.method === 'cash') {
      if (payment.amountTendered < grandTotal) {
        throw new Error('Nominal uang tunai kurang dari total tagihan');
      }
      changeAmount = payment.amountTendered - grandTotal;
    }

    // 5. GENERATE NOMOR FAKTUR SEQUENTIAL (INV-YYYYMMDD-XXXX)
    const invoiceRes = await client.query(
      \`SELECT 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(COUNT(*) + 1, 4, '0') AS inv_num
       FROM orders WHERE created_at::DATE = CURRENT_DATE\`
    );
    const invoiceNumber = invoiceRes.rows[0].inv_num;

    // 6. SIMPAN ORDER KE TABEL 'orders'
    const orderRes = await client.query(
      \`INSERT INTO orders (
        id, invoice_number, cashier_id, customer_name, customer_phone,
        subtotal, discount_amount, discount_type, tax_percentage, tax_amount,
        grand_total, total_cost, net_profit, status, notes
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'completed', $13
      ) RETURNING id\`,
      [
        invoiceNumber, cashierId, customerName || 'Pelanggan Umum', customerPhone,
        subtotal, globalDiscount, discountType, taxPercentage, taxAmount,
        grandTotal, totalCost, netProfit, notes
      ]
    );
    const orderId = orderRes.rows[0].id;

    // 7. SIMPAN RINCIAN ITEM KE TABEL 'order_items' & AUDIT LOG MUTASI
    for (const item of validatedItems) {
      await client.query(
        \`INSERT INTO order_items (
          id, order_id, product_id, product_name, sku,
          quantity, unit_price, cost_price, discount_amount, subtotal, notes
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )\`,
        [
          orderId, item.productId, item.productName, item.sku,
          item.quantity, item.unitPrice, item.costPrice, item.discountAmount, item.subtotal, item.notes
        ]
      );

      // Audit log mutasi
      await client.query(
        \`INSERT INTO stock_movements (
          id, product_id, type, quantity, previous_stock, new_stock, reference_id, reason, user_id
        ) VALUES (
          gen_random_uuid(), $1, 'sale', $2, $3, $3 - $2, $4, 'Penjualan Kasir POS', $5
        )\`,
        [item.productId, item.quantity, item.previousStock, invoiceNumber, cashierId]
      );
    }

    // 8. SIMPAN DATA PEMBAYARAN KE TABEL 'payments'
    await client.query(
      \`INSERT INTO payments (
        id, order_id, method, amount_tendered, change_amount, bank_name, reference_number, status
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'success'
      )\`,
      [
        orderId, payment.method, 
        payment.method === 'cash' ? payment.amountTendered : grandTotal,
        changeAmount, payment.bankName || null, payment.referenceNumber || null
      ]
    );

    // 9. COMMIT TRANSACTION SECARA PERMANEN
    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Transaksi kasir berhasil diselesaikan',
      data: {
        orderId,
        invoiceNumber,
        grandTotal,
        changeAmount,
        paymentMethod: payment.method
      }
    });

  } catch (error: any) {
    // 10. JIKA ADA GAGAL / STOK KURANG -> ROLLBACK TOTAL!
    await client.query('ROLLBACK');
    console.error('[POS Transaction Error]:', error.message);
    return res.status(400).json({
      success: false,
      message: error.message || 'Gagal memproses transaksi kasir'
    });
  } finally {
    client.release(); // Kembalikan koneksi ke pool
  }
}`;

  // ESC/POS THERMAL PRINTER DRIVER CODE
  const thermalPrinterCode = `// ====================================================================
// MODUL THERMAL PRINTER (ESC/POS) - SUPPORT 58MM & 80MM
// Mendukung USB, Bluetooth, Network IP Thermal Printer (Epson, Xprinter, Vmax)
// ====================================================================

export class EscPosThermalPrinter {
  // ESC/POS Command Constants
  private static ESC = '\\x1B';
  private static GS = '\\x1D';
  private static INIT = EscPosThermalPrinter.ESC + '@';
  private static ALIGN_LEFT = EscPosThermalPrinter.ESC + 'a0';
  private static ALIGN_CENTER = EscPosThermalPrinter.ESC + 'a1';
  private static ALIGN_RIGHT = EscPosThermalPrinter.ESC + 'a2';
  private static BOLD_ON = EscPosThermalPrinter.ESC + 'E1';
  private static BOLD_OFF = EscPosThermalPrinter.ESC + 'E0';
  private static DOUBLE_HEIGHT = EscPosThermalPrinter.ESC + '!\\x10';
  private static STANDARD_FONT = EscPosThermalPrinter.ESC + '!\\x00';
  private static PAPER_CUT = EscPosThermalPrinter.GS + 'V\\x41\\x00';

  /**
   * Format teks struk untuk Thermal Printer 58mm (32 chars) atau 80mm (48 chars)
   */
  public static generateReceiptBuffer(order: any, config: any, width: '58mm' | '80mm' = '58mm'): string {
    const maxChars = width === '58mm' ? 32 : 48;
    const divider = '-'.repeat(maxChars);
    const doubleDivider = '='.repeat(maxChars);

    let stream = '';

    // Inisialisasi printer
    stream += this.INIT;

    // Header Toko
    stream += this.ALIGN_CENTER;
    stream += this.BOLD_ON + this.DOUBLE_HEIGHT;
    stream += config.storeName + '\\n';
    stream += this.STANDARD_FONT + this.BOLD_OFF;
    stream += config.address + '\\n';
    stream += 'Telp: ' + config.phone + '\\n';
    stream += divider + '\\n';

    // Meta Transaksi (Rata Kiri)
    stream += this.ALIGN_LEFT;
    stream += this.formatTwoColumns('No Faktur:', order.invoiceNumber, maxChars) + '\\n';
    stream += this.formatTwoColumns('Tanggal  :', new Date(order.createdAt).toLocaleString('id-ID'), maxChars) + '\\n';
    stream += this.formatTwoColumns('Kasir    :', order.cashierName, maxChars) + '\\n';
    stream += this.formatTwoColumns('Pelanggan:', order.customerName || 'Umum', maxChars) + '\\n';
    stream += divider + '\\n';

    // Rincian Item Barang
    order.items.forEach((item: any) => {
      stream += item.productName + '\\n';
      const qtyStr = \`  \${item.quantity}x @\${item.unitPrice.toLocaleString('id-ID')}\`;
      const subtotalStr = \`Rp \${item.subtotal.toLocaleString('id-ID')}\`;
      stream += this.formatTwoColumns(qtyStr, subtotalStr, maxChars) + '\\n';
    });

    stream += divider + '\\n';

    // Subtotal & Grand Total
    stream += this.formatTwoColumns('Subtotal', 'Rp ' + order.subtotal.toLocaleString('id-ID'), maxChars) + '\\n';
    if (order.globalDiscountAmount > 0) {
      stream += this.formatTwoColumns('Diskon Faktur', '-Rp ' + order.globalDiscountAmount.toLocaleString('id-ID'), maxChars) + '\\n';
    }
    if (order.taxAmount > 0) {
      stream += this.formatTwoColumns(\`PPN (\${order.taxPercentage}%)\`, 'Rp ' + order.taxAmount.toLocaleString('id-ID'), maxChars) + '\\n';
    }
    stream += doubleDivider + '\\n';

    // Total Bold
    stream += this.BOLD_ON;
    stream += this.formatTwoColumns('TOTAL TAGIHAN', 'Rp ' + order.grandTotal.toLocaleString('id-ID'), maxChars) + '\\n';
    stream += this.BOLD_OFF;

    // Info Pembayaran
    stream += this.formatTwoColumns('Metode Bayar', order.payment.method.toUpperCase(), maxChars) + '\\n';
    if (order.payment.method === 'cash') {
      stream += this.formatTwoColumns('Tunai Diterima', 'Rp ' + order.payment.amountTendered.toLocaleString('id-ID'), maxChars) + '\\n';
      stream += this.formatTwoColumns('Kembalian', 'Rp ' + order.payment.change.toLocaleString('id-ID'), maxChars) + '\\n';
    }

    // Footer Catatan & Paper Cut
    stream += divider + '\\n';
    stream += this.ALIGN_CENTER;
    stream += config.receiptFooter + '\\n\\n';
    stream += '\\n\\n\\n';
    stream += this.PAPER_CUT; // Potong kertas otomatis

    return stream;
  }

  private static formatTwoColumns(left: string, right: string, maxChars: number): string {
    const spaceCount = Math.max(1, maxChars - (left.length + right.length));
    return left + ' '.repeat(spaceCount) + right;
  }
}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded border border-emerald-500/30">
              Enterprise Grade POS
            </span>
            <span className="text-slate-400 text-xs">• Production Ready</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Arsitektur Teknis, Skema Database & API Spec
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Dokumentasi komprehensif arsitektur sistem Point of Sale, Entity Relationship Diagram (ERD),
            SQL DDL migration script, RESTful API endpoints, dan mekanisme transaksi atomik backend (ACID).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700 text-xs font-mono text-emerald-400">
            Node.js + PostgreSQL + React
          </div>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'sql', label: '1. Skema Database (SQL DDL)', icon: Database },
          { id: 'erd', label: '2. Diagram Relasi ERD', icon: Workflow },
          { id: 'api', label: '3. Arsitektur RESTful API', icon: Server },
          { id: 'folder', label: '4. Struktur Folder Project', icon: FolderTree },
          { id: 'backend', label: '5. Transaksi Atomik (Backend)', icon: Cpu },
          { id: 'thermal', label: '6. Driver Thermal ESC/POS', icon: Printer },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeDocTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveDocTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUBTAB 1: SQL SCHEMA */}
      {activeDocTab === 'sql' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                <span>Skema Database SQL Migration (PostgreSQL / MySQL)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Tabel: users (RBAC), categories, products, product_variants, orders, order_items, payments, stock_movements
              </p>
            </div>

            <button
              onClick={() => handleCopy('sql', sqlSchemaScript)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              {copiedKey === 'sql' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'sql' ? 'Tersalin!' : 'Salin SQL Script'}</span>
            </button>
          </div>

          <div className="relative">
            <pre className="p-4 bg-slate-950 text-slate-200 rounded-xl font-mono text-xs overflow-x-auto max-h-[600px] leading-relaxed">
              <code>{sqlSchemaScript}</code>
            </pre>
          </div>
        </div>
      )}

      {/* SUBTAB 2: ERD DIAGRAM */}
      {activeDocTab === 'erd' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Workflow className="w-5 h-5 text-emerald-600" />
              <span>Entity Relationship Diagram (ERD) - Arsitektur Data Relasional</span>
            </h2>
            <p className="text-xs text-slate-500">
              Relasi Foreign Key antar tabel dalam transaksi ritel POS
            </p>
          </div>

          {/* Visual ERD Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Box 1: USERS */}
            <div className="bg-slate-50 border-2 border-purple-200 rounded-xl p-4">
              <div className="flex items-center justify-between pb-2 border-b border-purple-200 mb-2">
                <span className="font-bold text-purple-900 text-xs">users (Pengguna & Kasir)</span>
                <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded">RBAC</span>
              </div>
              <ul className="text-xs font-mono space-y-1 text-slate-700">
                <li className="font-bold text-purple-700">PK id (VARCHAR)</li>
                <li>name (VARCHAR)</li>
                <li>email (VARCHAR, UNIQUE)</li>
                <li>password_hash (VARCHAR)</li>
                <li>pin_hash (VARCHAR)</li>
                <li className="text-amber-700">role ('admin','manager','cashier')</li>
                <li>is_active (BOOLEAN)</li>
              </ul>
            </div>

            {/* Box 2: ORDERS */}
            <div className="bg-slate-50 border-2 border-emerald-300 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200 mb-2">
                <span className="font-bold text-emerald-900 text-xs">orders (Faktur Transaksi)</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">Core</span>
              </div>
              <ul className="text-xs font-mono space-y-1 text-slate-700">
                <li className="font-bold text-emerald-700">PK id (VARCHAR)</li>
                <li className="font-semibold text-slate-900">invoice_number (UNIQUE)</li>
                <li className="text-purple-700">FK cashier_id → users.id</li>
                <li>subtotal (NUMERIC)</li>
                <li>discount_amount (NUMERIC)</li>
                <li>tax_amount (NUMERIC, PPN 11%)</li>
                <li className="font-bold text-emerald-800">grand_total (NUMERIC)</li>
                <li>net_profit (NUMERIC)</li>
                <li>status ('completed','cancelled')</li>
              </ul>
            </div>

            {/* Box 3: PAYMENTS */}
            <div className="bg-slate-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200 mb-2">
                <span className="font-bold text-blue-900 text-xs">payments (Multi-Channel)</span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded">1 to 1</span>
              </div>
              <ul className="text-xs font-mono space-y-1 text-slate-700">
                <li className="font-bold text-blue-700">PK id (VARCHAR)</li>
                <li className="text-emerald-700">FK order_id → orders.id</li>
                <li className="font-semibold">method ('cash','qris','card','va')</li>
                <li>amount_tendered (NUMERIC)</li>
                <li>change_amount (NUMERIC)</li>
                <li>reference_number (VARCHAR)</li>
                <li>status ('success','pending')</li>
              </ul>
            </div>

            {/* Box 4: ORDER_ITEMS */}
            <div className="bg-slate-50 border-2 border-teal-200 rounded-xl p-4">
              <div className="flex items-center justify-between pb-2 border-b border-teal-200 mb-2">
                <span className="font-bold text-teal-900 text-xs">order_items (Detail Line Items)</span>
                <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-1.5 py-0.5 rounded">1 to Many</span>
              </div>
              <ul className="text-xs font-mono space-y-1 text-slate-700">
                <li className="font-bold text-teal-700">PK id (VARCHAR)</li>
                <li className="text-emerald-700">FK order_id → orders.id</li>
                <li className="text-amber-700">FK product_id → products.id</li>
                <li>product_name (VARCHAR)</li>
                <li>quantity (INT)</li>
                <li>unit_price (NUMERIC)</li>
                <li>cost_price (NUMERIC)</li>
                <li>subtotal (NUMERIC)</li>
              </ul>
            </div>

            {/* Box 5: PRODUCTS */}
            <div className="bg-slate-50 border-2 border-amber-300 rounded-xl p-4">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200 mb-2">
                <span className="font-bold text-amber-900 text-xs">products (Katalog & Stok)</span>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">Master</span>
              </div>
              <ul className="text-xs font-mono space-y-1 text-slate-700">
                <li className="font-bold text-amber-700">PK id (VARCHAR)</li>
                <li>sku (VARCHAR, UNIQUE)</li>
                <li>barcode (VARCHAR, UNIQUE)</li>
                <li>name (VARCHAR)</li>
                <li>cost_price (HPP NUMERIC)</li>
                <li>selling_price (NUMERIC)</li>
                <li className="font-bold text-red-600">stock (INT, CHECK &gt;= 0)</li>
                <li>min_stock (INT)</li>
              </ul>
            </div>

            {/* Box 6: STOCK_MOVEMENTS */}
            <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
                <span className="font-bold text-slate-800 text-xs">stock_movements (Audit Log)</span>
                <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded">Audit</span>
              </div>
              <ul className="text-xs font-mono space-y-1 text-slate-700">
                <li className="font-bold">PK id (VARCHAR)</li>
                <li className="text-amber-700">FK product_id → products.id</li>
                <li>type ('sale','in','out','opname')</li>
                <li>quantity (INT)</li>
                <li>previous_stock (INT)</li>
                <li>new_stock (INT)</li>
                <li>reason (TEXT)</li>
                <li className="text-purple-700">FK user_id → users.id</li>
              </ul>
            </div>

          </div>

          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <p className="font-bold">Keunggulan Relasi Skema POS Ini:</p>
            <p>1. <strong>Integritas Historis:</strong> Nama produk dan harga dicatat snapshot di <code className="font-mono bg-white px-1 rounded">order_items</code>, sehingga jika harga produk master naik di kemudian hari, nilai transaksi masa lalu tetap akurat.</p>
            <p>2. <strong>Audit Mutasi Stok:</strong> Setiap pengurangan oleh kasir atau restock supplier otomatis tercatat di <code className="font-mono bg-white px-1 rounded">stock_movements</code> dengan user PIC yang bertanggung jawab.</p>
            <p>3. <strong>Anti Minus Constraint:</strong> Kolom <code className="font-mono bg-white px-1 rounded">stock INT CHECK (stock &gt;= 0)</code> di level database menjamin database menolak query jika terjadi selisih stok negatif.</p>
          </div>
        </div>
      )}

      {/* SUBTAB 3: RESTFUL API SPECS */}
      {activeDocTab === 'api' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-600" />
              <span>Arsitektur Endpoint API RESTful (Enterprise Backend)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Standar REST API dengan JWT Bearer Token, Response format terstandarisasi, dan status code HTTP
            </p>
          </div>

          <div className="space-y-4">
            {/* Endpoint 1: Auth */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-blue-600 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded">POST</span>
                <span className="font-mono font-bold text-xs text-slate-900">/api/v1/auth/login</span>
                <span className="text-[10px] text-slate-400 font-semibold ml-auto">Public</span>
              </div>
              <p className="text-xs text-slate-600 mb-2">Login kasir via Email/Password atau Quick PIN 4-digit.</p>
              <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto">
{`// Request Payload:
{
  "email": "kasir@kopinusantara.id",
  "pin": "1111" // atau "password": "..."
}

// Response (200 OK):
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": { "id": "usr_cashier_1", "name": "Siti Rahma", "role": "cashier" }
}`}
              </pre>
            </div>

            {/* Endpoint 2: Checkout Atomic */}
            <div className="border border-emerald-300 rounded-xl p-3.5 bg-emerald-50/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-emerald-600 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded">POST</span>
                <span className="font-mono font-bold text-xs text-slate-900">/api/v1/orders/checkout</span>
                <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded ml-auto">Kasir / Admin</span>
              </div>
              <p className="text-xs text-slate-600 mb-2">Proses checkout belanja, validasi & potong stok atomik, dan kalkulasi PPN/Diskon.</p>
              <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto">
{`// Request Payload:
{
  "customerName": "Bpk. Bambang",
  "customerPhone": "08123456789",
  "items": [
    { "productId": "prod_1", "quantity": 2, "discountType": "percent", "discountValue": 0 },
    { "productId": "prod_5", "quantity": 1, "discountType": "nominal", "discountValue": 2000 }
  ],
  "discountType": "nominal",
  "discountValue": 5000,
  "payment": {
    "method": "cash", // "cash" | "qris" | "bank_transfer" | "card"
    "amountTendered": 100000
  }
}

// Response (201 Created):
{
  "success": true,
  "invoiceNumber": "INV-20260925-0015",
  "grandTotal": 76590,
  "change": 23410,
  "receiptUrl": "/api/v1/orders/INV-20260925-0015/receipt"
}`}
              </pre>
            </div>

            {/* Endpoint 3: Products */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-teal-600 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded">GET</span>
                <span className="font-mono font-bold text-xs text-slate-900">/api/v1/products?category=cat_coffee&lowStock=true</span>
                <span className="text-[10px] text-slate-400 font-semibold ml-auto">Kasir / Manager / Admin</span>
              </div>
              <p className="text-xs text-slate-600 mb-2">Mendapatkan katalog produk dengan filter kategori, pencarian teks, dan filter peringatan stok.</p>
            </div>

            {/* Endpoint 4: Stock Adjustment */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-amber-600 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded">PATCH</span>
                <span className="font-mono font-bold text-xs text-slate-900">/api/v1/inventory/adjust-stock</span>
                <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded ml-auto">Manager / Admin Only</span>
              </div>
              <p className="text-xs text-slate-600 mb-2">Penyesuaian stok masuk (Restock), keluar (Barang rusak), atau Stock Opname berkala.</p>
            </div>

            {/* Endpoint 5: Reports */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-teal-600 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded">GET</span>
                <span className="font-mono font-bold text-xs text-slate-900">/api/v1/reports/summary?range=today</span>
                <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded ml-auto">Manager / Admin Only</span>
              </div>
              <p className="text-xs text-slate-600 mb-2">Ringkasan KPI omset, margin laba bersih, HPP, produk terlaris, dan breakdown pembayaran.</p>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: FOLDER STRUCTURE */}
      {activeDocTab === 'folder' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-emerald-600" />
              <span>Struktur Folder Project Modular (Clean Architecture)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Struktur direktori monorepo yang memisahkan Frontend Client, Backend Server, Database, dan Driver Printer
            </p>
          </div>

          <pre className="p-4 bg-slate-950 text-slate-200 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed">
{`kasir-pro-enterprise/
├── src/                          # FRONTEND APPLICATION (React + Vite + Tailwind)
│   ├── components/
│   │   ├── pos/                  # MODUL KASIR (Point of Sale)
│   │   │   ├── PosTerminal.tsx   # Antarmuka katalog, cart, scan barcode & kalkulasi
│   │   │   ├── CheckoutModal.tsx # Multi-channel payment (Cash, QRIS, VA, Card)
│   │   │   └── ThermalReceiptModal.tsx # Struk thermal preview (58mm/80mm), print & WA
│   │   ├── inventory/            # MODUL INVENTARIS & KATALOG
│   │   │   ├── InventoryManagement.tsx # CRUD produk, SKU generator & low stock alert
│   │   │   └── StockAdjustmentModal.tsx # Restock & opname form dengan audit log
│   │   ├── reports/              # MODUL LAPORAN & ANALISIS
│   │   │   ├── ReportsDashboard.tsx    # KPI Omset, laba bersih, top selling & export CSV
│   │   │   └── TransactionDetailDrawer.tsx # Cetak ulang struk & retur barang
│   │   ├── users/                # MODUL RBAC (Admin, Manager, Kasir)
│   │   │   └── UserManagement.tsx # Pengelolaan karyawan & matriks perizinan
│   │   ├── settings/             # MODUL PENGATURAN TOKO & STRUK
│   │   │   └── SettingsModal.tsx # Setup nama toko, alamat, PPN, NMID QRIS
│   │   └── Navbar.tsx            # Header navigasi & quick role switcher
│   ├── types/
│   │   └── pos.ts                # TypeScript domain models & interfaces
│   ├── services/
│   │   ├── storage.ts            # Local persistence & atomic checkout engine
│   │   ├── thermalPrinter.ts     # Format ESC/POS helper untuk printer 58mm/80mm
│   │   └── api.ts                # Axios HTTP client untuk koneksi backend
│   ├── data/
│   │   └── mockData.ts           # Realistic seed data ritel/F&B Indonesia
│   ├── App.tsx                   # Master router & state provider
│   ├── index.css                 # Tailwind config + @media print thermal stylesheet
│   └── main.tsx                  # React DOM entry point
│
├── server/                       # BACKEND REST API (Node.js + Express + TypeScript)
│   ├── controllers/
│   │   ├── authController.ts     # Login kasir (PIN/Password) & JWT signer
│   │   ├── orderController.ts    # Transaksi atomic checkout & lock FOR UPDATE
│   │   ├── productController.ts  # CRUD master barang & SKU lookup
│   │   └── reportController.ts   # Agregasi omset, laba kotor & margin
│   ├── middleware/
│   │   ├── authGuard.ts          # Verifikasi JWT Bearer Token
│   │   └── roleGuard.ts          # Enforce RBAC ('admin' | 'manager' | 'cashier')
│   ├── db/
│   │   ├── migrations/           # SQL migration scripts (001_initial_schema.sql)
│   │   └── pool.ts               # PostgreSQL connection pool configuration
│   └── server.ts                 # Express HTTP bootstrap & socket server
│
├── package.json
├── tsconfig.json
└── vite.config.ts`}
          </pre>
        </div>
      )}

      {/* SUBTAB 5: BACKEND ATOMIC CODE */}
      {activeDocTab === 'backend' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-600" />
                <span>Backend Atomic Transaction (ACID Lock & Rollback)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Logika transaksi database untuk mencegah overselling ketika 2 kasir checkout produk yang sama bersamaan
              </p>
            </div>

            <button
              onClick={() => handleCopy('backend', backendAtomicCode)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              {copiedKey === 'backend' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'backend' ? 'Tersalin!' : 'Salin Kode Backend'}</span>
            </button>
          </div>

          <pre className="p-4 bg-slate-950 text-emerald-300 rounded-xl font-mono text-xs overflow-x-auto max-h-[600px] leading-relaxed">
            <code>{backendAtomicCode}</code>
          </pre>
        </div>
      )}

      {/* SUBTAB 6: THERMAL ESC/POS CODE */}
      {activeDocTab === 'thermal' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                <span>Driver ESC/POS Thermal Printer (58mm / 80mm)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Modul byte buffer perintah ESC/POS untuk auto-cutter, dua kolom rapi, font bold, dan barcode
              </p>
            </div>

            <button
              onClick={() => handleCopy('thermal', thermalPrinterCode)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              {copiedKey === 'thermal' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'thermal' ? 'Tersalin!' : 'Salin Driver'}</span>
            </button>
          </div>

          <pre className="p-4 bg-slate-950 text-amber-200 rounded-xl font-mono text-xs overflow-x-auto max-h-[600px] leading-relaxed">
            <code>{thermalPrinterCode}</code>
          </pre>
        </div>
      )}

    </div>
  );
};
