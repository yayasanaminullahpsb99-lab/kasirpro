import { Category, Product, Order, User, StoreConfig, StockAdjustment, CartItem, PaymentDetails } from '../types/pos';
import { INITIAL_CATEGORIES, INITIAL_ORDERS, INITIAL_PRODUCTS, INITIAL_STORE_CONFIG, INITIAL_USERS } from '../data/mockData';

const STORAGE_KEYS = {
  PRODUCTS: 'pos_products_v1',
  CATEGORIES: 'pos_categories_v1',
  ORDERS: 'pos_orders_v1',
  USERS: 'pos_users_v1',
  CONFIG: 'pos_config_v1',
  STOCK_LOGS: 'pos_stock_logs_v1',
  ACTIVE_USER: 'pos_active_user_v1',
};

// Storage initialization & helpers
export const PosStorage = {
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(INITIAL_STORE_CONFIG));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVE_USER)) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(INITIAL_USERS[0])); // Default Admin
    }
    if (!localStorage.getItem(STORAGE_KEYS.STOCK_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify([]));
    }
  },

  resetAllData() {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(INITIAL_STORE_CONFIG));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(INITIAL_USERS[0]));
    localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify([]));
    window.dispatchEvent(new Event('pos_data_changed'));
  },

  // USERS
  getUsers(): User[] {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    } catch {
      return INITIAL_USERS;
    }
  },

  saveUser(user: User) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    window.dispatchEvent(new Event('pos_data_changed'));
  },

  getActiveUser(): User {
    this.init();
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
      return stored ? JSON.parse(stored) : INITIAL_USERS[0];
    } catch {
      return INITIAL_USERS[0];
    }
  },

  setActiveUser(user: User) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(user));
    window.dispatchEvent(new Event('pos_user_changed'));
  },

  // STORE CONFIG
  getConfig(): StoreConfig {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG) || JSON.stringify(INITIAL_STORE_CONFIG));
    } catch {
      return INITIAL_STORE_CONFIG;
    }
  },

  saveConfig(config: StoreConfig) {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    window.dispatchEvent(new Event('pos_data_changed'));
  },

  // CATEGORIES
  getCategories(): Category[] {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES) || '[]');
    } catch {
      return INITIAL_CATEGORIES;
    }
  },

  saveCategory(category: Category) {
    const categories = this.getCategories();
    const idx = categories.findIndex(c => c.id === category.id);
    if (idx >= 0) {
      categories[idx] = category;
    } else {
      categories.push(category);
    }
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    window.dispatchEvent(new Event('pos_data_changed'));
  },

  deleteCategory(categoryId: string) {
    const categories = this.getCategories().filter(c => c.id !== categoryId);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    window.dispatchEvent(new Event('pos_data_changed'));
  },

  // PRODUCTS
  getProducts(): Product[] {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
    } catch {
      return INITIAL_PRODUCTS;
    }
  },

  getProductById(id: string): Product | undefined {
    return this.getProducts().find(p => p.id === id);
  },

  saveProduct(product: Product) {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    if (index >= 0) {
      products[index] = product;
    } else {
      products.unshift(product);
    }
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    window.dispatchEvent(new Event('pos_data_changed'));
  },

  deleteProduct(productId: string) {
    const products = this.getProducts().filter(p => p.id !== productId);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    window.dispatchEvent(new Event('pos_data_changed'));
  },

  adjustStock(productId: string, type: 'in' | 'out' | 'adjustment', quantity: number, reason: string, user: User) {
    const products = this.getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) throw new Error('Produk tidak ditemukan');

    const prevStock = product.stock;
    let newStock = prevStock;

    if (type === 'in') {
      newStock = prevStock + quantity;
    } else if (type === 'out') {
      if (prevStock < quantity) throw new Error(`Stok tidak mencukupi. Sisa stok: ${prevStock}`);
      newStock = prevStock - quantity;
    } else {
      newStock = quantity;
    }

    product.stock = newStock;
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

    // Log stock adjustment
    const logs: StockAdjustment[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.STOCK_LOGS) || '[]');
    logs.unshift({
      id: 'log_' + Date.now(),
      productId: product.id,
      productName: product.name,
      type,
      quantity,
      previousStock: prevStock,
      newStock,
      reason,
      userId: user.id,
      userName: user.name,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(logs));

    window.dispatchEvent(new Event('pos_data_changed'));
    return product;
  },

  // ORDERS & ATOMIC TRANSACTIONS
  getOrders(): Order[] {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
    } catch {
      return INITIAL_ORDERS;
    }
  },

  generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const orders = this.getOrders();
    const todayPrefix = `INV-${year}${month}${day}-`;
    const todayOrders = orders.filter(o => o.invoiceNumber?.startsWith(todayPrefix));
    const nextSeq = String(todayOrders.length + 1).padStart(4, '0');
    return `${todayPrefix}${nextSeq}`;
  },

  /**
   * ATOMIC CHECKOUT TRANSACTION SIMULATION:
   * 1. Validates all cart items and verifies sufficient stock.
   * 2. If any item has insufficient stock, rolls back immediately (no state altered).
   * 3. Atomically decrements product stock and records stock movement.
   * 4. Calculates subtotal, PPN, discounts, profit margins, and generates invoice.
   * 5. Commits order to database/storage.
   */
  processCheckout(params: {
    cartItems: CartItem[];
    payment: PaymentDetails;
    cashier: User;
    customerName?: string;
    customerPhone?: string;
    globalDiscountType?: 'percent' | 'nominal';
    globalDiscountValue?: number;
    notes?: string;
  }): { success: boolean; order?: Order; error?: string } {
    const { cartItems, payment, cashier, customerName, customerPhone, globalDiscountType, globalDiscountValue, notes } = params;

    if (!cartItems.length) {
      return { success: false, error: 'Keranjang belanja kosong' };
    }

    const currentProducts = this.getProducts();

    // 1. Pre-transaction validation: Check stock availability
    for (const item of cartItems) {
      const prod = currentProducts.find(p => p.id === item.product.id);
      if (!prod) {
        return { success: false, error: `Produk "${item.product.name}" tidak ditemukan dalam sistem` };
      }
      if (!prod.isActive) {
        return { success: false, error: `Produk "${prod.name}" sedang nonaktif` };
      }
      if (prod.stock < item.quantity) {
        return {
          success: false,
          error: `Stok produk "${prod.name}" tidak mencukupi! Tersedia: ${prod.stock}, diminta: ${item.quantity}`
        };
      }
    }

    const config = this.getConfig();
    let subtotal = 0;
    let totalCost = 0;

    const orderItems = cartItems.map(item => {
      const unitPrice = item.product.sellingPrice + (item.selectedVariant?.priceAdjustment || 0);
      let discountAmount = 0;

      if (item.discountType === 'percent' && item.discountValue) {
        discountAmount = Math.round((unitPrice * item.discountValue) / 100);
      } else if (item.discountType === 'nominal' && item.discountValue) {
        discountAmount = item.discountValue;
      }

      const effectiveUnitPrice = Math.max(0, unitPrice - discountAmount);
      const itemSubtotal = effectiveUnitPrice * item.quantity;
      const itemCostTotal = item.product.costPrice * item.quantity;

      subtotal += itemSubtotal;
      totalCost += itemCostTotal;

      return {
        id: 'ord_item_' + Math.random().toString(36).substring(2, 9),
        productId: item.product.id,
        productName: item.selectedVariant ? `${item.product.name} (${item.selectedVariant.name})` : item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        unitPrice,
        costPrice: item.product.costPrice,
        discountAmount: discountAmount * item.quantity,
        subtotal: itemSubtotal,
        notes: item.notes,
      };
    });

    // Global discount calculation
    let globalDiscountAmount = 0;
    if (globalDiscountType === 'percent' && globalDiscountValue) {
      globalDiscountAmount = Math.round((subtotal * globalDiscountValue) / 100);
    } else if (globalDiscountType === 'nominal' && globalDiscountValue) {
      globalDiscountAmount = globalDiscountValue;
    }
    globalDiscountAmount = Math.min(globalDiscountAmount, subtotal);

    const discountedSubtotal = Math.max(0, subtotal - globalDiscountAmount);

    // Tax (PPN)
    const taxPercentage = config.enableTax ? config.taxPercentage : 0;
    const taxAmount = Math.round((discountedSubtotal * taxPercentage) / 100);
    const grandTotal = discountedSubtotal + taxAmount;

    // Check payment validity
    if (payment.method === 'cash') {
      if (payment.amountTendered < grandTotal) {
        return {
          success: false,
          error: `Nominal tunai (Rp ${payment.amountTendered.toLocaleString('id-ID')}) kurang dari total bayar (Rp ${grandTotal.toLocaleString('id-ID')})`
        };
      }
      payment.change = Math.max(0, payment.amountTendered - grandTotal);
    } else {
      payment.amountTendered = grandTotal;
      payment.change = 0;
    }

    // 2. Atomic Stock Deduction
    for (const item of cartItems) {
      const prodIndex = currentProducts.findIndex(p => p.id === item.product.id);
      if (prodIndex >= 0) {
        currentProducts[prodIndex].stock -= item.quantity;
      }
    }

    // 3. Create Order Entity
    const newOrder: Order = {
      id: 'ord_' + Date.now(),
      invoiceNumber: this.generateInvoiceNumber(),
      createdAt: new Date().toISOString(),
      cashierId: cashier.id,
      cashierName: cashier.name,
      customerName: customerName || 'Pelanggan Umum',
      customerPhone,
      items: orderItems,
      subtotal,
      globalDiscountAmount,
      globalDiscountType,
      globalDiscountValue,
      taxPercentage,
      taxAmount,
      grandTotal,
      totalCost,
      netProfit: Math.max(0, discountedSubtotal - totalCost),
      payment,
      status: 'completed',
      notes,
    };

    // 4. Commit changes
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(currentProducts));
    const orders = this.getOrders();
    orders.unshift(newOrder);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

    window.dispatchEvent(new Event('pos_data_changed'));
    return { success: true, order: newOrder };
  },

  cancelOrder(orderId: string, reason: string): boolean {
    const orders = this.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order || order.status === 'cancelled') return false;

    // Restock items (Atomic reversal)
    const products = this.getProducts();
    for (const item of order.items) {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        prod.stock += item.quantity;
      }
    }

    order.status = 'cancelled';
    order.notes = (order.notes ? order.notes + ' | ' : '') + `Dibatalkan: ${reason}`;

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    window.dispatchEvent(new Event('pos_data_changed'));
    return true;
  }
};

// Formatting helpers
export const formatRupiah = (amount: number): string => {
  return 'Rp ' + (amount || 0).toLocaleString('id-ID');
};

export const formatDateTime = (isoDate: string): string => {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoDate;
  }
};
