import React from "react";
import { 
  Calendar, Save, Search, Download, Plus, RotateCcw, 
  Printer, Edit2, Trash2, ZoomIn, ZoomOut 
} from "lucide-react";
import { InvoiceRun, Driver, Product } from "../types";
import { EditableProductCell } from "./EditableProductCell";
import { 
  getDriverColorClass, 
  getDriverCellColorClass, 
  isSameDriver 
} from "../utils/driverHelpers";
import { 
  getInvoiceWeight, 
  getInvoiceCartonsVolumetric, 
  getDriverCapacity 
} from "../utils/invoiceCalculations";
import { getTomorrowShamsiDate } from "../utils/shamsi";

interface PlanningScreenProps {
  role: string | null;
  invoices: InvoiceRun[];
  drivers: Driver[];
  products: Product[];
  allocatedQuantities: { [productId: string]: number };
  getProductStock: (id: string, defaultStock: number) => number;
  manualStockOverrides: { [productId: string]: number };
  driverSearchSlots: string[];
  setDriverSearchSlots: (slots: string[]) => void;
  shamsiYear: number;
  shamsiMonth: number;
  shamsiDay: number;
  formattedDate: string;
  selectedCategoryFilter: string;
  setSelectedCategoryFilter: (cat: string) => void;
  isProductEditMode: boolean;
  setIsProductEditMode: (val: boolean) => void;
  gridSelectionStats: { count: number; sum: number };
  setCellSelection: (val: any) => void;
  selectionAnchorRef: React.MutableRefObject<any>;
  gridZoomWrapperRef: React.RefObject<HTMLDivElement>;
  zoomLabelRef: React.RefObject<HTMLSpanElement>;
  sumBarCountRef: React.RefObject<HTMLSpanElement>;
  sumBarValueRef: React.RefObject<HTMLSpanElement>;
  handleUpdateInvoiceHeader: (runId: string, field: keyof InvoiceRun, value: any) => void;
  handleDeleteInvoice: (runId: string) => void;
  handleUpdateCell: (runId: string, productId: string, value: number) => void;
  handleUpdateStockOverride: (productId: string, value: number | null | undefined) => void;
  handleAddInvoiceRun: () => void;
  handleResetCurrentDayPlan: () => void;
  saveDailyPlan: () => void;
  saving: boolean;
  handleMoveInactiveToTomorrow: () => void;
  openCustomerSearchModal: () => void;
  handleExportExcel: () => void;
  setShowPrintPreview: (show: boolean) => void;
  handleGridCellMouseDown: (r: number, c: number, e: React.MouseEvent) => void;
  handleGridCellMouseEnter: (r: number, c: number) => void;
  handleClearSelectedGridCells: () => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleZoomReset: () => void;
  isGridCellSelected: (r: number, c: number) => boolean;
  saveMasterConfig: (drivers: Driver[], products: Product[]) => void;
  setProducts: (products: Product[]) => void;
}

