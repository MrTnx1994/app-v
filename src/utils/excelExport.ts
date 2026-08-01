import * as XLSX from "xlsx";
import { InvoiceRun, Product, Driver } from "../types";
import { getDriverHexColor, getDriverCellHexColor, isSameDriver } from "./driverHelpers";
import { 
  getInvoiceWeight, 
  getInvoiceCartonsVolumetric, 
  getCategoryAggregateOutflow 
} from "./invoiceCalculations";

export const exportToExcelHtml = (
  invoices: InvoiceRun[],
  validProducts: Product[],
  allocatedQuantities: { [productId: string]: number },
  getProductStock: (id: string, defaultStock: number) => number,
  manualStockOverrides: { [productId: string]: number },
  driverSearchSlots: string[],
  selectedCategoryFilter: string,
  formattedDate: string,
  showNotification: (type: "success" | "error" | "info", msg: string) => void
) => {
  try {
    const filteredProducts = validProducts.filter((p) => selectedCategoryFilter === "all" || p.category === selectedCategoryFilter);
    const dateStr = formattedDate ? formattedDate.replace(/\//g, "-") : "امروز";

    const catOutflow = getCategoryAggregateOutflow(validProducts, allocatedQuantities);

    let html = `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="utf-8">
  <title>برنامه نهایی فروش و توزیع - ${dateStr}</title>
  <style>
    body { font-family: Tahoma, Arial, sans-serif; font-size: 11px; background-color: #ffffff; padding: 10px; }
    table { border-collapse: collapse; width: 100%; text-align: center; }
    th, td { border: 1px solid #CBD5E1; padding: 5px 4px; font-size: 11px; vertical-align: middle; }
    .header-title { font-size: 16px; font-weight: bold; color: #1E3A8A; text-align: center; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="header-title">برنامه نهایی توزیع بار و فروش - مورخ ${formattedDate || "امروز"}</div>
  <table dir="rtl">
    <thead>
      <tr style="background-color: #1E3A8A; color: #FFFFFF; font-weight: bold;">
        <th rowspan="8" style="background-color: #1E3A8A; color: #FFFFFF; font-weight: bold; width: 110px;">نوع کالا</th>
        <th rowspan="8" style="background-color: #1E3A8A; color: #FFFFFF; font-weight: bold; width: 100px;">طعم / مشخصه</th>
        <th colspan="${invoices.length}" style="background-color: #2563EB; color: #FFFFFF; font-weight: bold;">لیست سفارشات و رانندگان</th>
        <th colspan="5" style="background-color: #059669; color: #FFFFFF; font-weight: bold;">وضعیت خروجی و انبار</th>
        <th colspan="${driverSearchSlots.length}" style="background-color: #D97706; color: #FFFFFF; font-weight: bold;">جستجوی رانندگان (ستونی)</th>
        <th rowspan="8" style="background-color: #FFEDD5; color: #7C2D12; font-weight: bold; width: 100px; border: 1px solid #C2410C;">جمع کل جستجو</th>
      </tr>

      <tr style="background-color: #F8FAFC;">
        ${invoices.map(inv => `
          <td style="font-weight: bold; background-color: ${inv.isActive !== false ? '#DCFCE7' : '#F1F5F9'}; color: ${inv.isActive !== false ? '#15803D' : '#64748B'}; border: 1px solid #94A3B8;">
            وضعیت: ${inv.isActive !== false ? 'فعال' : 'غیرفعال'}
          </td>
        `).join('')}
        <td rowspan="7" style="background-color: #D1FAE5; font-weight: bold; color: #065F46; width: 90px; border: 1px solid #047857;">کل تخصیص یافته</td>
        <td rowspan="7" style="background-color: #E2E8F0; font-weight: bold; color: #334155; width: 90px; border: 1px solid #475569;">موجودی دستی</td>
        <td rowspan="7" style="background-color: #D1FAE5; font-weight: bold; color: #065F46; width: 90px; border: 1px solid #047857;">موجودی واقعی</td>
        <td rowspan="7" style="background-color: #D1FAE5; font-weight: bold; color: #065F46; width: 90px; border: 1px solid #047857;">باقیمانده</td>
        <td rowspan="7" style="background-color: #FEE2E2; font-weight: bold; color: #991B1B; width: 90px; border: 1px solid #B91C1C;">کسری</td>
        
        ${driverSearchSlots.map((driver, idx) => {
          const realIdx = 9 - idx;
          const searchDriver = driverSearchSlots[realIdx];
          return `
            <td rowspan="7" style="background-color: #FFE8A3; font-weight: bold; color: #78350F; width: 105px; border: 1px solid #D97706;">
              جستجو ${realIdx + 1}:<br><b style="color: #000000; font-size: 11px;">${searchDriver || '(خالی)'}</b>
            </td>
          `;
        }).reverse().join('')}
      </tr>

      <tr style="background-color: #F8FAFC;">
        ${invoices.map(inv => `
          <td style="font-weight: bold; background-color: ${getDriverHexColor(inv.driverName)}; color: #0F172A; border: 1px solid #94A3B8; font-size: 11px;">
            راننده: ${inv.driverName || 'بدون راننده'}
          </td>
        `).join('')}
      </tr>

      <tr style="background-color: #F8FAFC;">
        ${invoices.map(inv => `
          <td style="font-weight: bold; color: #0F172A; background-color: ${getDriverHexColor(inv.driverName)}; border: 1px solid #94A3B8; text-align: right; font-size: 11px;">
            مشتری: ${inv.customerName || '-'}
          </td>
        `).join('')}
      </tr>

      <tr style="background-color: #F8FAFC;">
        ${invoices.map(inv => `
          <td style="font-weight: 900; color: #334155; font-size: 12px; background-color: ${getDriverHexColor(inv.driverName)}; border: 1px solid #94A3B8; text-align: right;">
            مسیر: ${inv.destinationLocation || '-'}
          </td>
        `).join('')}
      </tr>

      <tr style="background-color: #F8FAFC;">
        ${invoices.map(inv => `
          <td style="font-weight: 900; color: #7c2d12; font-size: 12px; background-color: ${getDriverHexColor(inv.driverName)}; border: 1px solid #94A3B8; text-align: right;">
            باربری: ${inv.shippingAgency || '-'}
          </td>
        `).join('')}
      </tr>

      <tr style="background-color: #F8FAFC;">
        ${invoices.map(inv => `
          <td style="font-weight: 900; color: #475569; font-size: 12px; background-color: ${getDriverHexColor(inv.driverName)}; border: 1px solid #94A3B8; text-align: right;">
            توضیحات: ${inv.description || '-'}
          </td>
        `).join('')}
      </tr>

      <tr style="background-color: #F8FAFC;">
        ${invoices.map(inv => {
          const weight = getInvoiceWeight(inv);
          return `
            <td style="font-weight: bold; background-color: #EEF2FF; color: #312E81; border: 1px solid #94A3B8; font-size: 11.5px;">
              وزن کل: ${weight.toLocaleString()} Kg
            </td>
          `;
        }).join('')}
      </tr>

      ${(() => {
        let sumAllocated = 0;
        let sumStock = 0;
        let sumShortage = 0;
        filteredProducts.forEach((p) => {
          const alloc = (allocatedQuantities[p.id] || 0);
          sumAllocated += alloc;
          const currentStock = getProductStock(p.id, p.defaultStock);
          sumStock += currentStock;
          const remaining = currentStock - alloc;
          if (remaining < 0) {
            sumShortage += Math.abs(remaining);
          }
        });
        const sumRemaining = sumStock - sumAllocated;

        return `
          <tr class="sum-row" style="background-color: #FEF3C7; font-weight: bold; font-size: 11px; height: 32px;">
            <td colspan="2" style="background-color: #FCD34D; color: #000000; font-weight: bold; font-size: 12px; border: 1px solid #D97706;">جمع کل بار روزانه</td>
            
            ${invoices.map(inv => `
              <td style="background-color: #FEF3C7; font-weight: bold; border: 1px solid #D97706; color: #78350F; font-size: 11.5px;">
                ${getInvoiceWeight(inv).toLocaleString()} Kg<br>
                <span style="font-size: 9px; font-weight: normal;">(${getInvoiceCartonsVolumetric(inv, validProducts)} کارتن)</span>
              </td>
            `).join('')}

            <td style="background-color: #A7F3D0; font-weight: bold; color: #065F46; border: 1px solid #047857;">${sumAllocated.toLocaleString()} Kg</td>
            <td style="background-color: #E2E8F0; border: 1px solid #475569;">-</td>
            <td style="background-color: #A7F3D0; font-weight: bold; color: #065F46; border: 1px solid #047857;">${sumStock.toLocaleString()} Kg</td>
            <td style="${sumRemaining < 0 ? 'background-color: #FEE2E2; color: #991B1B; font-weight: bold;' : 'background-color: #A7F3D0; color: #065F46; font-weight: bold;'} border: 1px solid #047857;">
              ${sumRemaining.toLocaleString()} Kg
            </td>
            <td style="background-color: #FEE2E2; font-weight: bold; color: #991B1B; border: 1px solid #047857;">
              ${sumShortage.toLocaleString()} Kg
            </td>

            ${driverSearchSlots.map((driver, idx) => {
              const realIdx = 9 - idx;
              const slotDriver = driverSearchSlots[realIdx];
              let slotTotalWeight = 0;
              if (slotDriver) {
                invoices
                  .filter((inv) => isSameDriver(inv.driverName, slotDriver) && inv.isActive !== false)
                  .forEach((inv) => {
                    slotTotalWeight += getInvoiceWeight(inv);
                  });
              }
              return `
                <td style="background-color: #FFE8A3; color: #78350F; font-weight: bold; border: 1px solid #D97706; direction: rtl;">
                  ${slotTotalWeight > 0 ? `${slotTotalWeight.toLocaleString("en-US")} Kg` : '0'}
                </td>
              `;
            }).reverse().join('')}

            <td style="background-color: #FFEDD5; color: #7C2D12; font-weight: bold; border: 1px solid #C2410C; direction: rtl;">
              ${(() => {
                let searchGrandTotalWeight = 0;
                driverSearchSlots.forEach((driver) => {
                  if (driver) {
                    invoices
                      .filter((inv) => isSameDriver(inv.driverName, driver) && inv.isActive !== false)
                      .forEach((inv) => {
                        searchGrandTotalWeight += getInvoiceWeight(inv);
                      });
                  }
                });
                return `${searchGrandTotalWeight.toLocaleString("en-US")} Kg`;
              })()}
            </td>
          </tr>
        `;
      })()}
    </thead>

    <tbody>
      ${filteredProducts.map((p, pIndex, filteredArr) => {
        const allocated = allocatedQuantities[p.id] || 0;
        const currentStock = getProductStock(p.id, p.defaultStock);
        const remainingStock = currentStock - allocated;
        const isShortage = remainingStock < 0;
        const divider = p.unitWeight;

        const isFirstInGroup = pIndex === 0 || filteredArr[pIndex - 1].category !== p.category;
        
        return `
          <tr style="height: 28px;">
            <td style="background-color: ${isFirstInGroup ? '#BFDBFE' : '#DBEAFE'}; font-weight: bold; color: #000000; text-align: center; border: 1px solid #94A3B8;">
              ${p.category}
            </td>

            <td style="background-color: #EFF6FF; font-weight: bold; color: #000000; text-align: right; border: 1px solid #94A3B8; padding-right: 10px;">
              ${p.flavor || '-'} <span style="font-size: 9.5px; color: #475569; font-weight: normal;">(واحد ${p.unitWeight} کیلو)</span>
            </td>

            ${invoices.map(inv => {
              const qty = inv.quantities[p.id] || 0;
              const isActive = inv.isActive !== false;
              const qtyCartons = divider > 0 ? (qty / divider) : 0;
              
              return `
                <td style="background-color: ${getDriverCellHexColor(inv.driverName, qty, isActive)}; color: ${qty > 0 ? '#000000' : '#94A3B8'}; font-weight: ${qty > 0 ? 'bold' : 'normal'}; border: 1px solid #94A3B8;">
                  ${qty > 0 ? `${qty.toLocaleString()} Kg<br><span style="font-size: 8.5px; opacity: 0.85; font-weight: bold;">(${qtyCartons.toLocaleString("en-US", { maximumFractionDigits: 1 })} کارتن)</span>` : '-'}
                </td>
              `;
            }).join('')}

            <td style="background-color: #D1FAE5; font-weight: bold; color: #065F46; border: 1px solid #94A3B8;">
              ${allocated > 0 ? `${allocated.toLocaleString()} Kg<br><span style="font-size: 8.5px; opacity: 0.85; font-weight: bold;">(${divider > 0 ? (allocated / divider).toLocaleString("en-US", { maximumFractionDigits: 1 }) : 0} کارتن)</span>` : '0'}
            </td>

            <td style="background-color: #ECFDF5; color: #047857; font-weight: bold; border: 1px solid #CBD5E1;">
              ${manualStockOverrides[p.id] !== undefined ? `${manualStockOverrides[p.id].toLocaleString()} Kg` : '-'}
            </td>

            <td style="background-color: #D1FAE5; font-weight: bold; color: #065F46; border: 1px solid #94A3B8;">
              ${currentStock !== 0 ? `${currentStock.toLocaleString()} Kg<br><span style="font-size: 8.5px; opacity: 0.85; font-weight: bold;">(${divider > 0 ? (currentStock / divider).toLocaleString("en-US", { maximumFractionDigits: 1 }) : 0} کارتن)</span>` : '0'}
            </td>

            <td style="${isShortage ? 'background-color: #FEE2E2; color: #991B1B; font-weight: bold;' : 'background-color: #A7F3D0; color: #065F46; font-weight: bold;'} border: 1px solid #94A3B8;">
              ${remainingStock.toLocaleString()} Kg<br>
              <span style="font-size: 8.5px; opacity: 0.85; font-weight: bold;">(${divider > 0 ? (remainingStock / divider).toLocaleString("en-US", { maximumFractionDigits: 1 }) : 0} کارتن)</span>
            </td>

            <td style="${isShortage ? 'background-color: #FEE2E2; color: #991B1B; font-weight: bold;' : 'background-color: #F8FAFC; color: #94A3B8;'} border: 1px solid #94A3B8;">
              ${isShortage ? `${Math.abs(remainingStock).toLocaleString()} Kg<br><span style="font-size: 8.5px; opacity: 0.85; font-weight: bold;">(${divider > 0 ? (Math.abs(remainingStock) / divider).toLocaleString("en-US", { maximumFractionDigits: 1 }) : 0} کارتن)</span>` : '0'}
            </td>

            ${driverSearchSlots.map((driver, idx) => {
              const realIdx = 9 - idx;
              const slotDriver = driverSearchSlots[realIdx];
              let productWeight = 0;
              if (slotDriver) {
                invoices
                  .filter((inv) => isSameDriver(inv.driverName, slotDriver) && inv.isActive !== false)
                  .forEach((inv) => {
                    productWeight += Number(inv.quantities[p.id] || 0);
                  });
              }
              const productCartons = divider > 0 ? (productWeight / divider) : 0;
              return `
                <td style="background-color: #FFF7ED; color: #7C2D12; border: 1px solid #94A3B8;">
                  ${productWeight > 0 ? `${productWeight.toLocaleString()} Kg<br><span style="font-size: 8.5px; opacity: 0.85; font-weight: bold;">(${productCartons.toLocaleString("en-US", { maximumFractionDigits: 1 })} کارتن)</span>` : '0'}
                </td>
              `;
            }).reverse().join('')}

            <td style="background-color: #FFEDD5; color: #7C2D12; font-weight: bold; border: 1px solid #94A3B8;">
              ${(() => {
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
                const totalCartons = divider > 0 ? (rowTotal / divider) : 0;
                return rowTotal > 0 ? `${rowTotal.toLocaleString()} Kg<br><span style="font-size: 8.5px; opacity: 0.85; font-weight: bold;">(${totalCartons.toLocaleString("en-US", { maximumFractionDigits: 1 })} کارتن)</span>` : '0';
              })()}
            </td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div style="page-break-before: always; margin-top: 40px; font-family: Tahoma, Arial;">
    <h3 style="color: #1E3A8A; font-size: 13px; font-weight: bold; border-bottom: 2px solid #1E3A8A; padding-bottom: 5px; margin-bottom: 10px;">
      گزارش خروجی تجمیعی انبار بر اساس دسته‌بندی اصلی محصول
    </h3>
    <table dir="rtl" style="width: 50%; min-width: 450px;">
      <thead>
        <tr style="background-color: #334155; color: #FFFFFF; font-weight: bold;">
          <th style="padding: 8px; border: 1px solid #475569;">دسته‌بندی اصلی محصول</th>
          <th style="padding: 8px; border: 1px solid #475569;">وزن کل خروجی (کیلوگرم)</th>
          <th style="padding: 8px; border: 1px solid #475569;">تعداد کل کارتن‌های خروجی</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(catOutflow).map(([cat, info]: any) => `
          <tr style="height: 26px;">
            <td style="background-color: #F1F5F9; font-weight: bold; border: 1px solid #94A3B8;">${cat}</td>
            <td style="background-color: #EFF6FF; font-weight: bold; color: #1E40AF; border: 1px solid #94A3B8;">${info.weight.toLocaleString()} Kg</td>
            <td style="background-color: #ECFDF5; font-weight: bold; color: #047857; border: 1px solid #94A3B8;">${info.packs.toLocaleString()} کارتن</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

</body>
</html>`;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `برنامه نهایی-${dateStr}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification("success", "فایل اکسل پیشرفته قالب‌بندی شده و رنگی با موفقیت دانلود شد.");
  } catch (e) {
    console.error(e);
    showNotification("error", "خطا در تولید فایل اکسل رنگی.");
  }
};
