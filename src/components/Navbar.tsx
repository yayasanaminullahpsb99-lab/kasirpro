import React, { useState } from 'react';
import { 
  Store, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Users, 
  Code2, 
  Settings, 
  AlertTriangle, 
  ShieldCheck, 
  UserCheck, 
  Maximize2,
  ChevronDown
} from 'lucide-react';
import { User, StoreConfig, Product } from '../types/pos';
import { PosStorage } from '../services/storage';

interface NavbarProps {
  activeTab: 'pos' | 'inventory' | 'reports' | 'users' | 'architecture';
  setActiveTab: (tab: 'pos' | 'inventory' | 'reports' | 'users' | 'architecture') => void;
  currentUser: User;
  allUsers: User[];
  onSwitchUser: (user: User) => void;
  config: StoreConfig;
  products: Product[];
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  allUsers,
  onSwitchUser,
  config,
  products,
  onOpenSettings,
}) => {
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);

  // Check low stock count
  const lowStockProducts = products.filter(p => p.stock <= p.minStock && p.isActive);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Admin</span>;
      case 'manager':
        return <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"><UserCheck className="w-3 h-3" /> Manager</span>;
      case 'cashier':
      default:
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"><Store className="w-3 h-3" /> Kasir</span>;
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Store Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base sm:text-lg leading-tight tracking-tight">
                  {config.storeName}
                </span>
                <span className="hidden sm:inline-block bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                  POS v2.5 PRO
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block truncate max-w-[220px]">
                {config.address}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'pos'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden md:inline">Kasir (POS)</span>
            </button>

            {/* Inventory tab visible to Admin & Manager */}
            {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'inventory'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Package className="w-4 h-4" />
                <span className="hidden md:inline">Katalog & Stok</span>
                {lowStockProducts.length > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {lowStockProducts.length}
                  </span>
                )}
              </button>
            )}

            {/* Reports tab visible to Admin & Manager */}
            {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
              <button
                onClick={() => setActiveTab('reports')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'reports'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden md:inline">Laporan & Omset</span>
              </button>
            )}

            {/* Users tab visible to Admin */}
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'users'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="hidden lg:inline">Akses & Tim</span>
              </button>
            )}

            {/* Enterprise Architecture Blueprint tab */}
            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'architecture'
                  ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/30'
                  : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300/60'
              }`}
            >
              <Code2 className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline font-semibold">Arsitektur & API</span>
            </button>
          </nav>

          {/* Right Action Icons & Role Switcher */}
          <div className="flex items-center gap-2">
            
            {/* Low stock warning bell */}
            {lowStockProducts.length > 0 && (
              <button
                onClick={() => setShowLowStockModal(true)}
                title={`${lowStockProducts.length} Produk Menipis!`}
                className="relative p-2 text-amber-600 hover:bg-amber-50 rounded-lg border border-amber-200 transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {lowStockProducts.length}
                </span>
              </button>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              title="Layar Penuh"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg hidden sm:block transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Settings button */}
            {currentUser.role === 'admin' && (
              <button
                onClick={onOpenSettings}
                title="Pengaturan Toko & Struk"
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* User Profile / Quick Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 transition-colors"
              >
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover border border-slate-300"
                />
                <div className="text-left hidden md:block">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {currentUser.name}
                  </p>
                  <div>{getRoleBadge(currentUser.role)}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown Menu for Quick Role Switching */}
              {showRoleDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">
                      Ganti Akun Kasir / Shift
                    </p>
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    {allUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          onSwitchUser(user);
                          setShowRoleDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors ${
                          user.id === currentUser.id ? 'bg-emerald-50/70' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={user.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{user.name}</p>
                            <p className="text-[10px] text-slate-400">PIN: {user.pin}</p>
                          </div>
                        </div>
                        {getRoleBadge(user.role)}
                      </button>
                    ))}
                  </div>
                  <div className="pt-2 px-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Shift: Aktif</span>
                    <button
                      onClick={() => {
                        setShowRoleDropdown(false);
                        onOpenSettings();
                      }}
                      className="text-emerald-600 hover:underline font-medium"
                    >
                      Pengaturan
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Low Stock Alert Modal */}
      {showLowStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-amber-200">
            <div className="flex items-center gap-3 mb-4 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Peringatan Stok Menipis</h3>
                <p className="text-xs text-slate-500">Ada {lowStockProducts.length} produk di bawah batas minimal</p>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 mb-5">
              {lowStockProducts.map(p => (
                <div key={p.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">SKU: {p.sku} | Min: {p.minStock} {p.unit}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    p.stock <= 3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    Sisa: {p.stock} {p.unit}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowLowStockModal(false);
                  setActiveTab('inventory');
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-xl text-sm transition-colors"
              >
                Buka Kelola Stok
              </button>
              <button
                onClick={() => setShowLowStockModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
