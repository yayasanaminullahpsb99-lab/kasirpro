import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { PosTerminal } from './components/pos/PosTerminal';
import { CheckoutModal } from './components/pos/CheckoutModal';
import { ThermalReceiptModal } from './components/pos/ThermalReceiptModal';
import { InventoryManagement } from './components/inventory/InventoryManagement';
import { ReportsDashboard } from './components/reports/ReportsDashboard';
import { UserManagement } from './components/users/UserManagement';
import { ArchitectureDocs } from './components/architecture/ArchitectureDocs';
import { SettingsModal } from './components/settings/SettingsModal';
import { PosStorage } from './services/storage';
import { CartItem, Order, Product, Category, User, StoreConfig } from './types/pos';

export default function App() {
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'reports' | 'users' | 'architecture'>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User>(PosStorage.getActiveUser());
  const [config, setConfig] = useState<StoreConfig>(PosStorage.getConfig());

  // POS Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [globalDiscountType, setGlobalDiscountType] = useState<'percent' | 'nominal'>('percent');
  const [globalDiscountValue, setGlobalDiscountValue] = useState<number>(0);

  // Modals
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Load all initial data from storage
  const loadData = () => {
    setProducts(PosStorage.getProducts());
    setCategories(PosStorage.getCategories());
    setOrders(PosStorage.getOrders());
    setUsers(PosStorage.getUsers());
    setCurrentUser(PosStorage.getActiveUser());
    setConfig(PosStorage.getConfig());
  };

  useEffect(() => {
    loadData();

    const handleDataChanged = () => loadData();
    const handleUserChanged = () => setCurrentUser(PosStorage.getActiveUser());

    window.addEventListener('pos_data_changed', handleDataChanged);
    window.addEventListener('pos_user_changed', handleUserChanged);

    // Global shortcut: F9 to open checkout
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) {
          setIsCheckoutOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pos_data_changed', handleDataChanged);
      window.removeEventListener('pos_user_changed', handleUserChanged);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cart]);

  // Handle Switch User (e.g. change cashier shift)
  const handleSwitchUser = (user: User) => {
    PosStorage.setActiveUser(user);
    setCurrentUser(user);
    // If cashier doesn't have access to current tab, redirect to POS
    if (user.role === 'cashier' && (activeTab === 'inventory' || activeTab === 'reports' || activeTab === 'users')) {
      setActiveTab('pos');
    }
  };

  // Handle checkout success
  const handleCheckoutSuccess = (completedOrder: Order) => {
    setCart([]);
    setGlobalDiscountValue(0);
    setReceiptOrder(completedOrder);
    loadData();
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      
      {/* Global Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        allUsers={users}
        onSwitchUser={handleSwitchUser}
        config={config}
        products={products}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Areas */}
      <main className="flex-1 pb-10">
        {activeTab === 'pos' && (
          <PosTerminal
            products={products}
            categories={categories}
            cart={cart}
            setCart={setCart}
            config={config}
            currentUser={currentUser}
            onOpenCheckout={() => setIsCheckoutOpen(true)}
            globalDiscountType={globalDiscountType}
            setGlobalDiscountType={setGlobalDiscountType}
            globalDiscountValue={globalDiscountValue}
            setGlobalDiscountValue={setGlobalDiscountValue}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryManagement
            products={products}
            categories={categories}
            currentUser={currentUser}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsDashboard
            orders={orders}
            currentUser={currentUser}
            config={config}
            onOpenReceipt={(order) => setReceiptOrder(order)}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'users' && (
          <UserManagement
            users={users}
            currentUser={currentUser}
            onRefresh={loadData}
            onSwitchUser={handleSwitchUser}
          />
        )}

        {activeTab === 'architecture' && <ArchitectureDocs />}
      </main>

      {/* Modal 1: Multi-Channel Checkout */}
      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          cart={cart}
          currentUser={currentUser}
          config={config}
          globalDiscountType={globalDiscountType}
          globalDiscountValue={globalDiscountValue}
          onCheckoutSuccess={handleCheckoutSuccess}
        />
      )}

      {/* Modal 2: Thermal Receipt Print & Share */}
      {receiptOrder && (
        <ThermalReceiptModal
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
          config={config}
          onNewTransaction={() => {
            setReceiptOrder(null);
            setActiveTab('pos');
          }}
        />
      )}

      {/* Modal 3: Store & Printer Settings */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          config={config}
          onSave={(newCfg) => {
            PosStorage.saveConfig(newCfg);
            setConfig(newCfg);
          }}
          onResetData={() => {
            PosStorage.resetAllData();
            loadData();
          }}
        />
      )}
    </div>
  );
}
