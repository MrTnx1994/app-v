import React, { useState, useEffect } from "react";
import { Search, XCircle, Calendar, Clock, Filter, Check, Info } from "lucide-react";
import { Product } from "../types";
import { getTodayShamsi, gregorianToShamsi, SHAMSI_MONTHS } from "../utils/shamsi";

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
  handleCustomerSearch: (overrideFromDate?: string, overrideToDate?: string) => void;
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
  const todayShamsi = getTodayShamsi();

  // Local state for advanced search parameters
  const [activeFilterType, setActiveFilterType] = useState<"preset" | "month" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState<"30days" | "thisYear" | "pastYear" | "lastYear" | "allTime">("30days");
  
  const [selectedMonth, setSelectedMonth] = useState<number>(todayShamsi.month);
  const [selectedYear, setSelectedYear] = useState<number>(todayShamsi.year);
  
  const [customFrom, setCustomFrom] = useState<string>(`${todayShamsi.year}/01/01`);
  const [customTo, setCustomTo] = useState<string>(todayShamsi.formatted);
  
  // Display label for the queried period
  const [appliedPeriodLabel, setAppliedPeriodLabel] = useState<string>("");

  useEffect(() => {
    if (showCustomerSearchModal) {
      // Set default label based on defaults
      const { label } = computeDates();
      setAppliedPeriodLabel(label);
    }
  }, [showCustomerSearchModal]);

  if (!showCustomerSearchModal) return null;

  // Dynamically compute the search date range and description
  const computeDates = () => {
    let from = "1300/01/01";
    let to = "1499/12/29";
    let label = "";

    const today = getTodayShamsi();

    if (activeFilterType === "preset") {
      if (selectedPreset === "30days") {
        const jsDate = new Date();
        const pastDate = new Date();
        pastDate.setDate(jsDate.getDate() - 30);
        const shamsiPast = gregorianToShamsi(pastDate.getFullYear(), pastDate.getMonth() + 1, pastDate.getDate());
        from = shamsiPast.formatted;
        to = today.formatted;
        label = `۳۰ روز گذشته (از ${from} تا ${to})`;
      } else if (selectedPreset === "thisYear") {
        from = `${today.year}/01/01`;
        to = `${today.year}/12/30`;
        label = `امسال — سال ${today.year} (از ${from} تا ${to})`;
      } else if (selectedPreset === "pastYear") {
        const jsDate = new Date();
        const pastDate = new Date();
        pastDate.setFullYear(jsDate.getFullYear() - 1);
        const shamsiPast = gregorianToShamsi(pastDate.getFullYear(), pastDate.getMonth() + 1, pastDate.getDate());
        from = shamsiPast.formatted;
        to = today.formatted;
        label = `یک سال گذشته (از ${from} تا ${to})`;
      } else if (selectedPreset === "lastYear") {
        const ly = today.year - 1;
        from = `${ly}/01/01`;
        to = `${ly}/12/30`;
        label = `سال گذشته — سال ${ly} (از ${from} تا ${to})`;
      } else if (selectedPreset === "allTime") {
        from = "1300/01/01";
        to = `${today.year}/12/30`;
        label = "از ابتدا تا کنون";
      }
    } else if (activeFilterType === "month") {
      const monthObj = SHAMSI_MONTHS.find(m => m.id === selectedMonth);
      const monthName = monthObj ? monthObj.name : `${selectedMonth}`;
      let lastDay = monthObj ? monthObj.days : 30;
      if (selectedMonth === 12) {
        const isLeap = (selectedYear % 33 === 1 || selectedYear % 33 === 5 || selectedYear % 33 === 9 || selectedYear % 33 === 13 || selectedYear % 33 === 17 || selectedYear % 33 === 22 || selectedYear % 33 === 26 || selectedYear % 33 === 30);
        lastDay = isLeap ? 30 : 29;
      }
      from = `${selectedYear}/${selectedMonth.toString().padStart(2, '0')}/01`;
      to = `${selectedYear}/${selectedMonth.toString().padStart(2, '0')}/${lastDay.toString().padStart(2, '0')}`;
      label = `ماه ${monthName} سال ${selectedYear} (از ${from} تا ${to})`;
    } else {
      from = customFrom || "1300/01/01";
      to = customTo || today.formatted;
      label = `محدوده دلخواه (از ${from} تا ${to})`;
    }

    return { from, to, label };
  };

  const { from: liveFrom, to: liveTo, label: liveLabel } = computeDates();

  const handleSearchClick = () => {
    if (!customerSearchName.trim()) {
      setCustomerSearchError("لطفاً نام مشتری را وارد کنید.");
      return;
    }
    const { from, to, label } = computeDates();
    setAppliedPeriodLabel(label);
    handleCustomerSearch(from, to);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 transition-all">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-md shadow-indigo-100">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                جستجوی کلی و هوشمند مشتری
              </h3>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                جستجو در تمامی فاکتورها، مسیرها و خریدهای ثبت‌شده مشتری بر اساس بازه زمانی مشخص
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowCustomerSearchModal(false);
              setCustomerSearchResults(null);
              setCustomerSearchError(null);
            }}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition p-1.5 rounded-full"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Search Inputs & Filter System */}
        <div className="p-5 border-b border-slate-100 bg-white space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Customer Name input */}
            <div className="md:col-span-5 space-y-1">
              <label className="text-[11px] text-slate-600 font-extrabold block">نام مشتری برای جستجو:</label>
              <div className="relative">
                <input
                  type="text"
                  value={customerSearchName}
                  onChange={(e) => setCustomerSearchName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearchClick(); }}
                  placeholder="مثلاً: احمدی، بازرگانی صدرا ..."
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  autoFocus
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              </div>
            </div>

            {/* Filter Type Tab Switcher */}
            <div className="md:col-span-7 space-y-1">
              <label className="text-[11px] text-slate-600 font-extrabold block">انتخاب بازه زمانی جستجو:</label>
              <div className="bg-slate-100 p-1 rounded-xl flex gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveFilterType("preset")}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1 transition ${
                    activeFilterType === "preset"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  دوره‌های زمانی آماده
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilterType("month")}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1 transition ${
                    activeFilterType === "month"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  ماه خاص از سال
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilterType("custom")}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1 transition ${
                    activeFilterType === "custom"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  محدوده دلخواه (شمسی)
                </button>
              </div>
            </div>
          </div>

          {/* Conditional Sub-filters */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            {activeFilterType === "preset" && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[11px] text-slate-400 font-bold ml-2">انتخاب سریع:</span>
                {[
                  { id: "30days", name: "۳۰ روز گذشته" },
                  { id: "thisYear", name: "امسال" },
                  { id: "pastYear", name: "یک سال گذشته" },
                  { id: "lastYear", name: "سال گذشته" },
                  { id: "allTime", name: "از ابتدا تا کنون" }
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPreset(preset.id as any)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      selectedPreset === preset.id
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {selectedPreset === preset.id && <Check className="w-3 h-3" />}
                    {preset.name}
                  </button>
                ))}
              </div>
            )}

            {activeFilterType === "month" && (
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="w-full sm:w-1/2 flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-bold whitespace-nowrap">انتخاب ماه:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {SHAMSI_MONTHS.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-1/2 flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-bold whitespace-nowrap">انتخاب سال:</span>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    min={1380}
                    max={1450}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {activeFilterType === "custom" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500 font-bold block">از تاریخ (روز/ماه/سال شمسی):</span>
                  <input
                    type="text"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    placeholder="مثال: 1405/01/01"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-center text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500 font-bold block">تا تاریخ (روز/ماه/سال شمسی):</span>
                  <input
                    type="text"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    placeholder="مثال: 1405/05/11"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-center text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Info bar showing live calculation and search button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold">
              <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>سیستم فیلتر تاریخ فعال: </span>
              <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-mono">{liveLabel}</span>
            </div>

            <button
              onClick={handleSearchClick}
              disabled={customerSearchLoading}
              className="flex items-center justify-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-100 disabled:opacity-50 cursor-pointer whitespace-nowrap active:scale-98"
            >
              <Search className="w-4 h-4" />
              {customerSearchLoading ? "در حال دریافت اطلاعات..." : "اعمال فیلتر و جستجو"}
            </button>
          </div>
        </div>

        {/* Error messaging */}
        {customerSearchError && (
          <div className="mx-5 mt-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            {customerSearchError}
          </div>
        )}

        {/* Results Body */}
        <div className="flex-1 overflow-auto p-5 bg-slate-50/20">
          {customerSearchResults === null ? (
            <div className="text-center text-slate-400 text-xs py-12 flex flex-col items-center justify-center gap-2">
              <Search className="w-8 h-8 text-slate-300" />
              <span>نام مشتری موردنظر را تایپ کرده و بازه زمانی دلخواه را انتخاب کنید، سپس روی «اعمال فیلتر و جستجو» بزنید.</span>
            </div>
          ) : customerSearchResults.length === 0 ? (
            <div className="text-center text-slate-400 text-xs py-12 flex flex-col items-center justify-center gap-2">
              <Calendar className="w-8 h-8 text-slate-300" />
              <span>هیچ نتیجه‌ای برای «{customerSearchName}» در بازه {appliedPeriodLabel} پیدا نشد.</span>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Searched period summary card */}
              <div className="bg-indigo-50/80 border border-indigo-100 text-indigo-950 px-4 py-3 rounded-xl flex items-center justify-between gap-3 flex-wrap shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-indigo-900 block">بازه زمانی جستجو شده:</span>
                    <span className="text-xs text-indigo-700 font-extrabold">{appliedPeriodLabel || "نامشخص"}</span>
                  </div>
                </div>
                <div className="text-xs font-extrabold bg-white border border-indigo-200 text-indigo-900 px-3 py-1.5 rounded-lg shadow-2xs">
                  تعداد نتایج یافت‌شده: {customerSearchResults.length.toLocaleString("fa-IR")} مورد
                </div>
              </div>

              {/* Beautiful Card-based Stream of Results */}
              <div className="space-y-4">
                {customerSearchResults.map((r: any, idx: number) => {
                  const totalKg: number = Object.values(r.invoice.quantities || {}).reduce<number>(
                    (sum, q) => sum + (Number(q) || 0), 0
                  );

                  return (
                    <div
                      key={`${r.date}-${r.invoice.id}-${idx}`}
                      className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200/80 transition-all duration-200 overflow-hidden flex flex-col"
                    >
                      {/* Card Header: Date, Customer, Total Weight */}
                      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/30">
                        <div className="flex items-center gap-3">
                          {/* Calendar badge */}
                          <div className="bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-center shrink-0">
                            <span className="text-[10px] text-indigo-500 font-bold block leading-none mb-0.5">تاریخ ثبت</span>
                            <span className="text-xs font-mono font-extrabold text-indigo-900 leading-none">{r.date}</span>
                          </div>

                          <div>
                            <h4 className="text-sm sm:text-base font-black text-slate-900">
                              {r.invoice.customerName}
                            </h4>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                                شناسه سفارش: {r.invoice.id ? r.invoice.id.slice(0, 8) : "—"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Weight Badge */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-extrabold">مجموع وزن:</span>
                          <div className="bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 rounded-xl text-left shrink-0">
                            <span className="text-xs sm:text-sm font-mono font-black text-emerald-800">
                              {totalKg.toLocaleString("en-US")} <span className="text-[10px] font-bold">کیلوگرم</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Metadata Row: Driver, Destination, Round */}
                      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white text-xs border-b border-slate-50">
                        {/* Driver Badge */}
                        <div className="flex items-center gap-2.5 bg-slate-50/50 p-2 rounded-xl border border-slate-100/60">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block">راننده حامل</span>
                            <span className="font-extrabold text-slate-800">
                              {r.invoice.driverName || "تعیین نشده"}
                            </span>
                          </div>
                        </div>

                        {/* Destination Location */}
                        <div className="flex items-center gap-2.5 bg-slate-50/50 p-2 rounded-xl border border-slate-100/60">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] text-slate-400 font-bold block">مقصد و مسیر سفارش</span>
                            <span className="font-extrabold text-slate-800 truncate block">
                              {r.invoice.destinationLocation || "ثبت نشده"}
                            </span>
                          </div>
                        </div>

                        {/* Round */}
                        <div className="flex items-center gap-2.5 bg-slate-50/50 p-2 rounded-xl border border-slate-100/60">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block">نوبت توزیع سفارش</span>
                            <span className="font-extrabold text-indigo-700">
                              نوبت {r.invoice.round || 1}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Detail of products ordered */}
                      <div className="px-5 py-3.5 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-[11px] font-black text-slate-500 shrink-0">
                          اقلام فاکتور مشتری:
                        </span>
                        
                        <div className="flex flex-wrap gap-1.5">
                          {Object.keys(r.invoice.quantities || {}).length === 0 ? (
                            <span className="text-[11px] text-slate-400 font-bold">هیچ قلم کالایی در فاکتور یافت نشد.</span>
                          ) : (
                            Object.entries(r.invoice.quantities || {}).map(([pid, qty]) => {
                              const product = products.find(p => p.id === pid);
                              const prodName = product ? `${product.category} ${product.flavor}` : pid;
                              return (
                                <div
                                  key={pid}
                                  className="bg-white hover:border-slate-300 transition-colors px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-700 shadow-2xs"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                                  <span className="text-[11px] text-slate-800 font-extrabold">{prodName}:</span>
                                  <span className="font-mono text-indigo-700 font-black bg-indigo-50/60 px-1.5 py-0.5 rounded-md text-[11px]">
                                    {qty} <span className="text-[9px] font-medium font-sans">کارتن</span>
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
