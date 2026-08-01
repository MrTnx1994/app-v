import React from "react";
import { motion } from "motion/react";
import { Truck, Printer } from "lucide-react";
import { InvoiceRun, Driver, Product } from "../types";
import { getDriverAccentClasses, getCustomerPillClasses } from "../utils/colorPresets";

interface DriversScreenProps {
  role: string | null;
  visibleInvoices: InvoiceRun[];
  drivers: Driver[];
  validProducts: Product[];
  driverSearchSlots: string[];
  setActiveTab: (tab: string) => void;
  setPrintDriverName: (driverName: string | null) => void;
  setDriverPrintPreview: (show: boolean) => void;
}

export function DriversScreen({
  role,
  visibleInvoices,
  drivers,
  validProducts,
  driverSearchSlots,
  setActiveTab,
  setPrintDriverName,
  setDriverPrintPreview,
}: DriversScreenProps) {
  const activeSearchDrivers: string[] = Array.from(
    new Set(
      visibleInvoices
        .filter((inv) => inv.isActive !== false && inv.driverName && inv.driverName.trim() !== "")
        .map((inv) => inv.driverName.trim())
    )
  );

  if (activeSearchDrivers.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        className="space-y-6"
      >
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-2xl mx-auto text-center space-y-6 shadow-sm my-8">
          <div className="bg-orange-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-orange-600 border border-orange-100">
            <Truck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-900">هیچ راننده‌ای در سفرهای فعال امروز تعیین نشده است</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              برگه‌های بارگیری رانندگان به صورت کاملاً خودکار بر اساس رانندگان انتخاب شده در سفرهای تب برنامه‌ریزی صادر می‌شوند.
            </p>
          </div>
          
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 text-right text-xs text-slate-700 space-y-3 font-medium">
            <div className="flex items-start gap-2.5">
              <span className="bg-orange-100 text-orange-800 w-5 h-5 rounded-full flex items-center justify-center font-extrabold shrink-0 mt-0.5 text-[10px]">۱</span>
              <p>به تب <span className="font-extrabold text-cyan-700 cursor-pointer hover:underline" onClick={() => setActiveTab("planning")}>"برنامه‌ریزی و فروش"</span> مراجعه کنید.</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="bg-orange-100 text-orange-800 w-5 h-5 rounded-full flex items-center justify-center font-extrabold shrink-0 mt-0.5 text-[10px]">۲</span>
              <p>در بالای ستون‌های مربوط به حواله‌ها (سفر ۱، سفر ۲ و ...)، راننده مسئول هر سفر را انتخاب نمایید.</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="bg-orange-100 text-orange-800 w-5 h-5 rounded-full flex items-center justify-center font-extrabold shrink-0 mt-0.5 text-[10px]">۳</span>
              <p>با بازگشت به این تب، برگه‌های تفکیک‌شده بارگیری هر راننده با حذف خودکار تمامی ردیف‌های دارای مقدار صفر در اختیارتان خواهد بود.</p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4 print:hidden">
        <div>
          <h2 className="text-lg font-black text-slate-900">برگه‌های بارگیری و خروج رانندگان</h2>
          <p className="text-xs text-slate-500 mt-1">برگه‌های تفکیک‌شده خروج کالا با فیلتر خودکار فیلدهای صفر</p>
        </div>
        <div className="flex gap-3">
          {role !== 'driver' && (
            <button
              onClick={() => {
                setPrintDriverName(null);
                setDriverPrintPreview(true);
              }}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl transition cursor-pointer text-xs flex items-center gap-2 shadow-md"
            >
              <Printer className="w-4 h-4" />
              چاپ همه‌ی برگه‌های خروج
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeSearchDrivers.map((drvName) => {
          const drvRuns = visibleInvoices.filter((i) => i.driverName === drvName && i.isActive !== false);
          const drvMeta = drivers.find((d) => d.name === drvName);
          const vehicleType = drvMeta?.vehicle || "نیسان";
          const capacity = drvMeta?.capacity || 2000;

          const loadedItems = validProducts.map((p) => {
            const qty = drvRuns.reduce((sum, inv) => sum + (Number(inv.quantities[p.id]) || 0), 0);
            const divider = p.realCartonWeight && p.realCartonWeight > 0 ? p.realCartonWeight : p.unitWeight;
            const cartons = divider > 0 ? qty / divider : 0;
            const actualWeight = qty;
            return { product: p, qty, cartons, actualWeight };
          }).filter(item => item.qty > 0);

          const totalWeight = loadedItems.reduce((sum, item) => sum + item.actualWeight, 0);
          const totalCartons = loadedItems.reduce((sum, item) => sum + item.cartons, 0);
          const capacityPct = Math.min((totalWeight / capacity) * 100, 100);

          const slotsUsed: string[] = [];
          driverSearchSlots.forEach((slotName, sIdx) => {
            if (slotName === drvName) {
              slotsUsed.push(`جستجو ${sIdx + 1}`);
            }
          });

          return (
            <div key={drvName} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-lg overflow-hidden relative transition-all duration-300 flex flex-col justify-between">
              <div className={`h-1.5 w-full bg-gradient-to-l ${getDriverAccentClasses(drvName, drivers).gradient}`} />

              <div className="p-5 space-y-4">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${getDriverAccentClasses(drvName, drivers).gradient} text-white shadow-md`}>
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-base">{drvName}</h3>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">نوع ماشین: {vehicleType}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] font-black px-2 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg block text-center">
                      {slotsUsed.join(" / ")}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                    <span>ظرفیت بارگیری</span>
                    <span className={`font-mono font-black ${capacityPct >= 90 ? "text-rose-600" : capacityPct >= 70 ? "text-amber-600" : "text-emerald-600"}`}>
                      {capacityPct.toLocaleString("en-US", { maximumFractionDigits: 0 })}٪ از {capacity.toLocaleString("en-US")} کیلو
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        capacityPct >= 90 ? "bg-gradient-to-l from-rose-400 to-rose-600" : capacityPct >= 70 ? "bg-gradient-to-l from-amber-400 to-amber-600" : "bg-gradient-to-l from-emerald-400 to-emerald-600"
                      }`}
                      style={{ width: `${Math.max(capacityPct, 3)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-gradient-to-br from-slate-50 to-slate-100/60 p-3 rounded-xl border border-slate-200/70 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5 font-bold">وزن کل بارگیری</span>
                    <span className="font-bold font-mono text-cyan-700 text-xs">
                      {totalWeight.toLocaleString("en-US")} <span className="text-[9px] font-sans">کیلوگرم</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5 font-bold">کل کارتن / بسته</span>
                    <span className="font-bold font-mono text-emerald-700 text-xs">
                      {totalCartons.toLocaleString("en-US", { maximumFractionDigits: 1 })}
                      <span className="text-[9px] font-sans mr-1">کارتن</span>
                    </span>
                  </div>
                  <div className="border-t border-slate-200/60 pt-2 col-span-2 flex justify-between text-[11px] font-extrabold">
                    <span>تعداد مشتریان: <span className="text-cyan-800 font-black">{drvRuns.length} نفر</span></span>
                    <span>تعداد مسیرها: <span className="text-purple-800 font-black">{Array.from(new Set(drvRuns.map(r => r.round))).length} مسیر</span></span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 font-bold text-[9px]">لیست مشتریان و مقاصد باربری امروز:</span>
                  <div className="flex flex-wrap gap-1">
                    {drvRuns.map((run) => (
                      <span key={run.id} className={`text-xs px-2 py-0.5 rounded-lg font-black inline-block border ${getCustomerPillClasses(drvName, drivers)}`}>
                        {run.customerName} ({run.destinationLocation || "نامشخص"}{run.shippingAgency ? ` - باربری: ${run.shippingAgency}` : ""})
                      </span>
                    ))}
                    {drvRuns.length === 0 && <span className="text-[10px] text-slate-400 font-bold">بدون مشتری</span>}
                  </div>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 border border-slate-100 rounded-xl p-2 bg-slate-50/30">
                  <table className="w-full text-right text-[10px]">
                    <thead>
                      <tr className="text-slate-500 font-bold border-b border-slate-200">
                        <th className="pb-1.5 font-black text-slate-700">نوع کالا و طعم</th>
                        <th className="pb-1.5 font-black text-slate-700 text-center w-[80px]">وزن (کیلو)</th>
                        <th className="pb-1.5 font-black text-slate-700 text-center w-[80px]">کارتن</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {loadedItems.map((item) => (
                        <tr key={item.product.id}>
                          <td className="py-2 text-slate-900 font-black">
                            {item.product.category} <span className="text-slate-500 font-medium text-[9px]">({item.product.flavor || "ساده"})</span>
                          </td>
                          <td className="py-2 text-center font-mono font-bold text-cyan-700 bg-cyan-50/20">{item.actualWeight.toLocaleString("en-US")}</td>
                          <td className="py-2 text-center font-mono text-slate-700">
                            {item.cartons > 0 ? (
                              <span>
                                {Math.floor(item.cartons).toLocaleString("en-US")}
                                {item.cartons % 1 !== 0 && (
                                  <span className="text-[9px] text-emerald-600 font-bold mr-1">
                                    (+{Math.round((item.cartons % 1) * (item.product.realCartonWeight || item.product.unitWeight)).toLocaleString("en-US")} kg)
                                  </span>
                                )}
                                <span className="text-[9px] text-slate-500 mr-1">کارتن</span>
                              </span>
                            ) : "-"}
                          </td>
                        </tr>
                      ))}
                      {loadedItems.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center py-6 text-slate-400 font-bold">
                            هیچ باری برای این راننده تخصیص نیافته است.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-3 p-5 border-t border-slate-100">
                <button
                  onClick={() => {
                    setPrintDriverName(drvName);
                    setDriverPrintPreview(true);
                  }}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black rounded-xl border border-slate-300 transition cursor-pointer text-[10px] flex items-center gap-1.5 print:hidden"
                >
                  <Printer className="w-3.5 h-3.5 text-cyan-600" />
                  چاپ تکی حواله
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
