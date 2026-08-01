import React from "react";
import { Product, Driver, InvoiceRun } from "../types";
import { SHAMSI_MONTHS, getShamsiWeekday } from "../utils/shamsi";
import { isSameDriver, getDriverColorClass } from "../utils/driverHelpers";
import { getInvoiceWeight } from "../utils/invoiceCalculations";

interface MatrixPrintProps {
  products: Product[];
  drivers: Driver[];
  invoices: InvoiceRun[];
  driverSearchSlots: string[];
  selectedCategoryFilter: string;
  shamsiYear: number;
  shamsiMonth: number;
  shamsiDay: number;
  validProducts: Product[];
}

export function renderMatrixContent(
  isModal: boolean,
  props: MatrixPrintProps
) {
  const {
    products,
    invoices,
    driverSearchSlots,
    selectedCategoryFilter,
    shamsiYear,
    shamsiMonth,
    shamsiDay
  } = props;

  const filteredProducts = products.filter(
    (p) => selectedCategoryFilter === "all" || p.category === selectedCategoryFilter
  );

  let grandTotalWeight = 0;
  driverSearchSlots.forEach((driver) => {
    if (driver) {
      invoices
        .filter((inv) => isSameDriver(inv.driverName, driver) && inv.isActive !== false)
        .forEach((inv) => {
          grandTotalWeight += getInvoiceWeight(inv);
        });
    }
  });

  const displayWeekday = getShamsiWeekday(shamsiYear, shamsiMonth, shamsiDay);
  const displayMonthName = SHAMSI_MONTHS.find((m) => m.id === shamsiMonth)?.name || "";
  const farsiFullDate = `${displayWeekday}، ${shamsiDay} ${displayMonthName} ${shamsiYear}`;

  if (isModal) {
    return (
      <div id="printable-matrix" className="w-full text-black bg-white p-2 print:hidden" dir="rtl">
        <div className="flex justify-between items-end mb-3 border-b-2 border-black pb-1.5" style={{ minHeight: "30px" }}>
          <div className="text-right text-[10px] font-black text-black">
            {farsiFullDate}
          </div>
          <div className="text-center text-xs font-black text-black tracking-wide" style={{ margin: "0 auto", paddingRight: "30px" }}>
            گزارش صورت بار فاکتورهای مورخ
          </div>
          <div className="w-8"></div>
        </div>

        <table className="w-full border-collapse border-2 border-black text-center text-[9px] leading-tight font-sans text-black">
          <thead>
            <tr className="bg-slate-100 border-b border-black font-extrabold h-[21px]">
              <th className="py-0.5 px-1 border-l border-black text-right font-black text-black w-[100px] min-w-[100px] max-w-[100px] bg-slate-100">
                نوع محصول / راننده
              </th>
              {driverSearchSlots.map((slot, idx) => {
                const realIdx = 9 - idx;
                const driver = driverSearchSlots[realIdx];
                const isGray = realIdx % 2 !== 0;
                return (
                  <th
                    key={idx}
                    className={`py-0.5 px-0.5 border-l border-black text-center text-[9px] text-black font-black w-[42px] min-w-[42px] max-w-[42px] ${
                      isGray ? "bg-[#f4f4f5]" : "bg-slate-100"
                    }`}
                  >
                    {driver || "-"}
                  </th>
                );
              }).reverse()}
              <th className="py-0.5 px-0.5 text-center font-black text-black w-[48px] min-w-[48px] max-w-[48px] bg-slate-100">
                جمع کل
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {filteredProducts.map((p, idx) => {
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

              const isLastOfCategory =
                idx === filteredProducts.length - 1 ||
                filteredProducts[idx + 1].category !== p.category;

              return (
                <tr
                  key={p.id}
                  className={`
                    h-[16px]
                    ${isLastOfCategory ? "border-b-2 border-black" : "border-b border-black"}
                  `}
                >
                  <td 
                    className="py-0 px-1 border-l border-black text-right font-black text-black whitespace-nowrap overflow-hidden text-[11px] w-[100px] min-w-[100px] max-w-[100px] tracking-tighter leading-none"
                    style={{ fontWeight: 990 }}
                  >
                    {p.category} {p.flavor ? `(${p.flavor})` : ""}
                  </td>

                  {driverSearchSlots.map((slot, slotIdx) => {
                    const realIdx = 9 - slotIdx;
                    const driver = driverSearchSlots[realIdx];
                    let productWeight = 0;
                    if (driver) {
                      invoices
                        .filter((inv) => isSameDriver(inv.driverName, driver) && inv.isActive !== false)
                        .forEach((inv) => {
                          productWeight += Number(inv.quantities[p.id] || 0);
                        });
                    }

                    const isGray = realIdx % 2 !== 0;

                    return (
                      <td
                        key={slotIdx}
                        className={`py-0 px-0.5 border-l border-black text-center font-black text-black text-[12.5px] font-mono w-[42px] min-w-[42px] max-w-[42px] leading-none ${
                          isGray ? "bg-[#fafafa]" : "bg-white"
                        }`}
                        style={{ fontWeight: 990, letterSpacing: "-0.04em" }}
                      >
                        {productWeight > 0 ? (
                          <span className="text-black font-black" style={{ fontWeight: 990 }}>
                            {productWeight.toLocaleString("en-US")}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-medium text-[10px]">0</span>
                        )}
                      </td>
                    );
                  }).reverse()}

                  <td 
                    className="py-0 px-0.5 text-center font-black text-black bg-slate-50 text-[12.5px] font-mono w-[48px] min-w-[48px] max-w-[48px] leading-none"
                    style={{ fontWeight: 990, letterSpacing: "-0.04em" }}
                  >
                    {rowTotal > 0 ? (
                      <span className="text-black font-black" style={{ fontWeight: 990 }}>
                        {rowTotal.toLocaleString("en-US")}
                      </span>
                    ) : (
                      <span className="text-slate-300 font-medium text-[10px]">0</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="h-1"></div>

        <div className="flex flex-col w-full text-[9px] leading-tight font-sans text-black" dir="rtl">
          <table className="w-full border-collapse border-none text-center">
            <tbody>
              <tr className="font-black text-black h-5">
                <td className="py-0.5 px-1 text-right font-black text-black text-[10px] w-[100px] min-w-[100px] max-w-[100px]" style={{ fontWeight: 990 }}>
                  جمع وزن:
                </td>
                {driverSearchSlots.map((slot, idx) => {
                  const realIdx = 9 - idx;
                  const driver = driverSearchSlots[realIdx];
                  let totalWeight = 0;
                  if (driver) {
                    invoices
                      .filter((inv) => isSameDriver(inv.driverName, driver) && inv.isActive !== false)
                      .forEach((inv) => {
                        totalWeight += getInvoiceWeight(inv);
                      });
                  }

                  const isGray = realIdx % 2 !== 0;

                  return (
                    <td
                      key={idx}
                      className={`py-0.5 px-0.5 text-center font-black text-black text-[11.5px] font-mono w-[42px] min-w-[42px] max-w-[42px] whitespace-nowrap leading-none ${
                        isGray ? "bg-[#fafafa]" : "bg-white"
                      }`}
                      style={{ fontWeight: 990, letterSpacing: "-0.04em" }}
                    >
                      {totalWeight > 0 ? (
                        <span className="font-black text-black" style={{ fontWeight: 990 }}>
                          {totalWeight.toLocaleString("en-US")}
                        </span>
                      ) : "0"}
                    </td>
                  );
                }).reverse()}
                <td className="w-[48px] min-w-[48px] max-w-[48px]"></td>
              </tr>
            </tbody>
          </table>

          <div className="mt-1 flex justify-between items-center w-full px-1 border-t border-black pt-1">
            <div className="text-slate-500 text-[8px] no-print">
              * تمام مقادیر بر حسب کیلوگرم (Kg) می‌باشد.
            </div>
            <div className="text-left font-black text-[12px] text-black" style={{ fontWeight: 990, whiteSpace: "nowrap" }}>
              جمع کل: {grandTotalWeight.toLocaleString("en-US")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export function renderDriverSheetsContent(
  isPrint: boolean,
  targetDriver: string | null,
  props: MatrixPrintProps
) {
  const { invoices, drivers, validProducts, driverSearchSlots, shamsiYear, shamsiMonth, shamsiDay } = props;

  const activeDrivers = Array.from(
    new Set(
      invoices
        .filter((inv) => inv.isActive !== false && inv.driverName && inv.driverName.trim() !== "")
        .map((inv) => inv.driverName.trim())
    )
  );
  const driversToRender = targetDriver ? [targetDriver] : activeDrivers;

  if (driversToRender.length === 0) return null;

  return (
    <div className={`font-sans ${isPrint ? "" : "space-y-8"}`} dir="rtl">
      {driversToRender.map((drvName, idx) => {
        const drvRuns = invoices.filter((i) => i.driverName === drvName && i.isActive !== false);
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

        const activeDateStr = `${shamsiYear}/${String(shamsiMonth).padStart(2, '0')}/${String(shamsiDay).padStart(2, '0')}`;

        return (
          <div 
            key={drvName} 
            className={`bg-white text-black p-6 border border-slate-300 rounded-2xl shadow-sm ${
              isPrint ? "print:border-0 print:p-0 print:shadow-none" : ""
            } relative overflow-hidden`}
          >
            <div className="flex justify-between items-center border-b-2 border-slate-950 pb-4 mb-4">
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold mt-1">سامانه هوشمند توزیع و پخش کالا</p>
              </div>
              <div className="text-center bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                <span className="text-[9px] text-slate-500 block font-bold">شماره حواله</span>
                <span className="text-xs font-black font-mono text-slate-800">DRV-{idx + 101}</span>
              </div>
              <div className="text-left text-xs text-slate-800 font-bold space-y-1">
                <div>تاریخ حواله: <span className="font-mono font-black">{activeDateStr}</span></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-xs font-bold text-slate-800">
              <div>
                <span className="text-slate-500 block text-[9px] mb-0.5">نام راننده:</span>
                <span className="text-xs font-black text-slate-900">{drvName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] mb-0.5">نوع خودرو ترابری:</span>
                <span className="text-slate-900">{vehicleType}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] mb-0.5">تعداد فاکتور / مشتری:</span>
                <span className="text-cyan-800 font-black">{drvRuns.length} مشتری</span>
              </div>
            </div>

            <div className="mb-4 bg-cyan-50/50 border border-cyan-150 rounded-xl p-3 text-xs">
              <span className="text-cyan-800 font-extrabold block text-[10px] mb-1.5">فهرست مشتریان و شهرهای مقصد حواله (سربرگ بارگیری):</span>
              <div className="flex flex-wrap gap-2">
                {drvRuns.map((run, runIdx) => (
                  <span key={run.id} className="inline-flex items-center gap-1 bg-white border border-cyan-200 px-2.5 py-1 rounded-lg text-cyan-950 font-black">
                    <span className="text-cyan-600 font-mono text-[10px]">#{runIdx + 1}</span>
                    <span>{run.customerName}</span>
                    <span className="text-slate-400 font-medium">|</span>
                    <span className="text-slate-600">{run.destinationLocation || "نامشخص"}</span>
                    {run.shippingAgency && (
                      <>
                        <span className="text-slate-400 font-medium">|</span>
                        <span className="text-amber-700 font-extrabold">باربری: {run.shippingAgency}</span>
                      </>
                    )}
                  </span>
                ))}
                {drvRuns.length === 0 && (
                  <span className="text-slate-400 font-medium">هیچ مشتری ثبت نشده است</span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-[10px] sm:text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black text-center border border-slate-900 text-[9px] sm:text-[10px]">
                    <th className="py-1 px-1.5 border border-slate-800 text-right">نام محصول (گروه اول)</th>
                    <th className="py-1 px-1.5 border border-slate-800 w-[65px] text-center">وزن (کیلو)</th>
                    <th className="py-1 px-1.5 border border-slate-800 w-[55px] text-center">کارتن</th>
                    <th className="p-0 border-l border-r border-slate-950 w-1 bg-slate-800"></th>
                    <th className="py-1 px-1.5 border border-slate-800 text-right">نام محصول (گروه دوم)</th>
                    <th className="py-1 px-1.5 border border-slate-800 w-[65px] text-center">وزن (کیلو)</th>
                    <th className="py-1 px-1.5 border border-slate-800 w-[55px] text-center">کارتن</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const halfCount = Math.ceil(loadedItems.length / 2);
                    if (loadedItems.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="py-4 text-center text-slate-400">هیچ باری برای این راننده ثبت نشده است.</td>
                        </tr>
                      );
                    }
                    
                    const rows = [];
                    for (let i = 0; i < halfCount; i++) {
                      const rightItem = loadedItems[i];
                      const leftItem = loadedItems[i + halfCount];
                      rows.push(
                        <tr key={i} className="border-b border-slate-300 hover:bg-slate-50/50 font-bold text-center">
                          <td className="py-0.5 px-1.5 print:py-0 print:px-1 border border-slate-300 text-right font-black text-slate-900">
                            {rightItem ? `${rightItem.product.category} ${rightItem.product.flavor || ""}` : "-"}
                          </td>
                          <td className="py-0.5 px-1.5 print:py-0 print:px-1 border border-slate-300 font-mono font-black text-cyan-800 text-center bg-cyan-50/10">
                            {rightItem ? rightItem.actualWeight.toLocaleString("en-US") : "-"}
                          </td>
                          <td className="py-0.5 px-1.5 print:py-0 print:px-1 border border-slate-300 font-mono text-slate-900 text-center">
                            {rightItem && rightItem.cartons > 0 ? (
                              <span>
                                {Math.floor(rightItem.cartons).toLocaleString("en-US")}
                                {rightItem.cartons % 1 !== 0 && (
                                  <span className="text-[9px] text-emerald-600 mr-1 font-bold">
                                    (+{Math.round((rightItem.cartons % 1) * (rightItem.product.realCartonWeight || rightItem.product.unitWeight)).toLocaleString("en-US")} kg)
                                  </span>
                                )}
                                <span className="text-[9px] text-slate-500 mr-1">کارتن</span>
                              </span>
                            ) : "-"}
                          </td>
                          <td className="p-0 border-l border-r border-slate-950 bg-slate-100"></td>
                          <td className="py-0.5 px-1.5 print:py-0 print:px-1 border border-slate-300 text-right font-black text-slate-900">
                            {leftItem ? `${leftItem.product.category} ${leftItem.product.flavor || ""}` : "-"}
                          </td>
                          <td className="py-0.5 px-1.5 print:py-0 print:px-1 border border-slate-300 font-mono font-black text-cyan-800 text-center bg-cyan-50/10">
                            {leftItem ? leftItem.actualWeight.toLocaleString("en-US") : "-"}
                          </td>
                          <td className="py-0.5 px-1.5 print:py-0 print:px-1 border border-slate-300 font-mono text-slate-900 text-center">
                            {leftItem && leftItem.cartons > 0 ? (
                              <span>
                                {Math.floor(leftItem.cartons).toLocaleString("en-US")}
                                {leftItem.cartons % 1 !== 0 && (
                                  <span className="text-[9px] text-emerald-600 mr-1 font-bold">
                                    (+{Math.round((leftItem.cartons % 1) * (leftItem.product.realCartonWeight || leftItem.product.unitWeight)).toLocaleString("en-US")} kg)
                                  </span>
                                )}
                                <span className="text-[9px] text-slate-500 mr-1">کارتن</span>
                              </span>
                            ) : "-"}
                          </td>
                        </tr>
                      );
                    }
                    return rows;
                  })()}
                  <tr className="bg-slate-100 font-black text-center border-t-2 border-slate-900 text-slate-900 text-[10px]">
                    <td className="py-1 px-1.5 border border-slate-300 text-left pl-2">جمع کل تناژ:</td>
                    <td className="py-1 px-1.5 border border-slate-300 font-mono text-cyan-900 text-center bg-cyan-100/30">
                      {totalWeight.toLocaleString("en-US")} <span className="text-[8px] font-sans">کیلو</span>
                    </td>
                    <td className="py-1 px-1.5 border border-slate-300 font-mono text-slate-900 text-center bg-slate-200/30">
                      {Math.floor(totalCartons).toLocaleString("en-US")} 
                      {totalCartons % 1 !== 0 && (
                        <span className="text-[9px] text-emerald-600 font-bold mr-1">
                          (+کسری...)
                        </span>
                      )}
                      <span className="text-[8px] font-sans mr-1">کارتن</span>
                    </td>
                    <td className="p-0 border-l border-r border-slate-950 bg-slate-200"></td>
                    <td colSpan={3} className="py-1 px-1.5 border border-slate-300 text-right text-slate-500 font-medium">
                      بارگیری حواله: {drvName} | تعداد مشتری: {drvRuns.length}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-6 text-center text-[10px] font-bold text-slate-700 pt-4 border-t border-slate-200">
              <div className="space-y-10">
                <span>امضاء متصدی انبار</span>
                <div className="h-4 border-b border-dashed border-slate-300 w-3/4 mx-auto"></div>
              </div>
              <div className="space-y-10">
                <span>امضاء راننده تحویل‌گیرنده</span>
                <div className="h-4 border-b border-dashed border-slate-300 w-3/4 mx-auto"></div>
              </div>
              <div className="space-y-10">
                <span>مهر و تاییدیه واحد نگهبانی</span>
                <div className="h-4 border-b border-dashed border-slate-300 w-3/4 mx-auto"></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
