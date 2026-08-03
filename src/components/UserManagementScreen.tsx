import React, { useEffect, useState } from 'react';
import { logActivity } from '../lib/activityLog';
import { apiFetch } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { Pagination } from './Pagination';
import { UserPlus, Trash2, Shield, Mail, Lock, UserCheck, Eye, EyeOff, Edit2, XCircle, Truck } from 'lucide-react';

interface UserProfile {
  uid: string;
  email: string;
  password?: string;
  plainPassword?: string;
  role: 'admin' | 'sales' | 'driver' | 'visitor' | 'production_manager' | null;
  status?: 'active' | 'disabled';
  driverName?: string;
}

export const UserManagementScreen = () => {
  const { user: currentAuthUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'sales' | 'driver' | 'visitor' | 'production_manager'>('driver');
  const [driverName, setDriverName] = useState('');
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [driverFilter, setDriverFilter] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const USERS_PAGE_SIZE = 10;

  const togglePasswordVisibility = (uid: string) => {
    setVisiblePasswords(prev => ({ ...prev, [uid]: !prev[uid] }));
  };

  useEffect(() => {
    fetchUsers();
    fetchDrivers();
  }, []);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(users.length / USERS_PAGE_SIZE));
    if (usersPage > totalPages) setUsersPage(totalPages);
  }, [users.length, usersPage]);

  const fetchUsers = async () => {
    try {
      const res = await apiFetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await apiFetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setAvailableDrivers(data.drivers || []);
      }
    } catch (error) {
      console.error('Error fetching drivers list:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setMessage({ type: 'error', text: 'لطفا نام کاربری و رمز عبور را وارد کنید.' });
      return;
    }
    if (role === 'driver' && !driverName.trim()) {
      setMessage({ type: 'error', text: 'لطفاً نام راننده را وارد کنید.' });
      return;
    }
    setLoading(true);
    setMessage(null);

    const email = username.includes('@') ? username : `${username}@system.com`;

    try {
      const emailExists = users.some(u => u.email?.toLowerCase() === email.toLowerCase());
      if (emailExists) {
        throw new Error('کاربری با این نام کاربری یا ایمیل از قبل در سیستم موجود است.');
      }

      const res = await apiFetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          role, 
          driverName: role === 'driver' ? driverName : '' 
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'خطا در ایجاد کاربر.');
      }

      const currentUserEmail = currentAuthUser?.email || 'admin@system.com';
      await logActivity(currentUserEmail, `ایجاد کاربر جدید با نقش ${role}`, {
        targetEmail: email,
        role: role,
        driverName: role === 'driver' ? driverName : ''
      });

      setMessage({ type: 'success', text: `کاربر ${email} با موفقیت ساخته شد.` });
      setUsername('');
      setPassword('');
      setDriverName('');
      setRole('driver');
      fetchUsers();
    } catch (err: any) {
      console.error('Error creating user:', err);
      setMessage({ type: 'error', text: err.message || 'خطا در ایجاد کاربر.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (role === 'driver' && !driverName.trim()) {
      setMessage({ type: 'error', text: 'لطفاً نام راننده را وارد کنید.' });
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      const res = await apiFetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: editingUser.uid,
          role,
          driverName: role === 'driver' ? driverName : '',
          password: password || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'خطا در ویرایش کاربر.');
      }

      const currentUserEmail = currentAuthUser?.email || 'admin@system.com';
      await logActivity(currentUserEmail, `ویرایش اطلاعات کاربر با نقش ${role}`, {
        targetEmail: editingUser.email,
        role: role,
        driverName: role === 'driver' ? driverName : ''
      });

      setMessage({ type: 'success', text: `اطلاعات کاربر ${editingUser.email} با موفقیت بروزرسانی شد.` });
      setEditingUser(null);
      setUsername('');
      setPassword('');
      setDriverName('');
      setRole('driver');
      fetchUsers();
    } catch (err: any) {
      console.error('Error updating user:', err);
      setMessage({ type: 'error', text: err.message || 'خطا در ویرایش کاربر.' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: UserProfile) => {
    const newStatus = user.status === 'disabled' ? 'active' : 'disabled';
    try {
      const res = await apiFetch('/api/users/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, status: newStatus })
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }
      
      const currentUserEmail = currentAuthUser?.email || 'admin@system.com';
      await logActivity(currentUserEmail, `${newStatus === 'disabled' ? 'غیرفعال‌سازی' : 'فعال‌سازی'} کاربر`, {
        targetEmail: user.email,
        status: newStatus
      });

      setMessage({ type: 'success', text: `وضعیت کاربر با موفقیت تغییر کرد.` });
      fetchUsers();
    } catch (err: any) {
      console.error('Error updating status:', err);
      setMessage({ type: 'error', text: 'خطا در تغییر وضعیت کاربر.' });
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (user.email === 'admin@system.com') {
      setMessage({ type: 'error', text: 'امکان حذف کاربر اصلی مدیر کل وجود ندارد.' });
      return;
    }
    if (!window.confirm(`آیا از حذف کامل اطلاعات کاربر ${user.email} مطمئن هستید؟`)) {
      return;
    }
    try {
      const res = await apiFetch('/api/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid })
      });

      if (!res.ok) {
        throw new Error('Failed to delete user');
      }

      const currentUserEmail = currentAuthUser?.email || 'admin@system.com';
      await logActivity(currentUserEmail, `حذف کاربر از سیستم`, {
        targetEmail: user.email
      });

      setMessage({ type: 'success', text: `کاربر با موفقیت حذف شد.` });
      if (editingUser?.uid === user.uid) {
        cancelEdit();
      }
      fetchUsers();
    } catch (err: any) {
      console.error('Error deleting user document:', err);
      setMessage({ type: 'error', text: 'خطا در حذف کاربر.' });
    }
  };

  const startEdit = (user: UserProfile) => {
    setEditingUser(user);
    const namePart = user.email.includes('@') ? user.email.split('@')[0] : user.email;
    setUsername(namePart);
    setPassword('');
    setRole(user.role || 'driver');
    setDriverName(user.driverName || '');
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setDriverName('');
    setRole('driver');
    setMessage(null);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-600 p-2.5 rounded-xl text-white shadow-md">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-950">مدیریت کاربران سامانه</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">تعریف نقش‌ها و دسترسی‌های کاربران سیستم</p>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-sm font-semibold border ${
            message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
            <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-cyan-600" />
              {editingUser ? 'ویرایش اطلاعات کاربر' : 'افزودن کاربر جدید'}
            </h3>
            
            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">نام کاربری یا ایمیل</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="مثلا: user_sales"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={!!editingUser}
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-500 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">
                  {editingUser ? 'رمز عبور جدید (اختیاری)' : 'رمز عبور'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    placeholder={editingUser ? 'خالی بگذارید تا تغییر نکند' : 'حداقل ۶ کاراکتر'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">نقش کاربر</label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <Shield className="w-4 h-4" />
                  </span>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition appearance-none"
                  >
                    <option value="driver">راننده (فقط بارهای خود)</option>
                    <option value="visitor">ویزیتور (فقط مشاهده‌ی ریز موجودی انبار)</option>
                    <option value="sales">مدیر فروش (همه امکانات به جز پیکربندی)</option>
                    <option value="production_manager">مدیر تولید</option>
                    <option value="admin">مدیر کل (دسترسی کامل و تام)</option>
                  </select>
                </div>
              </div>

              {role === 'driver' && (
                <div className="animate-fadeIn space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">مسیرها یا رانندگان متصل</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                        <Truck className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="مثلا: شفیعی ۲, فقانی ۳ (یا فقط: شفیعی)"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition font-bold"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 font-medium leading-relaxed">
                      می‌توانید نام چندین راننده یا مسیر را با کاما (,) از هم جدا کنید. یا فقط نام خانوادگی را بنویسید تا تمام مسیرهای مربوطه به این کاربر تخصیص یابد.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-slate-700">انتخاب سریع از فهرست رانندگان:</span>
                      {driverName && (
                        <button
                          type="button"
                          onClick={() => setDriverName('')}
                          className="text-[10px] text-rose-600 hover:underline font-bold"
                        >
                          پاک کردن همه
                        </button>
                      )}
                    </div>
                    
                    <input
                      type="text"
                      placeholder="جستجوی سریع راننده..."
                      value={driverFilter}
                      onChange={(e) => setDriverFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium"
                    />

                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-xs">
                      {availableDrivers
                        .filter((drv) => !driverFilter || drv.name.includes(driverFilter) || (drv.vehicle && drv.vehicle.includes(driverFilter)))
                        .map((drv) => {
                          const currentSelected = driverName
                            .split(/[,،]/)
                            .map((s) => s.trim().toLowerCase())
                            .filter(Boolean);
                          const isChecked = currentSelected.includes(drv.name.trim().toLowerCase());

                          const handleToggleDriver = () => {
                            const currentList = driverName
                              .split(/[,،]/)
                              .map((s) => s.trim())
                              .filter(Boolean);
                            
                            if (isChecked) {
                              const newList = currentList.filter(
                                (name) => name.toLowerCase() !== drv.name.trim().toLowerCase()
                              );
                              setDriverName(newList.join(', '));
                            } else {
                              currentList.push(drv.name.trim());
                              setDriverName(currentList.join(', '));
                            }
                          };

                          return (
                            <label
                              key={drv.name}
                              className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-md cursor-pointer transition select-none"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={handleToggleDriver}
                                className="rounded text-cyan-600 focus:ring-cyan-500 w-3.5 h-3.5"
                              />
                              <span className="font-bold text-slate-800">{drv.name}</span>
                              <span className="text-[10px] text-slate-500 font-medium">({drv.vehicle || 'بدون خودرو'})</span>
                            </label>
                          );
                        })}
                      {availableDrivers.length === 0 && (
                        <p className="text-[10px] text-slate-400 text-center py-2">هیچ راننده‌ای تعریف نشده است.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2.5 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                    editingUser ? 'bg-amber-600 hover:bg-amber-700' : 'bg-cyan-600 hover:bg-cyan-700'
                  }`}
                >
                  {loading ? 'در حال ثبت...' : editingUser ? 'بروزرسانی اطلاعات کاربر' : 'ایجاد حساب کاربری'}
                </button>

                {editingUser && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="w-full py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    انصراف از ویرایش
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-800">فهرست کاربران فعال سیستم</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-700 font-bold text-xs">
                    <th className="p-4">آدرس ایمیل / نام کاربری</th>
                    <th className="p-4">رمز عبور</th>
                    <th className="p-4">نقش دسترسی</th>
                    <th className="p-4">راننده متصل</th>
                    <th className="p-4">وضعیت حساب</th>
                    <th className="p-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {users
                    .slice((usersPage - 1) * USERS_PAGE_SIZE, usersPage * USERS_PAGE_SIZE)
                    .map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 font-semibold text-slate-800 tracking-wide font-mono">
                        {u.email}
                      </td>
                      <td className="p-4 font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80 dir-ltr select-all">
                            {visiblePasswords[u.uid]
                              ? (u.plainPassword || (u.email === 'admin@system.com' ? '010203' : 'ثبت‌نشده'))
                              : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(u.uid)}
                            className="p-1 text-slate-400 hover:text-cyan-600 transition cursor-pointer"
                            title={visiblePasswords[u.uid] ? 'مخفی کردن' : 'مشاهده رمز عبور'}
                          >
                            {visiblePasswords[u.uid] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 ${
                          u.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                          u.role === 'sales' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          u.role === 'visitor' ? 'bg-violet-50 text-violet-700 border border-violet-100' :
                          u.role === 'production_manager' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {u.role === 'admin' ? 'مدیر کل' :
                           u.role === 'sales' ? 'مدیر فروش' :
                           u.role === 'visitor' ? 'ویزیتور' :
                           u.role === 'production_manager' ? 'مدیر تولید' : 'راننده'}
                        </span>
                      </td>
                      <td className="p-4">
                        {u.role === 'driver' ? (
                          u.driverName ? (
                            <span className="text-xs font-extrabold text-slate-900 bg-cyan-50/50 border border-cyan-150 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                              <Truck className="w-3 h-3 text-cyan-600" />
                              {u.driverName}
                            </span>
                          ) : (
                            <span className="text-xs text-rose-500 font-bold bg-rose-50/30 px-2 py-1 rounded-lg">
                              اتصال نیافته ⚠️
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 ${
                          u.status === 'disabled' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {u.status === 'disabled' ? 'غیرفعال' : 'فعال'}
                        </span>
                      </td>
                      <td className="p-4 flex justify-center items-center gap-2">
                        <button
                          onClick={() => startEdit(u)}
                          className="p-1.5 bg-slate-50 hover:bg-cyan-50 text-slate-500 hover:text-cyan-600 rounded-lg border border-slate-200 hover:border-cyan-200 transition cursor-pointer"
                          title="ویرایش کاربر"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            u.status === 'disabled' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                          }`}
                          title={u.status === 'disabled' ? 'فعال کردن' : 'غیرفعال کردن'}
                        >
                          {u.status === 'disabled' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        {u.email !== 'admin@system.com' && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg border border-slate-200 hover:border-rose-200 transition cursor-pointer"
                            title="حذف کاربر"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                        هیچ کاربر ثبت‌شده‌ای در سیستم وجود ندارد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={usersPage}
              totalPages={Math.max(1, Math.ceil(users.length / USERS_PAGE_SIZE))}
              onPageChange={setUsersPage}
              totalItems={users.length}
              pageSize={USERS_PAGE_SIZE}
            />
          </div>
        </div>
      </div>
    </div>
  );
};