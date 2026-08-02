import { InvoiceRun, Product, Driver } from "../types";

export const getInvoiceWeight = (inv: InvoiceRun): number => {
  let total = 0;
  Object.entries(inv.quantities || {}).forEach(([_, qty]) => {
    const numQty = Number(qty) || 0;
    if (numQty > 0) {
      total += numQty;
    }
  });
  return total;
};

export const getInvoiceCartonsReal = (inv: InvoiceRun, products: Product[]): number => {
  let total = 0;
  Object.entries(inv.quantities || {}).forEach(([pId, qty]) => {
    const numQty = Number(qty) || 0;
    const prod = products.find((p) => p.id === pId);
    if (prod && numQty > 0) {
      const divider = prod.realCartonWeight && prod.realCartonWeight > 0 ? prod.realCartonWeight : prod.unitWeight;
      if (divider > 0) {
        total += numQty / divider;
      }
    }
  });
  return total;
};

export const getInvoiceVolumetricWeight = (inv: InvoiceRun, products: Product[]): number => {
  let total = 0;
  Object.entries(inv.quantities || {}).forEach(([pId, qty]) => {
    const numQty = Number(qty) || 0;
    const prod = products.find((p) => p.id === pId);
    if (prod && numQty > 0) {
      const realDivider = prod.realCartonWeight && prod.realCartonWeight > 0 ? prod.realCartonWeight : prod.unitWeight;
      if (realDivider > 0) {
        const cartons = numQty / realDivider;
        total += cartons * prod.unitWeight;
      }
    }
  });
  return total;
};

export const getInvoiceCartonsVolumetric = (inv: InvoiceRun, products: Product[]): number => {
  let total = 0;
  Object.entries(inv.quantities || {}).forEach(([pId, qty]) => {
    const numQty = Number(qty) || 0;
    const prod = products.find((p) => p.id === pId);
    if (prod && numQty > 0 && prod.unitWeight > 0) {
      total += numQty / prod.unitWeight;
    }
  });
  return total;
};

export const getDriverCapacity = (driverName: string, drivers: Driver[]): number => {
  const drv = drivers.find((d) => d.name === driverName);
  return drv && drv.capacity ? drv.capacity : 99999999;
};

export const getCategoryAggregateOutflow = (
  validProducts: Product[],
  allocatedQuantities: { [productId: string]: number }
) => {
  const catOutflow: { [category: string]: { weight: number; packs: number } } = {};
  validProducts.forEach((p) => {
    if (!catOutflow[p.category]) {
      catOutflow[p.category] = { weight: 0, packs: 0 };
    }
    const qty = allocatedQuantities[p.id] || 0;
    catOutflow[p.category].weight += qty;
    const divider = p.unitWeight;
    if (divider > 0) {
      catOutflow[p.category].packs += qty / divider;
    }
  });
  return catOutflow;
};

export const getCategoryAggregateStock = (
  validProducts: Product[],
  getProductStock: (id: string, defaultStock: number) => number,
  allocatedQuantities: { [productId: string]: number }
) => {
  const catStock: { [category: string]: { totalStock: number; totalRemaining: number; totalStockCartons: number; totalRemainingCartons: number } } = {};
  validProducts.forEach((p) => {
    if (!catStock[p.category]) {
      catStock[p.category] = { totalStock: 0, totalRemaining: 0, totalStockCartons: 0, totalRemainingCartons: 0 };
    }
    const stock = getProductStock(p.id, p.defaultStock);
    const allocated = allocatedQuantities[p.id] || 0;
    catStock[p.category].totalStock += stock;
    catStock[p.category].totalRemaining += (stock - allocated);
    const divider = p.realCartonWeight && p.realCartonWeight > 0 ? p.realCartonWeight : p.unitWeight;
    if (divider > 0) {
      catStock[p.category].totalStockCartons += stock / divider;
      catStock[p.category].totalRemainingCartons += (stock - allocated) / divider;
    }
  });
  return catStock;
};

export const getCustomWarehouseSummary = (
  validProducts: Product[],
  allocatedQuantities: { [productId: string]: number }
) => {
  let badam = 0, sunflower = 0, soya = 0, cashew = 0, khaleeji = 0, corn = 0, snack = 0;
  validProducts.forEach((p) => {
    const qty = allocatedQuantities[p.id] || 0;
    const cat = p.category;
    if (cat === "بادام زمینی") badam += qty;
    else if (cat === "آفتابگردان") sunflower += qty;
    else if (cat === "سویا") soya += qty;
    else if (cat === "بادام هندی") cashew += qty;
    else if (cat === "خلیجی") khaleeji += qty;
    else if (cat === "ذرت کبابی") corn += qty;
    else if (cat && (cat.startsWith("اسنک") || cat.includes("اسنک"))) snack += qty;
  });
  const total = badam + sunflower + soya + cashew + khaleeji + corn + snack;
  return { badam, sunflower, soya, cashew, khaleeji, corn, snack, total };
};

export const getCustomRemainingStockSummary = (
  validProducts: Product[],
  getProductStock: (id: string, defaultStock: number) => number,
  allocatedQuantities: { [productId: string]: number }
) => {
  let badam = 0, sunflower = 0, soya = 0, cashew = 0, khaleeji = 0, corn = 0, snack = 0;
  validProducts.forEach((p) => {
    const stock = getProductStock(p.id, p.defaultStock);
    const sold = allocatedQuantities[p.id] || 0;
    const remaining = stock - sold;
    const cat = p.category;
    if (cat === "بادام زمینی") badam += remaining;
    else if (cat === "آفتابگردان") sunflower += remaining;
    else if (cat === "سویا") soya += remaining;
    else if (cat === "بادام هندی") cashew += remaining;
    else if (cat === "خلیجی") khaleeji += remaining;
    else if (cat === "ذرت کبابی") corn += remaining;
    else if (cat && (cat.startsWith("اسنک") || cat.includes("اسنک"))) snack += remaining;
  });
  const total = badam + sunflower + soya + cashew + khaleeji + corn + snack;
  return { badam, sunflower, soya, cashew, khaleeji, corn, snack, total };
};
