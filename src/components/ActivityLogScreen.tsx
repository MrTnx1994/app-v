import React, { useEffect, useState } from 'react';
import { FileText, User, Calendar, Filter, AlertCircle, Trash2, Tag } from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import { Pagination } from './Pagination';

interface Log {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  details: any;
}

interface UserDropdownItem {
  uid: string;
  email: string;
}

const LOGS_PAGE_SIZE = 30;

// Mirrors the server-side categorization (see LOG_CATEGORY_CONDITIONS in
// server.ts) so the same log always lands in the same visual bucket.
const LOG_CATEGORIES: { value: string; label: string; badgeClass: string }[] = [
  { value: '', label: 'همه‌ی انواع تغییر', badgeClass: '' },
  { value: 'invoice', label: 'فاکتور', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'stock', label: 'موجودی انبار', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'users', label: 'مدیریت کاربران', badgeClass: 'bg-violet-50 text-violet-700 border-violet-200' },
  { value: 'system', label: 'سیستمی / بازنشانی', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  { value: 'other', label: 'سایر موارد', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' },
];

const getLogCategoryBadge = (action: string) => {
  if (action.includes('فاکتور')) return LOG_CATEGORIES[1];
  if (action.includes('موجودی')) return LOG_CATEGORIES[2];
  if (action.includes('کاربر')) return LOG_CATEGORIES[3];
  if (action.includes('پاک‌سازی') || action.includes('ریست') || action.includes('بازنشانی') || action.includes('ورود به سیستم')) return LOG_CATEGORIES[4];
  return LOG_CATEGORIES[5];
};

export const ActivityLogScreen = () => {
  const [selectedLogDetails, setSelectedLogDetails] = useState<any>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [usersList, setUsersList] = useState<UserDropdownItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Fetch unique users list to populate filter dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await apiFetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          const users: UserDropdownItem[] = [{ uid: '', email: 'همه کاربران' }];
          if (data.users) {
            data.users.forEach((u: any) => {
              if (u.email) {
                users.push({ uid: u.uid, email: u.email });
              }
            });
          }
          setUsersList(users);
        }
      } catch (error) {
        console.error('Error fetching users for logs filter:', error);
      }
    };
    fetchUsers();
  }, []);

  // Fetch activity logs (paginated, filterable by user and/or change-type)
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedUserId) params.set('userId', selectedUserId);
      if (selectedCategory) params.set('category', selectedCategory);
      params.set('page', String(logsPage));
      params.set('pageSize', String(LOGS_PAGE_SIZE));
      const res = await apiFetch(`/api/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalLogs(typeof data.total === 'number' ? data.total : (data.logs || []).length);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      setClearing(true);
      const res = await apiFetch('/api/logs/clear', {
        method: 'DELETE',
      });
      if (res.ok) {
        setLogs([]);
        setTotalLogs(0);
        setLogsPage(1);
        setConfirmClear(false);
      } else {
        alert('خطا در پاکسازی لاگ‌ها رخ داد.');
      }
    } catch (e) {
      console.error(e);
      alert('خطا در برقراری ارتباط با سرور.');
    } finally {
      setClearing(false);
    }
  };

  // Reset to page 1 whenever a filter changes
  useEffect(() => {
    setLogsPage(1);
  }, [selectedUserId, selectedCategory]);

  useEffect(() => {
    fetchLogs();
    // Poll logs every 10 seconds for a lively feed
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [selectedUserId, selectedCategory, logsPage]);

  return (
    <div className="p-6 bg-slate-50 min-h-screen" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Page Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-600 p-2.5 rounded-xl text-white shadow-md">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-950">لاگ و تاریخچه تغییرات سیستم</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">مشاهده زنده تمامی لاگ‌ها، دسترسی‌ها و تغییرات رخ داده توسط کاربران</p>
            </div>
          </div>

          {/* Clear Logs Button (Database Separation) */}
          <div className="flex items-center">
            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-extrabold rounded-xl text-xs transition shadow-sm cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                پاکسازی کل لاگ‌ها (دیتابیس مجزا)
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-rose-50/50 border border-rose-100 rounded-2xl p-2">
                <span className="text-xs font-black text-rose-800 animate-pulse px-1">
                  ⚠️ مطمئن هستید؟ دیتابیس لاگ‌ها خالی خواهد شد:
                </span>
                <button
                  disabled={clearing}
                  onClick={handleClearLogs}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {clearing ? 'در حال حذف...' : 'بله، حذف کن'}
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-slate-700 text-sm font-bold shrink-0">
            <Filter className="w-4 h-4 text-cyan-600" />
            <span>فیلتر:</span>
          </div>
          <div className="w-full flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-64">
              <label className="block text-[11px] font-bold text-slate-400 mb-1">کاربر تغییردهنده</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
              >
                {usersList.map((u) => (
                  <option key={u.uid} value={u.email === 'همه کاربران' ? '' : u.email}>
                    {u.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-64">
              <label className="block text-[11px] font-bold text-slate-400 mb-1">نوع تغییر</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
              >
                {LOG_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Logs Timeline Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-700 font-bold text-xs">
                  <th className="p-4 w-1/4">کاربر ایجادکننده اثر</th>
                  <th className="p-4 w-2/5">شرح تغییر / عملیات</th>
                  <th className="p-4 w-1/4">تاریخ و زمان ثبت</th>
                  <th className="p-4">جزئیات فنی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 font-semibold text-slate-900 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <div className="bg-slate-100 p-1.5 rounded-lg text-slate-600">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span>{log.userId}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getLogCategoryBadge(log.action).badgeClass}`}>
                          <Tag className="w-2.5 h-2.5" />
                          {getLogCategoryBadge(log.action).label}
                        </span>
                        <span className="font-semibold text-slate-800">{log.action}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(log.timestamp).toLocaleString('fa-IR')}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {log.details ? (
                        <button
                          onClick={() => setSelectedLogDetails(log.details)}
                          className="text-xs bg-slate-100 hover:bg-cyan-50 px-2.5 py-1 rounded-lg text-slate-600 font-mono block max-w-xs truncate text-right transition"
                        >
                          {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">بدون جزئیات اضافی</span>
                      )}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-400 font-medium">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 text-slate-300" />
                        <span>{loading ? 'در حال بارگذاری...' : 'هیچ لاگی برای این کاربر یافت نشد.'}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={logsPage}
            totalPages={Math.max(1, Math.ceil(totalLogs / LOGS_PAGE_SIZE))}
            onPageChange={setLogsPage}
            totalItems={totalLogs}
            pageSize={LOGS_PAGE_SIZE}
          />
        </div>

        {/* Modal for Details */}
        {selectedLogDetails && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl" dir="rtl">
              <h3 className="text-lg font-extrabold text-slate-900 border-b pb-3">جزئیات فنی</h3>
              <pre className="text-xs bg-slate-50 p-4 rounded-lg text-slate-700 font-mono overflow-auto max-h-96">
                {JSON.stringify(selectedLogDetails, null, 2)}
              </pre>
              <button
                onClick={() => setSelectedLogDetails(null)}
                className="w-full py-2 bg-slate-800 text-white rounded-xl font-bold text-sm"
              >
                بستن
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