export const PlanningScreen: React.FC<PlanningScreenProps> = ({
  role,
  invoices,
  drivers,
  products,
  allocatedQuantities,
  getProductStock,
  manualStockOverrides,
  driverSearchSlots,
  setDriverSearchSlots,
  shamsiYear,
  shamsiMonth,
  shamsiDay,
  formattedDate,
  selectedCategoryFilter,
  setSelectedCategoryFilter,
  isProductEditMode,
  setIsProductEditMode,
  gridSelectionStats,
  setCellSelection,
  selectionAnchorRef,
  gridZoomWrapperRef,
  zoomLabelRef,
  sumBarCountRef,
  sumBarValueRef,
  handleUpdateInvoiceHeader,
  handleDeleteInvoice,
  handleUpdateCell,
  handleUpdateStockOverride,
  handleAddInvoiceRun,
  handleResetCurrentDayPlan,
  saveDailyPlan,
  saving,
  handleMoveInactiveToTomorrow,
  openCustomerSearchModal,
  handleExportExcel,
  setShowPrintPreview,
  handleGridCellMouseDown,
  handleGridCellMouseEnter,
  handleClearSelectedGridCells,
  handleZoomIn,
  handleZoomOut,
  handleZoomReset,
  isGridCellSelected,
  saveMasterConfig,
  setProducts,
}) => {
  const validProducts = products.filter(p => p.category && p.category.trim() !== '');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">برنامه ریزی و فروش (کنترل هوشمند)</h2>
          {(() => {
            const allShortage = validProducts.reduce((acc, p) => {
              const allocated = allocatedQuantities[p.id] || 0;
              const currentStock = getProductStock(p.id, p.defaultStock);
              const remaining = currentStock - allocated;
              return remaining < 0 ? acc + Math.abs(remaining) : acc;
            }, 0);
            return allShortage > 0 ? (
              <p className="text-xs text-rose-600 font-extrabold flex items-center gap-1.5 mt-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span>⚠️ مجموع کل کسری اقلام امروز:</span>
                <span className="font-mono text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded-lg border border-rose-200 font-black">{allShortage.toLocaleString("en-US")} kg</span>
              </p>
            ) : (
              <p className="text-xs text-emerald-600 font-bold mt-1.5 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>✅ توازن کامل برقرار است (بدون کسری در انبار امروز)</span>
              </p>
            );
          })()}
        </div>
        <div className="flex flex-wrap gap-2">
          {invoices.some((inv) => inv.isActive === false) && role !== 'visitor' && (
            <button
              onClick={handleMoveInactiveToTomorrow}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 rounded-xl text-xs font-bold transition shadow-sm animate-pulse cursor-pointer"
              title="انتقال فاکتورهای غیرفعال به فردا"
            >
              <Calendar className="w-4 h-4 text-amber-600" />
              انتقال غیرفعال‌ها به فردا ({getTomorrowShamsiDate(shamsiYear, shamsiMonth, shamsiDay)})
            </button>
          )}
          {role !== 'visitor' && (
            <button
              onClick={saveDailyPlan}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-md disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4 text-emerald-100" />
              {saving ? "در حال ذخیره..." : "ثبت نهایی تغییرات"}
            </button>
          )}
          <button
            onClick={openCustomerSearchModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer"
            title="جستجوی کلی مشتری در تمام تاریخ‌ها"
          >
            <Search className="w-4 h-4 text-indigo-100" />
            جستجوی کلی مشتری
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer"
            title="دانلود فایل اکسل پیشرفته قالب‌بندی شده"
          >
            <Download className="w-4 h-4 text-cyan-100" />
            خروجی اکسل روزانه
          </button>
          <button
            onClick={handleAddInvoiceRun}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-sm transition shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            افزودن سفارش جدید
          </button>
          <button
            onClick={handleResetCurrentDayPlan}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-md border-none cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-rose-100" />
            حذف کل سفارشات از لیست
          </button>
          <button
            onClick={() => setShowPrintPreview(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            پرینت صورت بار رانندگان
          </button>
        </div>
      </div>

      <div className="sticky top-0 z-50 bg-slate-50/95 backdrop-blur-md py-2 border-b border-slate-200 no-print" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[11px] text-slate-500 font-bold mr-1 ml-2">فیلتر سریع کالا:</span>
            <button
              onClick={() => setSelectedCategoryFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                selectedCategoryFilter === "all"
                  ? "bg-cyan-600 text-white shadow-sm font-extrabold"
                  : "bg-white border border-slate-200 text-slate-600 hover:text-slate-850 hover:bg-slate-50"
              }`}
            >
              همه دسته‌بندی‌ها
            </button>
            {Array.from(new Set(validProducts.map((p) => p.category)))
              .filter((cat): cat is string => typeof cat === "string" && cat.trim() !== "")
              .map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                    selectedCategoryFilter === cat
                      ? "bg-cyan-600 text-white shadow-sm font-extrabold"
                      : "bg-white border border-slate-200 text-slate-600 hover:text-slate-850 hover:bg-slate-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
          </div>

          <div className="flex items-center">
            <button
              onClick={() => setIsProductEditMode(!isProductEditMode)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer shadow-sm ${
                isProductEditMode
                  ? "bg-amber-600 text-white font-black hover:bg-amber-500"
                  : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400"
              }`}
            >
              <Edit2 className="w-3 h-3" />
              {isProductEditMode ? "قفل کردن نام‌ها" : "ویرایش مستقیم کالاها"}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full pb-6" dir="rtl">
        <div className="flex flex-col gap-6 items-stretch px-1 w-full">
          {gridSelectionStats.count > 0 && (
            <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 no-print flex items-center gap-3 bg-slate-900/95 text-white rounded-full shadow-xl px-5 py-2.5 backdrop-blur-sm">
              <span ref={sumBarCountRef} className="text-xs font-bold text-slate-300">
                {gridSelectionStats.count.toLocaleString("en-US")}
              </span>
              <span className="text-xs font-bold text-slate-300 -mr-2">سلول انتخاب‌شده</span>
              <span className="w-px h-4 bg-slate-600" />
              <span className="text-sm font-black text-emerald-400 font-mono">
                مجموع: <span ref={sumBarValueRef}>{gridSelectionStats.sum.toLocaleString("en-US")}</span>
              </span>
              <button
                onClick={handleClearSelectedGridCells}
                className="mr-1 flex items-center gap-1 bg-rose-600 hover:bg-rose-500 transition-colors text-white text-xs font-bold rounded-full px-3 py-1 cursor-pointer"
                title="پاک کردن مقادیر سلول‌های انتخاب‌شده"
              >
                <Trash2 className="w-3.5 h-3.5" />
                پاک کردن
              </button>
              <button
                onClick={() => { setCellSelection(null); selectionAnchorRef.current = null; }}
                className="text-slate-400 hover:text-white transition-colors text-xs px-1 cursor-pointer"
                title="لغو انتخاب"
              >
                ✕
              </button>
            </div>
          )}

          <div className="fixed bottom-5 left-5 z-50 no-print flex items-center bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            <button
              onClick={handleZoomOut}
              className="p-2.5 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              title="کوچک‌نمایی جدول"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomReset}
              className="px-2 text-[11px] font-bold text-slate-500 hover:bg-slate-100 transition h-full cursor-pointer font-mono border-x border-slate-200 min-w-[46px]"
              title="بازنشانی به ۱۰۰٪"
            >
              <span ref={zoomLabelRef}>100%</span>
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2.5 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              title="بزرگ‌نمایی جدول"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="w-full space-y-4 no-print">
            <div id="main-unified-grid" className="bg-white rounded-2xl border border-slate-200 shadow-md max-h-[92vh] overflow-auto scrollbar-thin scrollbar-thumb-slate-300 w-full">
              <div ref={gridZoomWrapperRef} className="relative" style={{ zoom: "100%" } as React.CSSProperties}>
                <table className="text-right text-xs table-fixed" style={{ width: `${1850 + invoices.length * 140}px` }}>
                  <thead className="sticky top-0 z-30 bg-slate-50 border-b border-slate-200">
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th 
                        rowSpan={2}
                        className="sticky right-0 z-50 bg-blue-300 py-2.5 px-1 font-black text-black w-[110px] text-center border-l border-blue-400 shadow-[[-3px_0_6px_rgba(0,0,0,0.06)]]"
                        style={{ right: 0 }}
                      >
                        نوع مغز
                      </th>
                      <th 
                        rowSpan={2}
                        className="sticky z-50 bg-blue-300 py-2.5 px-1 font-black text-black w-[90px] text-center border-l border-blue-400 shadow-[[-3px_0_6px_rgba(0,0,0,0.06)]]"
                        style={{ right: '110px' }}
                      >
                        طعم
                      </th>

                      {invoices.map((inv, index) => {
                        const isActive = inv.isActive !== false;
                        return (
                          <th
                            key={inv.id}
                            className={`p-1.5 border-l border-slate-200 min-w-[135px] w-[140px] transition-all duration-300 align-top ${
                              !isActive 
                                ? "bg-slate-100 opacity-60 saturate-50" 
                                : "bg-gradient-to-b from-blue-50/70 to-white border-t-2 border-t-blue-500"
                            }`}
                          >
                            <div className="space-y-1.5 text-right flex flex-col h-full">
                              <div className={`flex items-center justify-between px-1.5 py-1 border-b rounded transition-all ${
                                !isActive 
                                  ? "border-slate-200 bg-slate-50" 
                                  : "border-blue-150 bg-blue-50"
                              }`}>
                                <label className={`flex items-center gap-1 cursor-pointer text-[10px] font-black ${
                                  !isActive ? "text-slate-500" : "text-blue-900"
                                }`}>
                                  <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) => handleUpdateInvoiceHeader(inv.id, "isActive", e.target.checked)}
                                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <span>فعال</span>
                                </label>
                                <span className={`text-[11px] font-bold py-0.5 px-1.5 rounded-full ${
                                  !isActive ? "bg-slate-200 text-slate-500" : "bg-blue-100 text-blue-800"
                                }`}>
                                  {index + 1}
                                </span>

                                <button
                                  onClick={() => handleDeleteInvoice(inv.id)}
                                  className="p-0.5 rounded transition text-blue-400 hover:text-rose-600 hover:bg-blue-100/50 cursor-pointer"
                                  title="حذف سفر"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="relative">
                                <div className={`rounded-md border p-1 transition-all shadow-sm ${getDriverColorClass(inv.driverName, inv.round, drivers)}`}>
                                  <div className="text-[8px] opacity-75 font-bold mb-0.5 select-none pr-1 text-right">راننده:</div>
                                  <select
                                    value={inv.driverName || ""}
                                    onChange={(e) => handleUpdateInvoiceHeader(inv.id, "driverName", e.target.value)}
                                    className="bg-transparent text-slate-950 w-full font-black focus:outline-none text-center text-[11px] cursor-pointer"
                                  >
                                    <option value="" className="bg-white text-slate-500">-- بدون راننده --</option>
                                    {drivers.map((d) => (
                                      <option key={d.name} value={d.name} className="bg-white text-slate-950">
                                        {d.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="space-y-1 bg-white/60 p-1 rounded-md border border-slate-150 shadow-sm mt-auto">
                                <div className="relative">
                                  <span className="absolute right-1 top-1.5 text-[8px] text-slate-400 pointer-events-none font-bold">مشتری:</span>
                                  <input
                                    id={`customer-${index}`}
                                    type="text"
                                    value={inv.customerName}
                                    onChange={(e) => handleUpdateInvoiceHeader(inv.id, "customerName", e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        const nextInput = document.getElementById(`destination-${index}`);
                                        if (nextInput) {
                                          nextInput.focus();
                                          (nextInput as HTMLInputElement).select();
                                        }
                                      }
                                    }}
                                    className={`w-full font-black focus:outline-none text-center pl-1 pr-7 text-xs rounded py-1 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 border ${getDriverColorClass(inv.driverName, inv.round, drivers)}`}
                                    placeholder="مشتری..."
                                  />
                                </div>
                                <div className="relative">
                                  <span className="absolute right-1 top-1.5 text-[8px] text-slate-400 pointer-events-none font-bold">مسیر:</span>
                                  <input
                                    id={`destination-${index}`}
                                    type="text"
                                    value={inv.destinationLocation}
                                    onChange={(e) => handleUpdateInvoiceHeader(inv.id, "destinationLocation", e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        const nextInput = document.getElementById(`truck-${index}`);
                                        if (nextInput) {
                                          nextInput.focus();
                                          (nextInput as HTMLInputElement).select();
                                        }
                                      }
                                    }}
                                    className={`w-full font-black focus:outline-none text-center pl-1 pr-7 text-xs rounded py-1 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 border ${getDriverColorClass(inv.driverName, inv.round, drivers)}`}
                                    placeholder="مسیر..."
                                  />
                                </div>
                                <div className="relative">
                                  <span className="absolute right-1 top-1.5 text-[8px] text-slate-400 pointer-events-none font-bold">باربری:</span>
                                  <input
                                    id={`truck-${index}`}
                                    type="text"
                                    value={inv.truckInfo}
                                    onChange={(e) => handleUpdateInvoiceHeader(inv.id, "truckInfo", e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        const nextInput = document.getElementById(`notes-${index}`);
                                        if (nextInput) {
                                          nextInput.focus();
                                          (nextInput as HTMLInputElement).select();
                                        }
                                      }
                                    }}
                                    className={`w-full font-black focus:outline-none text-center pl-1 pr-7 text-xs rounded py-1 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 border ${getDriverColorClass(inv.driverName, inv.round, drivers)}`}
                                    placeholder="باربری..."
                                  />
                                </div>
                                <div className="relative">
                                  <span className="absolute right-1 top-1.5 text-[7px] text-slate-400 pointer-events-none font-bold">توضیحات:</span>
                                  <input
                                    id={`notes-${index}`}
                                    type="text"
                                    value={inv.notes}
                                    onChange={(e) => handleUpdateInvoiceHeader(inv.id, "notes", e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        if (index + 1 < invoices.length) {
                                          const nextInput = document.getElementById(`customer-${index + 1}`);
                                          if (nextInput) {
                                            nextInput.focus();
                                            (nextInput as HTMLInputElement).select();
                                          }
                                        }
                                      }
                                    }}
                                    className={`w-full font-black focus:outline-none text-center pl-1 pr-[36px] text-[10px] rounded py-1 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 border ${getDriverColorClass(inv.driverName, inv.round, drivers)}`}
                                    placeholder="..."
                                  />
                                </div>
                              </div>
                            </div>
                          </th>
                        );
                      })}

                      <th className="bg-emerald-200 py-1 px-1 font-bold text-emerald-950 w-[95px] min-w-[95px] text-center border-l border-slate-200 align-middle">
                        <span className="text-[11px] whitespace-nowrap">جمع</span>
                      </th>
                      
                      <th className="bg-emerald-200 py-1 px-1 font-bold text-emerald-950 w-[95px] min-w-[95px] text-center border-l border-slate-200 align-middle">
                        <span className="text-[11px] whitespace-nowrap">موجودی دستی</span>
                      </th>
                      
                      <th className="bg-emerald-200 py-1 px-1 font-bold text-emerald-950 w-[95px] min-w-[95px] text-center border-l border-slate-200 align-middle">
                        <span className="text-[11px] whitespace-nowrap">موجودی</span>
                      </th>
                      
                      <th className="bg-emerald-200 py-1 px-1 font-bold text-emerald-950 w-[95px] min-w-[95px] text-center border-l border-slate-200 align-middle">
                        <span className="text-[11px] whitespace-nowrap">باقیمانده</span>
                      </th>
                      
                      <th className="bg-rose-200 py-1 px-1 font-bold text-rose-950 w-[95px] min-w-[95px] text-center border-l border-slate-200 align-middle">
                        <span className="text-[11px] whitespace-nowrap">کسری</span>
                      </th>

                      {driverSearchSlots.map((slot, idx) => {
                        const realIdx = 9 - idx;
                        const driver = driverSearchSlots[realIdx];
                        
                        let totalCartons = 0;
                        if (driver) {
                          invoices
                            .filter((inv) => isSameDriver(inv.driverName, driver) && inv.isActive !== false)
                            .forEach((inv) => {
                              validProducts.forEach((p) => {
                                const q = Number(inv.quantities[p.id] || 0);
                                if (q > 0 && p.unitWeight > 0) {
                                  totalCartons += q / p.unitWeight;
                                }
                              });
                            });
                        }
                        
                        return (
                          <th key={idx} className="bg-orange-50/90 py-1 px-1 border-l border-slate-200 text-center w-[110px] min-w-[110px] align-middle">
                            <div className="flex flex-col items-center justify-center space-y-1">
                              <span className="text-[10px] text-orange-700 font-extrabold block">جستجو {10 - idx}</span>
                              {driver && totalCartons > 0 && (
                                <span className="text-[10px] text-red-700 font-bold bg-red-50 px-1 rounded block mt-0.5" dir="rtl">
                                  {totalCartons.toLocaleString("en-US", { maximumFractionDigits: 1 })} کارتن
                                </span>
                              )}
                              <div className="rounded border border-orange-200 bg-white p-0.5 w-full">
                                <select
                                  value={driverSearchSlots[realIdx] || ""}
                                  onChange={(e) => {
                                    const newSlots = [...driverSearchSlots];
                                    newSlots[realIdx] = e.target.value;
                                    setDriverSearchSlots(newSlots);
                                  }}
                                  className="bg-transparent font-extrabold w-full text-center focus:outline-none cursor-pointer text-[11px] text-slate-800"
                                >
                                  <option value="">-</option>
                                  {drivers.map((d) => (
                                    <option key={d.name} value={d.name}>
                                      {d.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </th>
                        );
                      }).reverse()}
                      
                      <th className="bg-orange-100 py-1 px-1 border-l border-slate-200 align-middle w-[115px] min-w-[115px]">
                        <span className="text-[11px] font-bold text-slate-800 text-center whitespace-nowrap block">
                          جمع کل جستجو
                        </span>
                      </th>
                    </tr>

                    <tr className="bg-slate-100/80 border-b-2 border-slate-300 shadow-sm">
                      {invoices.map((inv, index) => {
                        const isActive = inv.isActive !== false;
                        const weight = getInvoiceWeight(inv);
                        const limit = getDriverCapacity(inv.driverName, drivers);
                        const isOverloaded = weight > limit;
                        return (
                          <th
                            key={inv.id}
                            className={`p-1.5 border-l border-slate-200 align-middle ${
                              !isActive 
                                ? "bg-slate-100 opacity-60 saturate-50" 
                                : "bg-gradient-to-b from-slate-50 to-slate-100/80"
                            }`}
                          >
                            <div className={`flex flex-col items-center justify-center py-1 px-1.5 rounded border transition-all shadow-sm ${
                              !isActive 
                                ? "bg-slate-100 border-slate-200 text-slate-400" 
                                : isOverloaded 
                                ? "bg-rose-50 border-rose-300 text-rose-900"
                                : "bg-indigo-50 border-indigo-300 text-indigo-950"
                            }`}>
                              <div className="text-[8px] font-bold opacity-80 leading-tight">جمع کل وزن بار:</div>
                              <div className="text-[12px] font-black tracking-tight leading-none mt-1">
                                {weight.toLocaleString("en-US", { maximumFractionDigits: 1 })} Kg
                              </div>
                            </div>
                          </th>
                        );
                      })}
                      {(() => {
                        const filteredProducts = validProducts.filter((p) => selectedCategoryFilter === "all" || p.category === selectedCategoryFilter);
                        let sumAllocated = 0;
                        let sumStock = 0;
                        let sumShortage = 0;
                        let sumManualStock = 0;

                        filteredProducts.forEach((p) => {
                          const allocated = allocatedQuantities[p.id] || 0;
                          const currentStock = getProductStock(p.id, p.defaultStock);
                          
                          const ms = manualStockOverrides[p.id];
                          if (ms !== undefined && ms !== null) {
                            sumManualStock += Number(ms);
                          }
                          
                          sumAllocated += allocated;
                          sumStock += currentStock;
                          
                          const rem = currentStock - allocated;
                          if (rem < 0) {
                            sumShortage += Math.abs(rem);
                          }
                        });
                        const sumRemaining = sumStock - sumAllocated;
                        
                        let searchGrandTotalWeight = 0;
                        
                        return (
                          <>
                            <th className="bg-emerald-200 p-1.5 font-bold text-emerald-950 w-[95px] min-w-[95px] text-center border-l border-slate-200 align-middle">
                              <div className="rounded p-1 border text-center bg-emerald-50 border-emerald-300 text-emerald-950 shadow-sm mx-1">
                                <div className="text-[8px] font-bold opacity-80 leading-tight">کل (Kg):</div>
                                <div className="text-[12px] font-black tracking-tight leading-none mt-1">
                                  {sumAllocated.toLocaleString("en-US", { maximumFractionDigits: 1 })}
                                </div>
                              </div>
                            </th>
                            
                            <th className="bg-emerald-200 p-1.5 font-bold text-emerald-950 w-[95px] min-w-[95px] text-center border-l border-slate-200 align-middle">
                              <div className="rounded p-1 border text-center bg-emerald-50 border-emerald-300 text-emerald-950 shadow-sm mx-1">
                                <div className="text-[8px] font-bold opacity-80 leading-tight">کل (Kg):</div>
                                <div className="text-[12px] font-black tracking-tight leading-none mt-1">
                                  {sumManualStock !== 0 ? sumManualStock.toLocaleString("en-US", { maximumFractionDigits: 1 }) : "-"}
                                </div>
                              </div>
                            </th>
                            
                            <th className="bg-emerald-200 p-1.5 font-bold text-emerald-950 w-[95px] min-w-[95px] text-center border-l border-slate-200 align-middle">
                              <div className="rounded p-1 border text-center bg-emerald-50 border-emerald-300 text-emerald-950 shadow-sm mx-1">
                                <div className="text-[8px] font-bold opacity-80 leading-tight">کل (Kg):</div>
                                <div className="text-[12px] font-black tracking-tight leading-none mt-1">
                                  {sumStock.toLocaleString("en-US", { maximumFractionDigits: 1 })}
                                </div>
                              </div>
                            </th>
                            
                            <th className={`p-1.5 font-bold text-emerald-950 w-[95px] min-w-[95px] text-center border-l border-slate-200 align-middle ${sumRemaining < 0 ? "bg-rose-200" : "bg-emerald-200"}`}>
                              <div className={`rounded p-1 border text-center shadow-sm mx-1 ${sumRemaining < 0 ? "bg-rose-50 border-rose-300 text-rose-950" : "bg-emerald-50 border-emerald-300 text-emerald-950"}`}>
                                <div className="text-[8px] font-bold opacity-80 leading-tight">کل (Kg):</div>
                                <div className="text-[12px] font-black tracking-tight leading-none mt-1">
                                  {sumRemaining.toLocaleString("en-US", { maximumFractionDigits: 1 })}
                                </div>
                              </div>
                            </th>
                            
                            <th className="bg-rose-200 p-1.5 font-bold text-rose-950 w-[95px] min-w-[95px] text-center border-l border-slate-200 align-middle">
                              <div className="rounded p-1 border text-center bg-rose-50 border-rose-300 text-rose-950 shadow-sm mx-1">
                                <div className="text-[8px] font-bold opacity-80 leading-tight">کل (Kg):</div>
                                <div className="text-[12px] font-black tracking-tight leading-none mt-1">
                                  {sumShortage.toLocaleString("en-US", { maximumFractionDigits: 1 })}
                                </div>
                              </div>
                            </th>

                            {driverSearchSlots.map((slot, idx) => {
                              const realIdx = 9 - idx;
                              const driver = driverSearchSlots[realIdx];
                              
                              let slotTotalWeight = 0;
                              
                              if (driver) {
                                invoices
                                  .filter((inv) => isSameDriver(inv.driverName, driver) && inv.isActive !== false)
                                  .forEach((inv) => {
                                    filteredProducts.forEach((p) => {
                                      const q = Number(inv.quantities[p.id] || 0);
                                      if (q > 0) {
                                        slotTotalWeight += q;
                                      }
                                    });
                                  });
                                searchGrandTotalWeight += slotTotalWeight;
                              }
                              
                              return (
                                <th key={idx} className="bg-orange-50/90 py-1.5 px-1.5 border-l border-slate-200 text-center w-[110px] min-w-[110px] align-middle">
                                  <div className="rounded p-1 border text-center bg-orange-100 border-orange-200 text-orange-950 shadow-sm mx-1">
                                    <div className="text-[8px] font-bold opacity-80 leading-tight">کل (Kg):</div>
                                    <div className="text-[12px] font-black tracking-tight leading-none mt-1">
                                      {slotTotalWeight > 0 ? slotTotalWeight.toLocaleString("en-US", { maximumFractionDigits: 1 }) : "-"}
                                    </div>
                                  </div>
                                </th>
                              );
                            }).reverse()}
                            
                            <th className="bg-orange-100 p-1.5 border-l border-slate-200 align-middle w-[115px] min-w-[115px]">
                              <div className="rounded p-1 border text-center bg-orange-200 border-orange-300 text-slate-950 shadow-sm mx-1">
                                <div className="text-[8px] font-bold opacity-80 leading-tight">کل (Kg):</div>
                                <div className="text-[12px] font-black tracking-tight leading-none mt-1">
                                  {searchGrandTotalWeight > 0 ? searchGrandTotalWeight.toLocaleString("en-US", { maximumFractionDigits: 1 }) : "0"}
                                </div>
                              </div>
                            </th>
                          </>
                        );
                      })()}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 bg-white">
                    {validProducts
                      .filter((p) => selectedCategoryFilter === "all" || p.category === selectedCategoryFilter)
                      .map((p, pIndex, filteredArr) => {
                        const allocated = allocatedQuantities[p.id] || 0;
                        const currentStock = getProductStock(p.id, p.defaultStock);
                        const remainingStock = currentStock - allocated;
                        const isShortage = remainingStock < 0;

                        const isFirstInGroup = pIndex === 0 || filteredArr[pIndex - 1].category !== p.category;
                        const isLastInGroup = pIndex === filteredArr.length - 1 || filteredArr[pIndex + 1].category !== p.category;
                        const borderBottomClass = isLastInGroup ? "border-b-[3px] border-red-600" : "border-b border-slate-200";

                        return (
                          <tr key={p.id} className="hover:bg-slate-50 group transition-colors duration-150">
                            <td 
                              className={`sticky right-0 z-20 ${isProductEditMode ? "p-1" : "py-2 px-1"} border-l border-slate-200 text-center transition w-[110px] shadow-[[-3px_0_6px_rgba(0,0,0,0.06)]] ${borderBottomClass} ${
                                isFirstInGroup
                                  ? "bg-blue-200 text-black font-black text-[12px] group-focus-within:bg-blue-300 group-focus-within:text-blue-950 group-focus-within:group-hover:bg-blue-300 group-focus-within:group-hover:text-blue-950"
                                  : "bg-blue-100 text-black font-bold text-[11.5px] group-hover:bg-blue-200 group-focus-within:bg-blue-300 group-focus-within:text-blue-950 group-focus-within:group-hover:bg-blue-300 group-focus-within:group-hover:text-blue-950"
                              }`}
                              style={{ right: 0 }}
                            >
                              <div className="leading-normal">
                                {isProductEditMode ? (
                                  <EditableProductCell
                                    value={p.category}
                                    onSave={(newVal) => {
                                      const updated = products.map((prod) => 
                                        prod.id === p.id ? { ...prod, category: newVal } : prod
                                      );
                                      setProducts(updated);
                                      saveMasterConfig(drivers, updated);
                                    }}
                                  />
                                ) : (
                                  <span>{p.category}</span>
                                )}
                              </div>
                            </td>

                            <td 
                              className={`sticky z-20 ${isProductEditMode ? "p-1" : "py-2 px-1"} border-l border-slate-200 text-center bg-blue-50 text-black transition w-[90px] font-black text-[11.5px] leading-normal group-hover:bg-blue-100 group-focus-within:bg-blue-300 group-focus-within:text-blue-950 group-focus-within:group-hover:bg-blue-300 group-focus-within:group-hover:text-blue-950 ${borderBottomClass}`}
                              style={{ right: '110px' }}
                            >
                              <div>
                                {isProductEditMode ? (
                                  <EditableProductCell
                                    value={p.flavor}
                                    onSave={(newVal) => {
                                      const updated = products.map((prod) => 
                                        prod.id === p.id ? { ...prod, flavor: newVal } : prod
                                      );
                                      setProducts(updated);
                                      saveMasterConfig(drivers, updated);
                                    }}
                                  />
                                ) : (
                                  <span>{p.flavor || "-"}</span>
                                )}
                              </div>
                            </td>

                            {invoices.map((inv, invIndex) => {
                              const qty = inv.quantities[p.id] || 0;
                              const isActive = inv.isActive !== false;
                              const isSelectedCell = isGridCellSelected(pIndex, invIndex);
                              return (
                                <td
                                  key={inv.id}
                                  data-row={pIndex}
                                  data-col={invIndex}
                                  onMouseDown={(e) => handleGridCellMouseDown(pIndex, invIndex, e)}
                                  onMouseEnter={() => handleGridCellMouseEnter(pIndex, invIndex)}
                                  className={`p-0.5 border-l border-slate-200 text-center select-none ${getDriverCellColorClass(inv.driverName, inv.round, qty, isActive, drivers)} ${borderBottomClass} ${isSelectedCell ? "ring-2 ring-inset ring-emerald-500 bg-emerald-100/60" : ""}`}
                                >
                                  <input
                                    id={`cell-${invIndex}-${pIndex}`}
                                    type="number"
                                    onWheel={(e) => e.currentTarget.blur()}
                                    min="0"
                                    value={qty || ""}
                                    onChange={(e) => handleUpdateCell(inv.id, p.id, Math.max(0, parseInt(e.target.value, 10) || 0))}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === "ArrowDown") {
                                        e.preventDefault();
                                        const nextInput = document.getElementById(`cell-${invIndex}-${pIndex + 1}`);
                                        if (nextInput) {
                                          nextInput.focus();
                                          (nextInput as HTMLInputElement).select();
                                        }
                                      } else if (e.key === "ArrowUp") {
                                        e.preventDefault();
                                        const prevInput = document.getElementById(`cell-${invIndex}-${pIndex - 1}`);
                                        if (prevInput) {
                                          prevInput.focus();
                                          (prevInput as HTMLInputElement).select();
                                        }
                                      }
                                    }}
                                    className={`border rounded py-0.5 px-0.5 h-7 w-full font-mono text-center font-extrabold text-xs focus:outline-none bg-transparent ${
                                      !isActive
                                        ? "text-slate-400 border-slate-200 cursor-not-allowed opacity-40"
                                        : "text-slate-950 border-current/30 focus:border-current focus:bg-white/50"
                                    }`}
                                    placeholder="-"
                                    disabled={!isActive}
                                  />
                                </td>
                              );
                            })}

                            <td className={`py-1 px-0.5 border-l border-slate-200 text-center bg-emerald-100 font-mono text-emerald-950 w-[95px] ${borderBottomClass} group-focus-within:bg-blue-300 group-focus-within:text-blue-950 group-focus-within:group-hover:bg-blue-300 group-focus-within:group-hover:text-blue-950`}>
                              <div className="font-extrabold text-xs">{allocated > 0 ? allocated.toLocaleString("en-US") : "0"}</div>
                            </td>

                            <td className={`p-0.5 border-l border-slate-200 text-center bg-emerald-100/60 w-[95px] ${borderBottomClass} group-focus-within:bg-blue-300 group-focus-within:text-blue-950 group-focus-within:group-hover:bg-blue-300 group-focus-within:group-hover:text-blue-950`}>
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <input
                                  id={`stock-${pIndex}`}
                                  type="number"
                                  onWheel={(e) => e.currentTarget.blur()}
                                  value={manualStockOverrides[p.id] !== undefined ? manualStockOverrides[p.id] : ""}
                                  onChange={(e) => {
                                    const parsed = parseInt(e.target.value, 10);
                                    const val = e.target.value === "" ? null : (isNaN(parsed) ? 0 : parsed);
                                    handleUpdateStockOverride(p.id, val);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === "ArrowDown") {
                                      e.preventDefault();
                                      const nextInput = document.getElementById(`stock-${pIndex + 1}`);
                                      if (nextInput) {
                                        nextInput.focus();
                                        (nextInput as HTMLInputElement).select();
                                      }
                                    } else if (e.key === "ArrowUp") {
                                      e.preventDefault();
                                      const prevInput = document.getElementById(`stock-${pIndex - 1}`);
                                      if (prevInput) {
                                        prevInput.focus();
                                        (prevInput as HTMLInputElement).select();
                                      }
                                    }
                                  }}
                                  className="bg-white text-emerald-950 border border-emerald-300 rounded py-0.5 px-0.5 h-7 w-full font-mono text-center font-extrabold text-xs focus:outline-none focus:border-emerald-500 transition-all focus:bg-slate-50"
                                  placeholder={currentStock.toString()}
                                />
                              </div>
                            </td>

                            <td className={`py-1 px-0.5 border-l border-slate-200 text-center bg-emerald-100 font-mono text-emerald-950 w-[95px] ${borderBottomClass} group-focus-within:bg-blue-300 group-focus-within:text-blue-950 group-focus-within:group-hover:bg-blue-300 group-focus-within:group-hover:text-blue-950`}>
                              <div className="font-extrabold text-xs">{currentStock !== 0 ? currentStock.toLocaleString("en-US") : "0"}</div>
                            </td>

                            <td
                              className={`py-1 px-0.5 border-l border-slate-200 text-center font-mono transition w-[95px] ${borderBottomClass} ${
                                isShortage 
                                  ? "bg-rose-100 text-rose-700 font-extrabold group-focus-within:bg-blue-300 group-focus-within:text-blue-950 group-focus-within:group-hover:bg-blue-300 group-focus-within:group-hover:text-blue-950" 
                                  : "bg-emerald-200 text-emerald-950 font-extrabold group-focus-within:bg-blue-300 group-focus-within:text-blue-950 group-focus-within:group-hover:bg-blue-300 group-focus-within:group-hover:text-blue-950"
                              }`}
                            >
                              <div className="font-extrabold text-xs">
                                {remainingStock.toLocaleString("en-US")}
                              </div>
                            </td>

                            <td
                              className={`py-1 px-0.5 border-l border-slate-200 text-center font-mono transition w-[95px] ${borderBottomClass} ${
                                isShortage 
                                  ? "bg-rose-200 text-rose-800 font-extrabold group-focus-within:bg-rose-300 group-focus-within:text-rose-950 group-focus-within:group-hover:bg-rose-300 group-focus-within:group-hover:text-rose-950" 
                                  : "bg-slate-50 text-slate-400 group-focus-within:bg-blue-100 group-focus-within:text-slate-500 group-focus-within:group-hover:bg-blue-100 group-focus-within:group-hover:text-slate-500"
                              }`}
                            >
                              <div className="font-extrabold text-xs">
                                {isShortage ? Math.abs(remainingStock).toLocaleString("en-US") : "0"}
                              </div>
                            </td>
                            {driverSearchSlots.map((slot, idx) => {
                              const realIdx = 9 - idx;
                              const driver = driverSearchSlots[realIdx];
                              let productWeight = 0;
                              if (driver) {
                                invoices
                                  .filter((inv) => isSameDriver(inv.driverName, driver) && inv.isActive !== false)
                                  .forEach((inv) => {
                                    productWeight += Number(inv.quantities[p.id] || 0);
                                  });
                              }
                              return (
                                <td key={idx} className={`py-1 px-1 border-l border-slate-200 font-mono text-center text-xs text-slate-700 font-extrabold bg-orange-50/15 group-hover:bg-orange-100/30 w-[110px] min-w-[110px] ${borderBottomClass} group-focus-within:bg-blue-300 group-focus-within:text-blue-950 group-focus-within:group-hover:bg-blue-300 group-focus-within:group-hover:text-blue-950`}>
                                  {productWeight > 0 ? productWeight.toLocaleString("en-US") : "0"}
                                </td>
                              );
                            }).reverse()}
                            <td className={`py-1 px-1 border-l border-slate-200 font-mono text-center text-xs text-slate-900 font-black bg-orange-100/20 group-hover:bg-orange-100/40 w-[115px] min-w-[115px] ${borderBottomClass} group-focus-within:bg-blue-300 group-focus-within:text-blue-950 group-focus-within:group-hover:bg-blue-300 group-focus-within:group-hover:text-blue-950`}>
                              {(() => {
                                let rowTotal = 0;
                                driverSearchSlots.forEach((driver) => {
                                  if (driver) {
                                    invoices
                                      .filter((inv) => isSameDriver(inv.driverName, driver) && inv.isActive !== false)
                                      .forEach((inv) => {
                                        rowTotal += Number(inv.quantities[p.id] || 0);
                                      });
                                  }
                                });
                                return rowTotal > 0 ? rowTotal.toLocaleString("en-US") : "0";
                              })()}
                            </td>
                          </tr>
                        );
                      })}

                    {validProducts.length === 0 && (
                      <tr>
                        <td colSpan={invoices.length + 6} className="text-center text-slate-500 py-16">
                          هیچ کالا یا طعمی در پیکربندی پایه ثبت نشده است. ابتدا به تب "پیکربندی پایه" مراجعه کنید.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-right mt-3 text-xs text-amber-800 dark:text-amber-300 font-extrabold flex justify-start no-print">
              <span className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl px-4 py-2.5 shadow-sm inline-block animate-pulse">
                💡 برای ثبت قطعی تغییرات فاکتورها، دکمه سبز رنگ "ثبت نهایی تغییرات" را حتما بزنید.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
