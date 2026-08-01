import React from "react";
import { motion } from "motion/react";
import { Search, Upload, Printer, Filter } from "lucide-react";
import { Product } from "../types";
import { SHAMSI_MONTHS, getShamsiWeekday } from "../utils/shamsi";

interface WarehouseScreenProps {
  role: string | null;
  shamsiYear: number;
  shamsiMonth: number;
  shamsiDay: number;
  validProducts: Product[];
  openCustomerSearchModal: () => void;
  handleExcelImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  getCustomRemainingStockSummary: () => {
    badam: number;
    sunflower: number;
    soya: number;
    cashew: number;
    khaleeji: number;
    corn: number;
    snack: number;
    total: number;
  };
  getCustomWarehouseSummary: () => {
    badam: number;
    sunflower: number;
    soya: number;
    cashew: number;
    khaleeji: number;
    corn: number;
    snack: number;
    total: number;
  };
  detailedInventoryFilter: string;
  setDetailedInventoryFilter: (val: string) => void;
  getDetailedExcelGridData: (filterCategory: string) => Array<{
    right: { name: string; value: number | string; isSpacer?: boolean };
    left: { name: string; value: number | string; isSpacer?: boolean };
  }>;
}

export function WarehouseScreen({
  role,
  shamsiYear,
  shamsiMonth,
  shamsiDay,
  validProducts,
  openCustomerSearchModal,
  handleExcelImport,
  getCustomRemainingStockSummary,
  getCustomWarehouseSummary,
  detailedInventoryFilter,
  setDetailedInventoryFilter,
  getDetailedExcelGridData,
}: WarehouseScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">مدیریت فیزیکی انبار و گزارش خروجی کالاها</h2>
          <p className="text-xs text-slate-500">پایش کل بارهای خروجی به صورت تجمیعی و جزئی برای تاریخ فعال</p>
        </div>
        
        <div className="flex items-center gap-3">
          {role === 'visitor' && (
            <button
              onClick={openCustomerSearchModal}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition"
            >
              <Search className="w-4 h-4 text-cyan-600" />
              جستجوی مشتریان
            </button>
          )}
          {role !== 'visitor' && (
            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition">
              <Upload className="w-3.5 h-3.5 text-cyan-600" />
              درون‌ریزی اولیه از اکسل
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelImport}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {role !== 'visitor' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
          <div className="flex flex-col items-center">
            <div className="w-full text-left font-sans text-xs sm:text-sm font-extrabold text-slate-900 mb-2 pl-2 flex justify-between items-center">
              <span className="text-xs text-slate-400 font-medium">موجودی تجمیعی کل انبار</span>
              <span>
                {getShamsiWeekday(shamsiYear, shamsiMonth, shamsiDay)}، {shamsiDay} {SHAMSI_MONTHS[shamsiMonth - 1]?.name || ""} {shamsiYear}
              </span>
            </div>

            <div id="excel-stock-print" className="w-full overflow-hidden rounded border border-[#70ad47] shadow-sm bg-white p-1">
              <table className="w-full text-center border-collapse border border-[#70ad47]">
                <thead>
                  <tr className="bg-[#c6e0b4] border border-[#70ad47] text-slate-900 font-extrabold text-xs sm:text-sm">
                    <th className="py-2 px-3 border border-[#70ad47] w-1/2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center justify-center w-4 h-4 bg-[#f2f2f2] border border-slate-400 rounded text-[8px] text-slate-700 font-sans cursor-default select-none shadow-[inset_0_1px_1px_rgba(0,0,0,0.1)]">▼</span>
                        <span className="mx-auto pr-2">موجودی</span>
                      </div>
                    </th>
                    <th className="py-2 px-3 border border-[#70ad47] w-1/2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center justify-center w-4 h-4 bg-[#f2f2f2] border border-slate-400 rounded text-[8px] text-slate-700 font-sans cursor-default select-none shadow-[inset_0_1px_1px_rgba(0,0,0,0.1)]">▼</span>
                        <span className="mx-auto pr-2">محصولات</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {(() => {
                    const summary = getCustomRemainingStockSummary();
                    return (
                      <>
                        <tr className="border border-[#70ad47]">
                          <td className="py-2 px-3 border border-[#70ad47] bg-[#e2efda] font-mono text-sm text-center text-emerald-800">
                            {summary.badam.toLocaleString("en-US")} <span className="text-[10px] font-sans text-emerald-600 font-normal">kg</span>
                          </td>
                          <td className="py-2 px-3 bg-white text-slate-700 font-bold text-right pr-6">
                            بادام زمینی
                          </td>
                        </tr>

                        <tr className="border border-[#70ad47]">
                          <td className="py-2 px-3 border border-[#70ad47] bg-[#e2efda] font-mono text-sm text-center text-emerald-800">
                            {summary.sunflower.toLocaleString("en-US")} <span className="text-[10px] font-sans text-emerald-600 font-normal">kg</span>
                          </td>
                          <td className="py-2 px-3 bg-white text-slate-700 font-bold text-right pr-6">
                            تخمه آفتابگردان
                          </td>
                        </tr>

                        <tr className="border border-[#70ad47]">
                          <td className="py-2 px-3 border border-[#70ad47] bg-[#e2efda] font-mono text-sm text-center text-emerald-800">
                            {summary.soya.toLocaleString("en-US")} <span className="text-[10px] font-sans text-emerald-600 font-normal">kg</span>
                          </td>
                          <td className="py-2 px-3 bg-white text-slate-700 font-bold text-right pr-6">
                            سویا
                          </td>
                        </tr>

                        <tr className="border border-[#70ad47]">
                          <td className="py-2 px-3 border border-[#70ad47] bg-[#e2efda] font-mono text-sm text-center text-emerald-800">
                            {summary.cashew.toLocaleString("en-US")} <span className="text-[10px] font-sans text-emerald-600 font-normal">kg</span>
                          </td>
                          <td className="py-2 px-3 bg-white text-slate-700 font-bold text-right pr-6">
                            بادام هندی
                          </td>
                        </tr>

                        <tr className="border border-[#70ad47]">
                          <td className="py-2 px-3 border border-[#70ad47] bg-[#e2efda] font-mono text-sm text-center text-emerald-800">
                            {summary.khaleeji.toLocaleString("en-US")} <span className="text-[10px] font-sans text-emerald-600 font-normal">kg</span>
                          </td>
                          <td className="py-2 px-3 bg-white text-slate-700 font-bold text-right pr-6">
                            آجیل خلیجی
                          </td>
                        </tr>

                        <tr className="border border-[#70ad47]">
                          <td className="py-2 px-3 border border-[#70ad47] bg-[#e2efda] font-mono text-sm text-center text-emerald-800">
                            {summary.corn.toLocaleString("en-US")} <span className="text-[10px] font-sans text-emerald-600 font-normal">kg</span>
                          </td>
                          <td className="py-2 px-3 bg-white text-slate-700 font-bold text-right pr-6">
                            ذرت
                          </td>
                        </tr>

                        <tr className="border border-[#70ad47]">
                          <td className="py-2 px-3 border border-[#70ad47] bg-[#e2efda] font-mono text-sm text-center text-emerald-800">
                            {summary.snack.toLocaleString("en-US")} <span className="text-[10px] font-sans text-emerald-600 font-normal">kg</span>
                          </td>
                          <td className="py-2 px-3 bg-white text-slate-700 font-bold text-right pr-6">
                            اسنک
                          </td>
                        </tr>

                        <tr className="border border-[#70ad47] font-black">
                          <td className="py-2.5 px-3 border border-[#70ad47] bg-[#a9d08e] font-mono text-base text-center text-emerald-950">
                            {summary.total.toLocaleString("en-US")} <span className="text-xs font-sans text-emerald-900">kg</span>
                          </td>
                          <td className="py-2.5 px-3 bg-[#c6e0b4] text-right pr-6 text-emerald-950 text-sm font-extrabold">
                            جمع کل
                          </td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => {
                const style = document.createElement("style");
                style.innerHTML = `
                  @media print {
                    body * {
                      visibility: hidden;
                    }
                    #excel-stock-print, #excel-stock-print * {
                      visibility: visible;
                    }
                    #excel-stock-print {
                      position: absolute;
                      left: 0;
                      top: 0;
                      width: 100%;
                      border: none;
                    }
                  }
                `;
                document.head.appendChild(style);
                window.print();
                document.head.removeChild(style);
              }}
              className="mt-4 flex items-center gap-1.5 px-4 py-2.5 bg-[#d89614] hover:bg-[#b87d0e] text-white font-bold text-xs rounded-xl shadow-md transition shrink-0 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              چاپ جدول موجودی باقیمانده (قالب تصویر)
            </button>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-full text-left font-sans text-xs sm:text-sm font-extrabold text-slate-900 mb-2 pl-2 flex justify-between items-center">
              <span className="text-xs text-slate-400 font-medium">خروجی تجمیعی به تفکیک گروه کالا</span>
              <span>
                {getShamsiWeekday(shamsiYear, shamsiMonth, shamsiDay)}، {shamsiDay} {SHAMSI_MONTHS[shamsiMonth - 1]?.name || ""} {shamsiYear}
              </span>
            </div>

            <div id="excel-summary-print" className="w-full overflow-hidden rounded border border-[#70ad47] shadow-sm bg-white p-1">
              <table className="w-full text-center border-collapse border border-[#70ad47]">
                <thead>
                  <tr className="bg-[#fce4d6] border border-[#70ad47] text-slate-900 font-extrabold text-xs sm:text-sm">
                    <th className="py-2 px-3 border border-[#70ad47] w-1/2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center justify-center w-4 h-4 bg-[#f2f2f2] border border-slate-400 rounded text-[8px] text-slate-700 font-sans cursor-default select-none shadow-[inset_0_1px_1px_rgba(0,0,0,0.1)]">▼</span>
                        <span className="mx-auto pr-2">خروجی</span>
                      </div>
                    </th>
                    <th className="py-2 px-3 border border-[#70ad47] w-1/2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center justify-center w-4 h-4 bg-[#f2f2f2] border border-slate-400 rounded text-[8px] text-slate-700 font-sans cursor-default select-none shadow-[inset_0_1px_1px_rgba(0,0,0,0.1)]">▼</span>
                        <span className="mx-auto pr-2">محصولات</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {(() => {
                    const summary = getCustomWarehouseSummary();
                    return (
                      <>
                        <tr className="border border-[#70ad47]">
                          <td className="py-2 px-3 border border-[#70ad47] bg-[#fdf2e9] font-mono text-sm text-center text-amber-800">
                            {summary.badam.toLocaleString("en-US")} <span className="text-[10px] font-sans text-amber-600 font-normal">kg</span>
                          </td>
                          <td className="py-2 px-3 bg-white text-slate-700 font-bold text-right pr-6">
                            بادام زمینی
                          </td>
                        </tr>

                        <tr className="border border-[#70ad47]">
                          <td className="py-2 px-3 border border-[#70ad47] bg-[#fdf2e9] font-mono text-sm text-center text-amber-800">
                            {summary.sunflower.toLocaleString("en-US")} <span className="text-[10px] font-sans text-amber-600 font-normal">kg</span>
                          </td>
                          <td className="py-2 px-3 bg-white text-slate-700 font-bold text-right pr-6">
                            تخمه آفتابگردان
                          </td>
                        </tr>

                        <tr className="border border-[#70ad47]">
                          <td className="py-2 px-3 border border-[#70ad47] bg-[#fdf2e9] font-mono text-sm text-center text-amber-800">
                            {summary.soya.toLocaleString("en-US")} <span className="text-[10px] font-sans text-amber-600 font-normal">kg</span>
                          </td>
                          <td className="py-2 px-3 bg-white text-slate-700 font-bold text-right pr-6">
                            سویا
                          </td>
                        </tr>

                        <tr className="border border-[#70ad47]">
                          <td className="py-2 px-3 border border-[#70ad47] bg-[#fdf2e9] font-mono text-sm text-center text-amber-800">
                            {summary.cashew.toLocaleString("en-US")} <span className="text-[10px] font-sans text-amber-600 font-normal">kg</span>
                          </td>
                          <td className="py-2 px-3 bg-white text-slate-700 font-bold text-right pr-6">
                            بادام هندی
                          </td>
                        </tr>

                        <tr className="border border-[#70ad47]">
                          <td className="py-2 px-3 border border-[#70ad47] bg-[#fdf2e9] font-mono text-sm text-center text-amber-800">
                            {summary.khaleeji.toLocaleString("en-US")} <span className="text-[10px] font-sans text-amber-600 font-normal">kg</span>
                          </td>
                          <td className="py-2 px-3 bg-white text-slate-700 font-bold text-right pr-6">
                            آجیل خلیجی
                          </td>
                        </tr>

                        <tr className="border border-[#70ad47]">
                          <td className="py-2 px-3 border border-[#70ad47] bg-[#fdf2e9] font-mono text-sm text-center text-amber-800">
                            {summary.corn.toLocaleString("en-US")} <span className="text-[10px] font-sans text-amber-600 font-normal">kg</span>
                          </td>
                          <td className="py-2 px-3 bg-white text-slate-700 font-bold text-right pr-6">
                            ذرت
                          </td>
                        </tr>

                        <tr className="border border-[#70ad47]">
                          <td className="py-2 px-3 border border-[#70ad47] bg-[#fdf2e9] font-mono text-sm text-center text-amber-800">
                            {summary.snack.toLocaleString("en-US")} <span className="text-[10px] font-sans text-amber-600 font-normal">kg</span>
                          </td>
                          <td className="py-2 px-3 bg-white text-slate-700 font-bold text-right pr-6">
                            اسنک
                          </td>
                        </tr>

                        <tr className="border border-[#70ad47] font-black">
                          <td className="py-2.5 px-3 border border-[#70ad47] bg-[#f4b084] font-mono text-base text-center text-amber-950">
                            {summary.total.toLocaleString("en-US")} <span className="text-xs font-sans text-amber-900">kg</span>
                          </td>
                          <td className="py-2.5 px-3 bg-[#fce4d6] text-right pr-6 text-amber-950 text-sm font-extrabold">
                            جمع کل
                          </td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => {
                const style = document.createElement("style");
                style.innerHTML = `
                  @media print {
                    body * {
                      visibility: hidden;
                    }
                    #excel-summary-print, #excel-summary-print * {
                      visibility: visible;
                    }
                    #excel-summary-print {
                      position: absolute;
                      left: 0;
                      top: 0;
                      width: 100%;
                      border: none;
                    }
                  }
                `;
                document.head.appendChild(style);
                window.print();
                document.head.removeChild(style);
              }}
              className="mt-4 flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition shrink-0 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              چاپ این جدول خروجی (قالب تصویر)
            </button>
          </div>

        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">ریز موجودی کامل کل انبار</h3>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
            <select
              value={detailedInventoryFilter}
              onChange={(e) => setDetailedInventoryFilter(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
            >
              <option value="all">همه‌ی محصولات</option>
              {Array.from(new Set(validProducts.map((p) => p.category))).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-full text-left font-sans text-xs sm:text-sm font-extrabold text-slate-900 mb-2 pl-2 flex justify-between items-center">
            <span>
              {shamsiDay} {SHAMSI_MONTHS[shamsiMonth - 1]?.name || ""} {shamsiYear}
            </span>
          </div>

          <div id="excel-detailed-stock-print" className="w-full overflow-x-auto rounded-xl border border-cyan-200 shadow-sm bg-white p-1" dir="rtl">
            <table className="w-full text-center border-collapse border border-cyan-200 min-w-[600px]">
              <thead>
                <tr className="bg-gradient-to-l from-cyan-600 to-blue-700 border-b border-cyan-700">
                  <th colSpan={4} className="py-2.5 px-3 text-center text-white font-black text-xs sm:text-sm border border-cyan-700">
                    {getShamsiWeekday(shamsiYear, shamsiMonth, shamsiDay)}، {shamsiDay} {SHAMSI_MONTHS[shamsiMonth - 1]?.name || ""} {shamsiYear}
                  </th>
                </tr>
                <tr className="bg-cyan-50 text-cyan-900 font-extrabold text-xs sm:text-sm border border-cyan-200">
                  <th className="py-2 px-3 border border-cyan-200 w-1/4">نام محصول</th>
                  <th className="py-2 px-3 border border-cyan-200 w-1/4">موجودی</th>
                  <th className="py-2 px-3 border border-cyan-200 w-1/4">نام محصول</th>
                  <th className="py-2 px-3 border border-cyan-200 w-1/4">موجودی</th>
                </tr>
              </thead>
              <tbody className="text-xs sm:text-sm font-bold text-slate-900">
                {getDetailedExcelGridData(detailedInventoryFilter).map((row, rIdx) => {
                  const rightIsLow = typeof row.right.value === "number" && row.right.value <= 0;
                  const leftIsLow = typeof row.left.value === "number" && row.left.value <= 0;
                  return (
                    <tr key={rIdx} className={`transition border-slate-200 ${rIdx % 2 === 0 ? "bg-white" : "bg-cyan-50/30"} hover:bg-cyan-50`}>
                      <td className="py-1.5 px-3 border border-slate-200 text-right text-xs pr-4 font-medium text-slate-800">
                        {row.right.isSpacer ? "" : row.right.name}
                      </td>
                      <td className="py-1.5 px-3 border border-slate-200 text-center">
                        {row.right.isSpacer ? "" : (
                          <span className={`inline-block px-2 py-0.5 rounded-lg font-mono text-sm ${rightIsLow ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                            {typeof row.right.value === "number" ? row.right.value.toLocaleString("en-US") : row.right.value}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-3 border border-slate-200 text-right text-xs pr-4 font-medium text-slate-800">
                        {row.left.isSpacer ? "" : row.left.name}
                      </td>
                      <td className="py-1.5 px-3 border border-slate-200 text-center">
                        {row.left.isSpacer ? "" : (
                          <span className={`inline-block px-2 py-0.5 rounded-lg font-mono text-sm ${leftIsLow ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                            {typeof row.left.value === "number" ? row.left.value.toLocaleString("en-US") : row.left.value}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => {
              const style = document.createElement("style");
              style.innerHTML = `
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  #excel-detailed-stock-print, #excel-detailed-stock-print * {
                    visibility: visible;
                  }
                  #excel-detailed-stock-print {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    border: none;
                    font-size: 8pt;
                  }
                  #excel-detailed-stock-print table {
                    width: 100% !important;
                    table-layout: fixed;
                  }
                  #excel-detailed-stock-print th, #excel-detailed-stock-print td {
                    word-wrap: break-word;
                    padding: 2px !important;
                  }
                }
                @page {
                  size: A4;
                  margin: 1cm;
                }
              `;
              document.head.appendChild(style);
              window.print();
              document.head.removeChild(style);
            }}
            className="mt-4 flex items-center gap-1.5 px-5 py-3 bg-[#4472c4] hover:bg-[#2f5597] text-white font-bold text-xs rounded-xl shadow-md transition shrink-0 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            چاپ ریز موجودی کامل (قالب تصویر)
          </button>
        </div>
      </div>
    </motion.div>
  );
}
