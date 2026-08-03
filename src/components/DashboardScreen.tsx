import React from "react";
import { motion } from "motion/react";
import { Truck, TrendingUp, Package, Users, Trophy } from "lucide-react";

interface DashboardScreenProps {
  role: string | null;
  user: any;
  totalPlannedWeight: number;
  totalInitialStockWeight: number;
  totalSentDrivers: number;
  totalSentCustomers: number;
  totalSales30Days: number;
  totalIncoming30Days: number;
  top3Drivers: Array<[string, number]>;
  invoiceStats: { totalOrders: number };
  getTopTenProducts: () => any[];
  dashboardRightTab: "category_sales" | "stock";
  setDashboardRightTab: (tab: "category_sales" | "stock") => void;
  getCategorySalesAggregate: () => Record<string, any>;
  selectedCategorySales: string;
  setSelectedCategorySales: (cat: string) => void;
  getCategoryFlavorsRanking: (category: string) => any[];
  getCategoryAggregateStock: () => Record<string, any>;
  dashboardPeriodDays: number;
  setDashboardPeriodDays: (days: number) => void;
}
export function DashboardScreen({
  role,
  user,
  totalPlannedWeight,
  totalInitialStockWeight,
  totalSentDrivers,
  totalSentCustomers,
  totalSales30Days,
  totalIncoming30Days,
  top3Drivers,
  invoiceStats,
  getTopTenProducts,
  dashboardRightTab,
  setDashboardRightTab,
  getCategorySalesAggregate,
  selectedCategorySales,
  setSelectedCategorySales,
  getCategoryFlavorsRanking,
  getCategoryAggregateStock,
  dashboardPeriodDays,
  setDashboardPeriodDays,
}: DashboardScreenProps) {
  console.log("DashboardScreen role:", role);
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      {role === 'driver' && !user?.driverName && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-rose-800" dir="rtl">
          <div className="flex items-center gap-2.5">
            <Truck className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold leading-relaxed">
              ⚠️ هیچ راننده‌ای به حساب کاربری شما متصل نشده است. لطفا با مدیریت سامانه تماس بگیرید تا دسترسی شما را به راننده موردنظر پیوند دهد.
            </span>
          </div>
        </div>
      )}

      {role && role.toLowerCase().trim() === 'admin' && (
        <>
          {/* Period Selector */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-4 justify-between" dir="rtl">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-700">بازه زمانی آمار:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: "۳۰ روز گذشته", value: 30 },
                { label: "۲ ماه گذشته", value: 60 },
                { label: "۶ ماه گذشته", value: 180 },
                { label: "۱ سال گذشته", value: 365 },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDashboardPeriodDays(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dashboardPeriodDays === option.value
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
              <div className="flex items-center gap-2 mr-2 border-r border-slate-200 pr-4">
                <span className="text-xs text-slate-500 font-bold">دستی (روز):</span>
                <input
                  type="number"
                  min="1"
                  value={dashboardPeriodDays}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val > 0) {
                      setDashboardPeriodDays(val);
                    }
                  }}
                  className="w-16 px-2 py-1 border border-slate-300 rounded-md text-xs font-black text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block mb-1">وزن کل بارگیری امروز</span>
            <span className="text-2xl font-extrabold font-mono text-amber-600">
              {totalPlannedWeight.toLocaleString("en-US")} <span className="text-xs font-sans text-slate-400 mr-1">kg</span>
            </span>
          </div>
          <div className="bg-amber-50 border border-amber-200 text-amber-600 p-3 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block mb-1">کل موجودی انبار امروز</span>
            <span className="text-2xl font-extrabold font-mono text-emerald-600">
              {totalInitialStockWeight.toLocaleString("en-US")} <span className="text-xs font-sans text-slate-400 mr-1">kg</span>
            </span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 p-3 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block mb-1">تعداد رانندگان ارسالی امروز</span>
            <span className="text-2xl font-extrabold font-mono text-cyan-600">
              {totalSentDrivers.toLocaleString("en-US")} <span className="text-xs font-sans text-slate-500">راننده</span>
            </span>
          </div>
          <div className="bg-cyan-50 border border-cyan-200 text-cyan-600 p-3 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block mb-1">تعداد کل مشتریان ارسالی امروز</span>
            <span className="text-2xl font-extrabold font-mono text-cyan-600">
              {totalSentCustomers.toLocaleString("en-US")} <span className="text-xs font-sans text-slate-500">مشتری</span>
            </span>
          </div>
          <div className="bg-cyan-50 border border-cyan-200 text-cyan-600 p-3 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block mb-1">حجم کل فروش {dashboardPeriodDays} روز گذشته</span>
            <span className="text-2xl font-extrabold font-mono text-indigo-600">
              {Math.round(totalSales30Days).toLocaleString("en-US")} <span className="text-xs font-sans text-slate-400 mr-1">kg</span>
            </span>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-600 p-3 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block mb-1">حجم کل ورودی {dashboardPeriodDays} روز گذشته</span>
            <span className="text-2xl font-extrabold font-mono text-emerald-600">
              {Math.round(totalIncoming30Days).toLocaleString("en-US")} <span className="text-xs font-sans text-slate-400 mr-1">kg</span>
            </span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 p-3 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block mb-1">برترین رانندگان (۳۰ روز)</span>
            <div className="text-sm font-semibold text-slate-800 mt-2 space-y-1">
              {top3Drivers.map(([name, count], idx) => (
                <div key={name} className="flex justify-between gap-4">
                  <span>{idx + 1}. {name}</span>
                  <span className="font-mono text-cyan-600">{count} تعداد کل مسیرها</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-cyan-50 border border-cyan-200 text-cyan-600 p-3 rounded-xl self-start">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block mb-1">تعداد کل سفارشات مشتریان (۳۰ روز)</span>
            <span className="text-2xl font-extrabold font-mono text-cyan-600">
              {invoiceStats.totalOrders.toLocaleString("en-US")}
            </span>
          </div>
          <div className="bg-cyan-50 border border-cyan-200 text-cyan-600 p-3 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-3 mb-4 gap-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-800">
                  ۱۰ محصول پرفروش انبار ({dashboardPeriodDays} روز گذشته)
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-0.5 rounded-full font-bold">
                  رتبه‌بندی کلی تمام کالاها و طعم‌ها
                </span>
              </div>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
              {getTopTenProducts().map((item: any, idx: number) => {
                const maxSales = Math.max(...getTopTenProducts().map((i: any) => i.totalSales), 1);
                const percent = (item.totalSales / maxSales) * 100;
                const rank = idx + 1;
                
                let rankBadgeClass = "bg-slate-100 text-slate-700";
                if (rank === 1) rankBadgeClass = "bg-gradient-to-tr from-amber-400 to-yellow-500 text-white shadow-sm ring-2 ring-yellow-300";
                else if (rank === 2) rankBadgeClass = "bg-gradient-to-tr from-slate-300 to-slate-400 text-white shadow-sm ring-2 ring-slate-200";
                else if (rank === 3) rankBadgeClass = "bg-gradient-to-tr from-amber-600 to-amber-700 text-white shadow-sm ring-2 ring-amber-500";

                const cat = item.category;
                let barGradient = "from-cyan-500 to-blue-500";
                let catBadgeStyle = "bg-slate-100 text-slate-500 border-slate-200";
                
                if (cat === "بادام زمینی") {
                  barGradient = "from-amber-500 to-amber-600";
                  catBadgeStyle = "bg-amber-50 text-amber-700 border-amber-100";
                } else if (cat === "بادام هندی") {
                  barGradient = "from-yellow-400 to-yellow-600";
                  catBadgeStyle = "bg-yellow-50 text-yellow-700 border-yellow-100";
                } else if (cat === "آفتابگردان") {
                  barGradient = "from-orange-400 to-orange-500";
                  catBadgeStyle = "bg-orange-50 text-orange-700 border-orange-100";
                } else if (cat === "سویا") {
                  barGradient = "from-emerald-500 to-emerald-600";
                  catBadgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-100";
                } else if (cat === "ذرت کبابی") {
                  barGradient = "from-red-400 to-red-500";
                  catBadgeStyle = "bg-red-50 text-red-700 border-red-100";
                } else if (cat && cat.includes("اسنک")) {
                  barGradient = "from-indigo-500 to-cyan-500";
                  catBadgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-100";
                }

                return (
                  <div key={item.product.id} className="space-y-1.5 bg-slate-50/50 hover:bg-slate-50 p-2.5 rounded-xl transition-all border border-transparent hover:border-slate-100">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 flex items-center justify-center rounded-lg text-[10px] font-extrabold font-mono shrink-0 ${rankBadgeClass}`}>
                          {rank}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-slate-800 font-bold leading-tight">{item.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold self-start mt-0.5 leading-none ${catBadgeStyle}`}>
                            {item.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.todayWeight > 0 && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded font-mono animate-pulse shrink-0">
                            امروز: +{item.todayWeight.toLocaleString("en-US")} kg
                          </span>
                        )}
                        <span className="text-slate-500 font-mono">
                          <strong className="text-slate-800 font-extrabold">{item.totalSales.toLocaleString("en-US")}</strong> <span className="text-[10px] text-slate-400">kg</span>
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className={`bg-gradient-to-r ${barGradient} h-full rounded-full transition-all duration-500`}
                      />
                    </div>
                  </div>
                );
              })}
              {getTopTenProducts().length === 0 && (
                <p className="text-center text-slate-400 text-xs py-12">هیچ کالایی بارگذاری نشده است.</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex border-b border-slate-100 pb-3 mb-4 gap-4 justify-start">
              <button
                onClick={() => setDashboardRightTab("category_sales")}
                className={`text-xs font-extrabold pb-1.5 transition-all border-b-2 shrink-0 ${
                  dashboardRightTab === "category_sales"
                    ? "text-cyan-600 border-cyan-500"
                    : "text-slate-400 border-transparent hover:text-slate-600"
                }`}
              >
                تحلیل فروش تجمعی و طعم‌ها
              </button>
              <button
                onClick={() => setDashboardRightTab("stock")}
                className={`text-xs font-extrabold pb-1.5 transition-all border-b-2 shrink-0 ${
                  dashboardRightTab === "stock"
                    ? "text-emerald-600 border-emerald-500"
                    : "text-slate-400 border-transparent hover:text-slate-600"
                }`}
              >
                موجودی انبار (باقیمانده امروز)
              </button>
            </div>

            {dashboardRightTab === "category_sales" ? (
              <div>
                <div className="text-slate-500 text-[10px] font-bold mb-1.5 px-0.5">انتخاب گروه کالا جهت مشاهده رتبه‌بندی طعم‌ها:</div>
                <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-thin scrollbar-thumb-slate-200">
                  {Object.entries(getCategorySalesAggregate()).map(([cat, info]: any) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategorySales(cat)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 flex items-center gap-1.5 border ${
                        selectedCategorySales === cat
                          ? "bg-cyan-50 border-cyan-200 text-cyan-700 shadow-sm font-extrabold"
                          : "bg-slate-50/70 border-slate-100 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      }`}
                    >
                      <span>{cat}</span>
                      <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-mono font-bold ${
                        selectedCategorySales === cat ? "bg-cyan-200 text-cyan-800" : "bg-slate-200 text-slate-500"
                      }`}>
                        {info.totalSales.toLocaleString("en-US")} kg
                      </span>
                    </button>
                  ))}
                </div>

                <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                  <div className="text-slate-400 text-[10px] font-bold flex justify-between px-0.5">
                    <span>رتبه‌بندی طعم‌های {selectedCategorySales} (۳۰ روز اخیر)</span>
                    <span>کل فروش</span>
                  </div>
                  {getCategoryFlavorsRanking(selectedCategorySales).map((flavorItem: any, idx: number) => {
                    const maxFlavorSales = Math.max(...getCategoryFlavorsRanking(selectedCategorySales).map((f: any) => f.totalSales), 1);
                    const percent = (flavorItem.totalSales / maxFlavorSales) * 100;
                    const rank = idx + 1;
                    
                    let rankBadgeClass = "bg-slate-100 text-slate-600";
                    if (rank === 1) rankBadgeClass = "bg-amber-400 text-white shadow-sm ring-1 ring-amber-300";
                    else if (rank === 2) rankBadgeClass = "bg-slate-400 text-white shadow-sm ring-1 ring-slate-300";
                    else if (rank === 3) rankBadgeClass = "bg-amber-600 text-white shadow-sm ring-1 ring-amber-500";

                    return (
                      <div key={flavorItem.product.id} className="bg-slate-50/40 hover:bg-slate-50 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-all space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 flex items-center justify-center rounded-lg text-[10px] font-mono font-extrabold ${rankBadgeClass}`}>
                              {rank}
                            </span>
                            <span className="text-slate-800 font-bold">{flavorItem.flavorName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {flavorItem.todayWeight > 0 && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded font-mono animate-pulse shrink-0">
                                امروز: +{flavorItem.todayWeight.toLocaleString("en-US")} kg
                              </span>
                            )}
                            <span className="text-slate-700 font-mono font-bold">
                              {flavorItem.totalSales.toLocaleString("en-US")} <span className="text-[10px] text-slate-400 font-normal">kg</span>
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200/50 h-1.5 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${percent}%` }}
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                  {getCategoryFlavorsRanking(selectedCategorySales).length === 0 && (
                    <p className="text-center text-slate-400 text-xs py-8">طعم برای این کالا تعریف نشده است.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-slate-400 text-[10px] font-bold mb-1.5 px-0.5">وضعیت باقیمانده موجودی فیزیکی در انبار:</div>
                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                  {Object.entries(getCategoryAggregateStock()).map(([cat, info]: any) => {
                    const percent = info.totalStock > 0 ? (info.totalRemaining / info.totalStock) * 100 : 0;
                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-700 font-bold">{cat}</span>
                          <span className="text-slate-500 font-mono">
                            <strong className="text-emerald-700 font-extrabold">{info.totalRemaining.toLocaleString("en-US")}</strong>
                            <span className="text-slate-400"> / {info.totalStock.toLocaleString("en-US")}</span> <span className="text-sans text-[10px]">kg</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                            className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(getCategoryAggregateStock()).length === 0 && (
                    <p className="text-center text-slate-400 text-xs py-8">هیچ کالایی تعریف نشده است.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
