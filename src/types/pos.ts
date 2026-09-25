export type Role = 'admin' | 'manager' | 'cashier';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  pin: string; // 4 or 6 digit PIN for cashier quick access
  active: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

export interface ProductVariant {
  id: string;
  name: string; // e.g. "Ukuran L", "Less Sugar", "Original"
  priceAdjustment: number;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  categoryId: string;
  costPrice: number; // Harga Beli (HPP)
  sellingPrice: number; // Harga Jual
  stock: number;
  minStock: number;
  unit: string; // e.g. "pcs", "cup", "porsi"
  imageUrl: string;
  variants?: ProductVariant[];
  description?: string;
  isActive: boolean;
}

export interface CartItem {
  cartItemId: string;
  product: Product;
  quantity: number;
  selectedVariant?: ProductVariant;
  discountType?: 'percent' | 'nominal';
  discountValue?: number; // e.g. 10 (%) or 5000 (Rp)
  notes?: string;
}

export type PaymentMethod = 'cash' | 'qris' | 'bank_transfer' | 'card';

export interface PaymentDetails {
  method: PaymentMethod;
  amountTendered: number; // Nominal yang dibayar pembeli (untuk cash)
  change: number; // Kembalian
  referenceNumber?: string; // Approval code / Bank Ref / QRIS RRN
  bankName?: string; // BCA, Mandiri, etc.
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountAmount: number;
  subtotal: number;
  notes?: string;
}

export interface Order {
  id: string;
  invoiceNumber: string; // e.g. "INV-20260925-0012"
  createdAt: string;
  cashierId: string;
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  globalDiscountAmount: number;
  globalDiscountType?: 'percent' | 'nominal';
  globalDiscountValue?: number;
  taxPercentage: number;
  taxAmount: number;
  grandTotal: number;
  totalCost: number; // Total HPP
  netProfit: number; // GrandTotal (excl. tax) - TotalCost
  payment: PaymentDetails;
  status: 'completed' | 'cancelled' | 'refunded';
  notes?: string;
}

export interface StoreConfig {
  storeName: string;
  legalName: string;
  address: string;
  phone: string;
  email: string;
  taxPercentage: number;
  enableTax: boolean;
  receiptFooter: string;
  receiptWidth: '58mm' | '80mm';
  qrisNmid: string;
  currencyPrefix: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  userId: string;
  userName: string;
  createdAt: string;
}
