import React, { useState, useMemo } from "react";
import { Product } from "../types";
import { 
  Calculator, 
  ShoppingCart, 
  Printer, 
  Filter, 
  Search, 
  AlertCircle, 
  Info, 
  PackageOpen,
  ArrowUpRight
} from "lucide-react";

interface StockForecastScreenProps {
  products: Product[];
  getProductStock: (productId: string, defaultStock: number) => number;
  allocatedQuantities: { [productId: string]: number };
  getProductSalesInPeriod: (p: Product, days: number) => number;
}

export const StockForecastScreen: React.FC<StockForecastScreenProps> = ({
  products,
  getProductStock,
  allocatedQuantities,
  getProductSalesInPeriod
}) => {
  // Configurable parameters
  const [coverageDays, setCoverageDays] = useState<number>(15);
  const [safetyDays, setSafetyDays] = useState<number>(3);
  const [averageDays, setAverageDays] = useState<number>(30);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Get unique categories for dropdown filter
  const categories = useMemo(() => {
    return ["all", ...Array.from(new Set(products.map(p => p.category)))];
  }, [products]);

  // Main forecast calculations
  const forecastData = useMemo(() => {
    return products.map(product => {
      // 1. Current remaining stock
      const startingStockKg = getProductStock(product.id, product.defaultStock);
      const allocatedTodayKg = allocatedQuantities[product.id] || 0;
      const remainingStockKg = Math.max(0, startingStockKg - allocatedTodayKg);

      // 2. Sales in the selected period
      const totalSalesInPeriodKg = getProductSalesInPeriod(product, averageDays);
      
      // 3. Daily average sales in kg
      const dailyAverageKgRaw = totalSalesInPeriodKg / averageDays;
      const dailyAverageKg = Number(dailyAverageKgRaw.toFixed(1));

      // 4. Current coverage in days
      let coverageInDays = 0;
      if (dailyAverageKgRaw > 0) {
        coverageInDays = Number((remainingStockKg / dailyAverageKgRaw).toFixed(1));
      } else if (remainingStockKg > 0) {
        coverageInDays = 999;
      }

      // 5. Target stock needed
      const targetStockKg = Math.ceil(dailyAverageKgRaw * coverageDays);

      // 6. Suggested purchase quantity
      const suggestedPurchaseKg = remainingStockKg < targetStockKg ? targetStockKg - remainingStockKg : 0;

      // 7. Determine status
      let status: "critical" | "warning" | "sufficient" = "sufficient";
      if (dailyAverageKgRaw > 0) {
        if (coverageInDays <= safetyDays) {
          status = "critical";
        } else if (coverageInDays < coverageDays) {
          status = "warning";
        }
      } else {
        if (remainingStockKg === 0) {
          status = "warning";
        } else {
          status = "sufficient";
        }
      }

      // 8. Carton conversions for display helper
      const divider = product.realCartonWeight && product.realCartonWeight > 0 ? product.realCartonWeight : product.unitWeight;
      const remainingStockCartons = divider > 0 ? Math.round(remainingStockKg / divider) : 0;
      const totalSalesInPeriodCartons = divider > 0 ? Math.round(totalSalesInPeriodKg / divider) : 0;
      const dailyAverageCartons = divider > 0 ? Number((dailyAverageKgRaw / divider).toFixed(2)) : 0;
      const targetStockCartons = divider > 0 ? Math.ceil(targetStockKg / divider) : 0;
      const suggestedPurchaseCartons = divider > 0 ? Math.ceil(suggestedPurchaseKg / divider) : 0;

      return {
        product,
        remainingStockKg,
        remainingStockCartons,
        totalSalesInPeriodKg,
        totalSalesInPeriodCartons,
        dailyAverageKg,
        dailyAverageCartons,
        coverageInDays,
        targetStockKg,
        targetStockCartons,
        suggestedPurchaseKg,
        suggestedPurchaseCartons,
        status
      };
    });
  }, [products, getProductStock, allocatedQuantities, getProductSalesInPeriod, coverageDays, safetyDays, averageDays]);

  // Filtered forecast data
  const filteredData = useMemo(() => {
    return forecastData.filter(item => {
      const matchesSearch = 
        item.product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product.flavor.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === "all" || item.product.category === selectedCategory;

      const matchesStatus = 
        statusFilter === "all" ||
        (statusFilter === "critical" && item.status === "critical") ||
        (statusFilter === "warning" && item.status === "warning") ||
        (statusFilter === "needs_purchase" && item.suggestedPurchaseKg > 0) ||
        (statusFilter === "sufficient" && item.status === "sufficient");

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [forecastData, searchTerm, selectedCategory, statusFilter]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalNeedingPurchase = forecastData.filter(item => item.suggestedPurchaseKg > 0).length;
    const criticalCount = forecastData.filter(item => item.status === "critical").length;
    const warningCount = forecastData.filter(item => item.status === "warning").length;
    
    const totalSuggestedWeight = forecastData.reduce((sum, item) => sum + item.suggestedPurchaseKg, 0);
    const totalRemainingWeight = forecastData.reduce((sum, item) => sum + item.remainingStockKg, 0);

    return {
      totalNeedingPurchase,
      criticalCount,
      warningCount,
      totalSuggestedWeight,
      totalRemainingWeight
    };
  }, [forecastData]);

  // Quick print handler
  const handlePrint = () => {
    const printStyle = document.createElement("style");
    printStyle.innerHTML = `
      @media print {
        body * {
          visibility: hidden;
        }
        #print-forecast-section, #print-forecast-section * {
          visibility: visible;
        }
        #print-forecast-section {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          direction: rtl;
        }
        .no-print-element {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(printStyle);
    window.print();
    document.head.removeChild(printStyle);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Tab Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-cyan-600" />
            <h2 className="text-lg font-extrabold text-slate-900">پیش‌بینی هوشمند نیاز و تأمین انبار</h2>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs rounded-xl shadow-md transition shrink-0 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          چاپ گزارش لیست خرید پیشنهادی
        </button>
      </div>

      {/* Control Panel / Parameters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coverage Days */}
        <div>
          <label className="block text-xs font-black text-slate-700 mb-2.5 flex justify-between">
            <span>دوره پوشش انبار هدف (پیش‌بینی خرید برای چند روز آینده؟)</span>
            <span className="text-cyan-700 font-bold bg-cyan-50 px-2 py-0.5 rounded-md font-mono">{coverageDays} روز</span>
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="5"
              max="60"
              step="1"
              value={coverageDays}
              onChange={(e) => setCoverageDays(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-cyan-600"
            />
            <div className="flex gap-1 shrink-0">
              <button 
                onClick={() => setCoverageDays(7)} 
                className={`px-2 py-1 text-[10px] font-bold rounded ${coverageDays === 7 ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                ۷ روزه
              </button>
              <button 
                onClick={() => setCoverageDays(15)} 
                className={`px-2 py-1 text-[10px] font-bold rounded ${coverageDays === 15 ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                ۱۵ روزه
              </button>
              <button 
                onClick={() => setCoverageDays(30)} 
                className={`px-2 py-1 text-[10px] font-bold rounded ${coverageDays === 30 ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                ۳۰ روزه
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">
            * سامانه بررسی می‌کند که موجودی فعلی، پاسخگوی چند روز فروش متوسط خواهد بود و مابه‌التفاوت آن تا هدف فوق را برای خرید پیشنهاد می‌دهد.
          </p>
        </div>

        {/* Safety Days */}
        <div>
          <label className="block text-xs font-black text-slate-700 mb-2.5 flex justify-between">
            <span>حاشیه امنیت بحرانی انبار (هشدار قرمز برای چند روز موجودی؟)</span>
            <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md font-mono">{safetyDays} روز</span>
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={safetyDays}
              onChange={(e) => setSafetyDays(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-rose-600"
            />
            <div className="flex gap-1 shrink-0">
              <button 
                onClick={() => setSafetyDays(2)} 
                className={`px-2 py-1 text-[10px] font-bold rounded ${safetyDays === 2 ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                ۲ روزه
              </button>
              <button 
                onClick={() => setSafetyDays(3)} 
                className={`px-2 py-1 text-[10px] font-bold rounded ${safetyDays === 3 ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                ۳ روزه
              </button>
              <button 
                onClick={() => setSafetyDays(5)} 
                className={`px-2 py-1 text-[10px] font-bold rounded ${safetyDays === 5 ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                ۵ روزه
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">
            * اگر موجودی باقیمانده محصولی کمتر از فروش متوسط این تعداد روز باشد، برچسب "وضعیت بحرانی" دریافت خواهد کرد.
          </p>
        </div>

        {/* Average Days */}
        <div>
          <label className="block text-xs font-black text-slate-700 mb-2.5 flex justify-between">
            <span>تعداد روزهای میانگین‌گیری فروش (محاسبه میانگین فروش بر اساس چند روز گذشته؟)</span>
            <span className="text-cyan-700 font-bold bg-cyan-50 px-2 py-0.5 rounded-md font-mono">{averageDays} روز</span>
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="7"
              max="90"
              step="1"
              value={averageDays}
              onChange={(e) => setAverageDays(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-cyan-600"
            />
            <div className="flex gap-1 shrink-0">
              <button 
                onClick={() => setAverageDays(7)} 
                className={`px-2 py-1 text-[10px] font-bold rounded ${averageDays === 7 ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                ۷ روز
              </button>
              <button 
                onClick={() => setAverageDays(15)} 
                className={`px-2 py-1 text-[10px] font-bold rounded ${averageDays === 15 ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                ۱۵ روز
              </button>
              <button 
                onClick={() => setAverageDays(30)} 
                className={`px-2 py-1 text-[10px] font-bold rounded ${averageDays === 30 ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                ۳۰ روز
              </button>
              <button 
                onClick={() => setAverageDays(45)} 
                className={`px-2 py-1 text-[10px] font-bold rounded ${averageDays === 45 ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                ۴۵ روز
              </button>
              <button 
                onClick={() => setAverageDays(60)} 
                className={`px-2 py-1 text-[10px] font-bold rounded ${averageDays === 60 ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                ۶۰ روز
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">
            * میانگین فروش روزانه بر اساس فروش کل این تعداد روز گذشته محاسبه می‌شود.
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-lg text-amber-600">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">کالاهای نیازمند خرید</span>
            <span className="text-xl font-extrabold text-slate-900 font-mono mt-1 block">
              {summaryStats.totalNeedingPurchase} <span className="text-xs font-sans font-bold text-slate-400">کالا</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-rose-50 p-3 rounded-lg text-rose-600">
            <AlertCircle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">وضعیت بحرانی (اتمام زودرس)</span>
            <span className="text-xl font-extrabold text-slate-900 font-mono mt-1 block">
              {summaryStats.criticalCount} <span className="text-xs font-sans font-bold text-slate-400">مورد</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-cyan-50 p-3 rounded-lg text-cyan-600">
            <PackageOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">کل موجودی فعلی انبار</span>
            <span className="text-xl font-extrabold text-slate-900 font-mono mt-1 block">
              {summaryStats.totalRemainingWeight.toLocaleString()} <span className="text-xs font-sans font-bold text-slate-400">کیلوگرم</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">کل سفارش خرید پیشنهادی</span>
            <span className="text-xl font-extrabold text-slate-900 font-mono mt-1 block">
              {summaryStats.totalSuggestedWeight.toLocaleString()} <span className="text-xs font-sans font-bold text-slate-400">کیلوگرم</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="جستجو در نام طعم یا دسته‌بندی کالا..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition placeholder-slate-400 font-semibold text-slate-700"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">همه دسته‌بندی‌ها</option>
              {categories.filter(c => c !== "all").map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status Select Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition cursor-pointer ${
                statusFilter === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              همه کالاها
            </button>
            <button
              onClick={() => setStatusFilter("needs_purchase")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition cursor-pointer ${
                statusFilter === "needs_purchase" ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              نیازمند خرید ({summaryStats.totalNeedingPurchase})
            </button>
            <button
              onClick={() => setStatusFilter("critical")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition cursor-pointer ${
                statusFilter === "critical" ? "bg-white text-rose-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              بحرانی ({summaryStats.criticalCount})
            </button>
            <button
              onClick={() => setStatusFilter("sufficient")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition cursor-pointer ${
                statusFilter === "sufficient" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              کافی
            </button>
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div id="print-forecast-section" className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Printable Only Header */}
        <div className="hidden print:block p-6 border-b border-slate-200 text-center">
          <h1 className="text-xl font-extrabold text-slate-900">گزارش سفارش خرید پیشنهادی و وضعیت پوشش انبار</h1>
          <p className="text-xs text-slate-500 mt-2">
            مبنای محاسبه: میانگین فروش {averageDays} روزه با هدف تامین پوشش انبار برای {coverageDays} روز و حاشیه امنیت بحرانی {safetyDays} روز (تمامی مقادیر به کیلوگرم می‌باشد)
          </p>
          <p className="text-[10px] text-slate-400 mt-1 font-mono">تاریخ گزارش‌گیری: {new Date().toLocaleDateString('fa-IR')}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-700 font-bold text-xs">
                <th className="p-4">مشخصات کالا</th>
                <th className="p-4 text-center">فروش {averageDays} روزه (کیلوگرم)</th>
                <th className="p-4 text-center">میانگین فروش روزانه (کیلوگرم)</th>
                <th className="p-4 text-center">موجودی فعلی (کیلوگرم)</th>
                <th className="p-4 text-center">روزهای پوشش فعلی</th>
                <th className="p-4 text-center">حداقل هدف انبار ({coverageDays} روز / کیلوگرم)</th>
                <th className="p-4 text-center text-cyan-800 bg-cyan-50/50">پیشنهاد خرید (کیلوگرم)</th>
                <th className="p-4 text-center no-print-element">وضعیت بحرانی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
              {filteredData.map((item) => (
                <tr key={item.product.id} className="hover:bg-slate-50/50 transition">
                  {/* Product details */}
                  <td className="p-4">
                    <div>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                        {item.product.category}
                      </span>
                      <div className="font-extrabold text-slate-950 mt-1">
                        {item.product.flavor}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                        واحد: {item.product.unitWeight} کیلویی
                      </div>
                    </div>
                  </td>

                  {/* Period Sales */}
                  <td className="p-4 text-center font-mono">
                    <div>{item.totalSalesInPeriodKg.toLocaleString()} <span className="text-[10px] text-slate-400">کیلو</span></div>
                    {item.totalSalesInPeriodCartons > 0 && (
                      <div className="text-[10px] text-slate-400 font-bold font-sans mt-0.5">
                        {item.totalSalesInPeriodCartons.toLocaleString()} کارتن
                      </div>
                    )}
                  </td>

                  {/* Daily Average */}
                  <td className="p-4 text-center font-mono text-slate-600">
                    <div>{item.dailyAverageKg.toLocaleString()} <span className="text-[10px] text-slate-400">کیلو / روز</span></div>
                    {item.dailyAverageCartons > 0 && (
                      <div className="text-[10px] text-slate-400 font-bold font-sans mt-0.5">
                        ~ {item.dailyAverageCartons.toLocaleString()} کارتن / روز
                      </div>
                    )}
                  </td>

                  {/* Current Available Stock */}
                  <td className="p-4 text-center">
                    <div>
                      <span className={`font-mono font-bold ${item.remainingStockKg === 0 ? "text-rose-600" : "text-slate-800"}`}>
                        {item.remainingStockKg.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium mr-1">کیلو</span>
                    </div>
                    {item.remainingStockCartons > 0 && (
                      <div className="text-[10px] text-slate-400 font-bold font-sans mt-0.5">
                        {item.remainingStockCartons.toLocaleString()} کارتن
                      </div>
                    )}
                  </td>

                  {/* Coverage in days */}
                  <td className="p-4 text-center">
                    {item.dailyAverageKg === 0 ? (
                      <span className="text-slate-400 text-[10px] font-medium">بدون فروش فعال</span>
                    ) : (
                      <span className={`font-mono px-2 py-1 rounded-lg text-[10px] font-bold ${
                        item.coverageInDays <= safetyDays ? "bg-rose-50 text-rose-700" :
                        item.coverageInDays < coverageDays ? "bg-amber-50 text-amber-700" :
                        "bg-emerald-50 text-emerald-700"
                      }`}>
                        {item.coverageInDays === 999 ? "∞" : `${item.coverageInDays} روز`}
                      </span>
                    )}
                  </td>

                  {/* Target Stock */}
                  <td className="p-4 text-center font-mono text-slate-500">
                    <div>{item.targetStockKg.toLocaleString()} <span className="text-[10px] text-slate-400">کیلو</span></div>
                    {item.targetStockCartons > 0 && (
                      <div className="text-[10px] text-slate-400 font-bold font-sans mt-0.5">
                        {item.targetStockCartons.toLocaleString()} کارتن
                      </div>
                    )}
                  </td>

                  {/* Suggested Purchase */}
                  <td className="p-4 text-center bg-cyan-50/40">
                    {item.suggestedPurchaseKg > 0 ? (
                      <div>
                        <span className="font-mono font-black text-cyan-700 text-sm">
                          {item.suggestedPurchaseKg.toLocaleString()} <span className="text-[10px] font-sans font-bold text-cyan-600">کیلوگرم</span>
                        </span>
                        {item.suggestedPurchaseCartons > 0 && (
                          <div className="text-[10px] text-cyan-600 font-bold font-sans mt-0.5">
                            سفارش: {item.suggestedPurchaseCartons.toLocaleString()} کارتن
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 font-medium">عدم نیاز (کافی)</span>
                    )}
                  </td>

                  {/* Urgency Badge */}
                  <td className="p-4 text-center no-print-element">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                      item.status === "critical" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                      item.status === "warning" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                      "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        item.status === "critical" ? "bg-rose-500 animate-pulse" :
                        item.status === "warning" ? "bg-amber-500" :
                        "bg-emerald-500"
                      }`} />
                      {item.status === "critical" ? "بحرانی" :
                       item.status === "warning" ? "رو به اتمام" : "پوشش کافی"}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center gap-2">
                      <PackageOpen className="w-8 h-8 text-slate-300" />
                      <span>هیچ کالایی با فیلترهای انتخاب‌شده یافت نشد.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Printable Only Signature */}
        <div className="hidden print:flex justify-between items-center p-8 border-t border-slate-200 text-xs font-bold text-slate-600 mt-12">
          <div>امضای مسئول انبار و تامین: ................................</div>
          <div>تاییدیه مدیریت توزیع و فروش: ................................</div>
        </div>
      </div>

      {/* Info Notice Box */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
        <div className="text-[10px] text-slate-500 leading-relaxed">
          <span className="font-extrabold text-slate-700 block mb-1">راهنمای فرمول محاسبات پیش‌بینی انبار:</span>
          ۱. <span className="font-bold text-slate-700">فروش متوسط روزانه (کیلوگرم)</span>: مجموع وزن کل فروش {averageDays} روز گذشته هر کالا (توزیع شده در فاکتورهای فعال ثبت شده سیستم) تقسیم بر {averageDays} محاسبه می‌شود.
          <br />
          ۲. <span className="font-bold text-slate-700">موجودی باقیمانده فعلی (کیلوگرم)</span>: وزن موجودی آغازین انبار برای روز فعال، منهای بارهای بارگیری شده ردیف‌های فعال امروز.
          <br />
          ۳. <span className="font-bold text-slate-700">روزهای پوشش انبار</span>: مشخص می‌کند موجودی فعلی تا چند روز آینده کفاف فروش متوسط را می‌دهد (وزن موجودی باقیمانده تقسیم بر وزن فروش متوسط روزانه).
          <br />
          ۴. <span className="font-bold text-slate-700">پیشنهاد خرید (کیلوگرم)</span>: در صورتی که روزهای پوشش کمتر از دوره پوشش هدف باشد، تفاوت وزن موجودی باقیمانده تا حداقل وزن موجودی هدف مورد نیاز برای کل دوره پوشش، به عنوان سفارش خرید پیشنهاد می‌شود.
          <br />
          <span className="font-bold text-cyan-700 block mt-2">* تمامی شاخص‌ها و مقادیر در این بخش به منظور تطابق مستقیم با ظرفیت‌سنجی فیزیکی و تناژ حمل‌ونقل کالا بر حسب کیلوگرم (کیلو) نمایش داده شده‌اند و واحد کارتن از فرآیند پیش‌بینی حذف گردیده است.</span>
        </div>
      </div>
    </div>
  );
};