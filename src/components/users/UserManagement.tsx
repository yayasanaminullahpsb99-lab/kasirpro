import React, { useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  UserCheck, 
  Store, 
  Plus, 
  Edit3, 
  Key, 
  Check, 
  X,
  Lock,
  UserPlus
} from 'lucide-react';
import { User, Role } from '../../types/pos';
import { PosStorage, formatDateTime } from '../../services/storage';

interface UserManagementProps {
  users: User[];
  currentUser: User;
  onRefresh: () => void;
  onSwitchUser: (user: User) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  currentUser,
  onRefresh,
  onSwitchUser,
}) => {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleSaveUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const userData: User = {
      id: editingUser ? editingUser.id : 'usr_' + Date.now(),
      name: String(formData.get('name') || ''),
      email: String(formData.get('email') || ''),
      role: (formData.get('role') as Role) || 'cashier',
      pin: String(formData.get('pin') || '1234'),
      active: true,
      avatar: String(
        formData.get('avatar') ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
      ),
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString(),
    };

    PosStorage.saveUser(userData);
    setIsAddUserOpen(false);
    setEditingUser(null);
    onRefresh();
  };

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck className="w-4 h-4 text-purple-600" />;
      case 'manager':
        return <UserCheck className="w-4 h-4 text-blue-600" />;
      case 'cashier':
      default:
        return <Store className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Manajemen Pengguna & Akses (RBAC)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-Based Access Control untuk Admin, Manager Toko, dan Kasir dengan PIN autentikasi cepat
          </p>
        </div>

        <button
          onClick={() => {
            setEditingUser(null);
            setIsAddUserOpen(true);
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Karyawan Baru</span>
        </button>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {users.map((u) => {
          const isCurrent = u.id === currentUser.id;

          return (
            <div
              key={u.id}
              className={`bg-white rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                isCurrent
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                  : 'border-slate-200/80 shadow-xs hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="relative">
                    <img
                      src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={u.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                    />
                    {isCurrent && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
                    )}
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                    u.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : u.role === 'manager'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {getRoleIcon(u.role)}
                    {u.role}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm">{u.name}</h3>
                <p className="text-[11px] text-slate-400">{u.email}</p>
                <div className="mt-2 text-[11px] text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded inline-block">
                  PIN Kasir: {u.pin}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                {isCurrent ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Sesi Aktif
                  </span>
                ) : (
                  <button
                    onClick={() => onSwitchUser(u)}
                    className="text-[11px] font-bold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                  >
                    Masuk Sebagai Ini
                  </button>
                )}

                <button
                  onClick={() => {
                    setEditingUser(u);
                    setIsAddUserOpen(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Permissions Matrix Explanation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-600" />
          <span>Matriks Hak Akses (Role-Based Access Matrix)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Modul & Fitur</th>
                <th className="py-2.5 px-3 text-center">Admin</th>
                <th className="py-2.5 px-3 text-center">Manager</th>
                <th className="py-2.5 px-3 text-center">Kasir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2 px-3 font-medium">Transaksi Kasir (POS Checkout & Struk)</td>
                <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ Penuh</td>
                <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ Penuh</td>
                <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ Penuh</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">Katalog & Tambah Produk Baru</td>
                <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ Ya</td>
                <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ Ya</td>
                <td className="py-2 px-3 text-center text-slate-400">✗ Tidak</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">Penyesuaian Stok (Restock & Opname)</td>
                <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ Ya</td>
                <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ Ya</td>
                <td className="py-2 px-3 text-center text-slate-400">✗ Tidak</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">Laporan Omset & Keuntungan Bersih (HPP)</td>
                <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ Ya</td>
                <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ Ya</td>
                <td className="py-2 px-3 text-center text-slate-400">✗ Terbatas (Shift Saja)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">Pembatalan Faktur & Retur Transaksi</td>
                <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ Bebas</td>
                <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ Butuh PIN</td>
                <td className="py-2 px-3 text-center text-slate-400">✗ Butuh Supervisor</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">Pengaturan Toko, Pajak PPN & Kelola User</td>
                <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ Penuh</td>
                <td className="py-2 px-3 text-center text-slate-400">✗ Tidak</td>
                <td className="py-2 px-3 text-center text-slate-400">✗ Tidak</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD / EDIT USER */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              {editingUser ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Atur nama, email login, peran (role), dan PIN akses cepat kasir
            </p>

            <form onSubmit={handleSaveUser} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingUser?.name || ''}
                  placeholder="Contoh: Siti Rahma"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Email Akun *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  defaultValue={editingUser?.email || ''}
                  placeholder="kasir@toko.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Role / Hak Akses *
                  </label>
                  <select
                    name="role"
                    defaultValue={editingUser?.role || 'cashier'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="cashier">Kasir (Cashier)</option>
                    <option value="manager">Manager Toko</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    PIN Cepat Kasir (4 Digit) *
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    name="pin"
                    required
                    defaultValue={editingUser?.pin || '1234'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  URL Foto Profil
                </label>
                <input
                  type="url"
                  name="avatar"
                  defaultValue={editingUser?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  {editingUser ? 'Simpan Perubahan' : 'Buat Akun'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
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
