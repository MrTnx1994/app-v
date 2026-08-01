import React from "react";
import { Search, XCircle } from "lucide-react";
import { Product } from "../types";

interface CustomerSearchModalProps {
  showCustomerSearchModal: boolean;
  setShowCustomerSearchModal: (show: boolean) => void;
  customerSearchName: string;
  setCustomerSearchName: (val: string) => void;
  customerSearchFromDate: string;
  setCustomerSearchFromDate: (val: string) => void;
  customerSearchResults: any[] | null;
  setCustomerSearchResults: (val: any[] | null) => void;
  customerSearchLoading: boolean;
  customerSearchError: string | null;
  setCustomerSearchError: (err: string | null) => void;
  handleCustomerSearch: () => void;
  products: Product[];
}

export function CustomerSearchModal({
  showCustomerSearchModal,
  setShowCustomerSearchModal,
  customerSearchName,
  setCustomerSearchName,
  customerSearchFromDate,
  setCustomerSearchFromDate,
  customerSearchResults,
  setCustomerSearchResults,
  customerSearchLoading,
  customerSearchError,
  setCustomerSearchError,
  handleCustomerSearch,
  products
}: CustomerSearchModalProps) {
  if (!showCustomerSearchModal) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                جستجوی کلی مشتری
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                جستجو در تمام فاکتورهای ثبت‌شده از یک تاریخ مشخص به بعد (فقط نمایش)
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowCustomerSearchModal(false);
              setCustomerSearchResults(null);
              setCustomerSearchError(null);
            }}
            className="text-slate-400 hover:text-slate-700 transition p-1"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1 space-y-1">
            <label className="text-[11px] text-slate-500 font-bold block">نام مشتری:</label>
            <input
              type="text"
              value={customerSearchName}
              onChange={(e) => setCustomerSearchName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCustomerSearch(); }}
              placeholder="مثلاً: احمدی"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
              autoFocus
            />
          </div>
          <div className="w-full sm:w-52 space-y-1">
            <label className="text-[11px] text-slate-500 font-bold block">از تاریخ (شمسی):</label>
            <input
              type="text"
              value={customerSearchFromDate}
              onChange={(e) => setCustomerSearchFromDate(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCustomerSearch(); }}
              placeholder="1405/01/01"
              dir="ltr"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>
          <button
            onClick={handleCustomerSearch}
            disabled={customerSearchLoading}
            className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-md disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <Search className="w-4 h-4" />
            {customerSearchLoading ? "در حال جستجو..." : "جستجو"}
          </button>
        </div>

        {customerSearchError && (
          <div className="mx-5 mt-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-3 py-2 rounded-lg">
            {customerSearchError}
          </div>
        )}

        <div className="flex-1 overflow-auto p-5">
          {customerSearchResults === null ? (
            <div className="text-center text-slate-400 text-sm py-12">
              نام مشتری و تاریخ شروع را وارد کرده و روی «جستجو» بزنید.
            </div>
          ) : customerSearchResults.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-12">
              هیچ نتیجه‌ای برای «{customerSearchName}» از تاریخ {customerSearchFromDate} به بعد پیدا نشد.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 font-bold">
                {customerSearchResults.length.toLocaleString("fa-IR")} نتیجه پیدا شد:
              </p>

              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="p-2.5">تاریخ</th>
                    <th className="p-2.5">مشتری</th>
                    <th className="p-2.5">راننده</th>
                    <th className="p-2.5">مسیر</th>
                    <th className="p-2.5">نوبت</th>
                    <th className="p-2.5">جمع اقلام (کیلو)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerSearchResults.map((r: any, idx: number) => {
                    const totalKg: number = Object.values(r.invoice.quantities || {}).reduce<number>(
                      (sum, q) => sum + (Number(q) || 0), 0
                    );
                    return (
                      <React.Fragment key={`${r.date}-${r.invoice.id}-${idx}`}>
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-mono text-slate-600">{r.date}</td>
                        <td className="p-2.5 font-bold text-slate-900">{r.invoice.customerName}</td>
                        <td className="p-2.5 text-slate-700">{r.invoice.driverName || "-"}</td>
                        <td className="p-2.5 text-slate-500">{r.invoice.destinationLocation || "-"}</td>
                        <td className="p-2.5 text-center text-slate-500">{r.invoice.round || 1}</td>
                        <td className="p-2.5 font-mono font-bold text-emerald-700">{totalKg.toLocaleString("en-US")}</td>
                      </tr>
                      <tr>
                        <td colSpan={6} className="p-0 bg-slate-50 border-b border-slate-200">
                          <div className="px-4 py-2 text-[10px]">
                            <span className="font-bold text-slate-700">ریز سفارشات: </span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {Object.entries(r.invoice.quantities || {}).map(([pid, qty]) => {
                                const product = products.find(p => p.id === pid);
                                const prodName = product ? `${product.category} ${product.flavor}` : pid;
                                return (
                                  <span key={pid} className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                                    {prodName}: {qty}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
