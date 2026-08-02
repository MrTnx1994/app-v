import React from "react";
import { motion } from "motion/react";
import { Truck, Package, Save, RotateCcw, Plus, Edit2, Trash2 } from "lucide-react";
import { Driver, Product } from "../types";
import { COLOR_PRESETS } from "../utils/colorPresets";
import { Pagination } from "./Pagination";

const DRIVERS_TABLE_PAGE_SIZE = 8;
const PRODUCTS_TABLE_PAGE_SIZE = 12;

interface ConfigScreenProps {
  editingDriverName: string | null;
  newDriverName: string;
  setNewDriverName: (val: string) => void;
  newDriverVehicle: string;
  setNewDriverVehicle: (val: string) => void;
  newDriverColor: string;
  setNewDriverColor: (val: string) => void;
  handleAddDriver: () => void;
  handleCancelEditDriver: () => void;
  editingProductId: string | null;
  newProductCategory: string;
  setNewProductCategory: (val: string) => void;
  newProductFlavor: string;
  setNewProductFlavor: (val: string) => void;
  newProductWeight: number;
  setNewProductWeight: (val: number) => void;
  newProductRealCartonWeight: number;
  setNewProductRealCartonWeight: (val: number) => void;
  newProductStock: number;
  setNewProductStock: (val: number) => void;
  handleAddProduct: () => void;
  handleCancelEditProduct: () => void;
  drivers: Driver[];
  setDrivers: (drivers: Driver[]) => void;
  products: Product[];
  driversTablePage: number;
  setDriversTablePage: (page: number) => void;
  handleEditDriver: (driver: Driver) => void;
  handleDeleteDriver: (driverName: string) => void;
  saveMasterConfig: (drivers: Driver[], products: Product[]) => void;
  showNotification: (type: "success" | "error" | "info", msg: string) => void;
  productTableFilter: string;
  setProductTableFilter: (filter: string) => void;
  productsTablePage: number;
  setProductsTablePage: (page: number) => void;
  handleEditProduct: (product: Product) => void;
  handleDeleteProduct: (productId: string) => void;
}

export function ConfigScreen({
  editingDriverName,
  newDriverName,
  setNewDriverName,
  newDriverVehicle,
  setNewDriverVehicle,
  newDriverColor,
  setNewDriverColor,
  handleAddDriver,
  handleCancelEditDriver,
  editingProductId,
  newProductCategory,
  setNewProductCategory,
  newProductFlavor,
  setNewProductFlavor,
  newProductWeight,
  setNewProductWeight,
  newProductRealCartonWeight,
  setNewProductRealCartonWeight,
  newProductStock,
  setNewProductStock,
  handleAddProduct,
  handleCancelEditProduct,
  drivers,
  setDrivers,
  products,
  driversTablePage,
  setDriversTablePage,
  handleEditDriver,
  handleDeleteDriver,
  saveMasterConfig,
  showNotification,
  productTableFilter,
  setProductTableFilter,
  productsTablePage,
  setProductsTablePage,
  handleEditProduct,
  handleDeleteProduct,
}: ConfigScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-lg font-extrabold text-slate-900">تنظیمات پایه، تعریف کالاها و مدیریت خودروها</h2>
        <p className="text-xs text-slate-500">تنظیم ساختار کالا، رانندگان و مدیریت کالاها</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-cyan-600" />
              {editingDriverName ? "ویرایش اطلاعات راننده" : "تعریف راننده و ناوگان جدید"}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-bold block">نام راننده:</label>
                <input
                  type="text"
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  placeholder="مثلا شفیعی"
                  className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-2.5 w-full text-xs font-bold focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-bold block">نوع وسیله نقلیه:</label>
                <input
                  type="text"
                  value={newDriverVehicle}
                  onChange={(e) => setNewDriverVehicle(e.target.value)}
                  placeholder="مثلا نیسان"
                  className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-2.5 w-full text-xs font-bold focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-[11px] text-slate-500 font-bold block">رنگ ستون در جدول (تم نمایشی):</label>
                <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl justify-start">
                  {COLOR_PRESETS.map((p) => {
                    const isSelected = newDriverColor === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setNewDriverColor(p.id)}
                        className={`w-6 h-6 rounded-lg border transition-all cursor-pointer shadow-sm relative ${
                          isSelected 
                            ? "ring-2 ring-cyan-500 scale-110 border-cyan-500 z-10" 
                            : "border-slate-300 hover:scale-105"
                        }`}
                        style={{ backgroundColor: p.hex }}
                      >
                        {isSelected && (
                          <span className="absolute inset-0 flex items-center justify-center text-white font-bold drop-shadow-md text-xs">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {editingDriverName ? (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAddDriver}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  ذخیره تغییرات راننده
                </button>
                <button
                  onClick={handleCancelEditDriver}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-200 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  انصراف
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddDriver}
                className="mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs w-full transition shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                افزودن راننده جدید به ناوگان
              </button>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-cyan-600" />
              {editingProductId ? "ویرایش اطلاعات کالا" : "تعریف کالا و طعم جدید"}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-bold block">دسته‌بندی اصلی محصول:</label>
                <select
                  value={newProductCategory}
                  onChange={(e) => {
                    setNewProductCategory(e.target.value);
                    if (e.target.value === "بادام زمینی") { setNewProductWeight(10); setNewProductRealCartonWeight(10); }
                    else if (e.target.value === "آفتابگردان") { setNewProductWeight(10); setNewProductRealCartonWeight(10); }
                    else if (e.target.value === "سویا") { setNewProductWeight(10); setNewProductRealCartonWeight(10); }
                    else if (e.target.value === "بادام هندی") { setNewProductWeight(5); setNewProductRealCartonWeight(5); }
                    else if (e.target.value === "خلیجی") { setNewProductWeight(8); setNewProductRealCartonWeight(8); }
                    else if (e.target.value === "ذرت کبابی") { setNewProductWeight(8); setNewProductRealCartonWeight(8); }
                    else if (e.target.value === "اسنک بیوگلز") { setNewProductWeight(3.5); setNewProductRealCartonWeight(2); }
                    else if (e.target.value === "اسنک انگشتی") { setNewProductWeight(3); setNewProductRealCartonWeight(2); }
                    else if (e.target.value === "اسنک لوله ای") { setNewProductWeight(3.5); setNewProductRealCartonWeight(2); }
                    else if (e.target.value === "اسنک حلقه ای") { setNewProductWeight(3); setNewProductRealCartonWeight(2); }
                    else if (e.target.value === "اسنک حلزونی") { setNewProductWeight(3.5); setNewProductRealCartonWeight(2); }
                    else if (e.target.value === "اسنک مخلوط") { setNewProductWeight(5); setNewProductRealCartonWeight(4); }
                    else if (e.target.value === "میوه خشک مخلوط 500") { setNewProductWeight(5); setNewProductRealCartonWeight(5); }
                    else if (e.target.value === "طعم") { setNewProductWeight(10); setNewProductRealCartonWeight(10); }
                  }}
                  className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-2.5 w-full text-xs font-bold focus:outline-none focus:border-cyan-500 transition"
                >
                  <option value="بادام زمینی">بادام زمینی</option>
                  <option value="آفتابگردان">آفتابگردان</option>
                  <option value="سویا">سویا</option>
                  <option value="بادام هندی">بادام هندی</option>
                  <option value="خلیجی">خلیجی</option>
                  <option value="ذرت کبابی">ذرت کبابی</option>
                  <option value="اسنک بیوگلز">اسنک بیوگلز</option>
                  <option value="اسنک انگشتی">اسنک انگشتی</option>
                  <option value="اسنک لوله ای">اسنک لوله ای</option>
                  <option value="اسنک حلقه ای">اسنک حلقه ای</option>
                  <option value="اسنک حلزونی">اسنک حلزونی</option>
                  <option value="اسنک مخلوط">اسنک مخلوط</option>
                  <option value="میوه خشک مخلوط 500">میوه خشک</option>
                  <option value="طعم">طعم</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-bold block">طعم محصول:</label>
                <input
                  type="text"
                  value={newProductFlavor}
                  onChange={(e) => setNewProductFlavor(e.target.value)}
                  placeholder="مثلا پیازجعفری، کچاپ"
                  className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-2.5 w-full text-xs font-bold focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-bold block">وزن هر بسته (کیلوگرم) (حجمی):</label>
                <input
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  step="0.1"
                  value={newProductWeight}
                  onChange={(e) => setNewProductWeight(parseFloat(e.target.value) || 0)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-2.5 w-full text-xs font-bold font-mono focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-bold block">وزن واقعی کارتن (کیلوگرم):</label>
                <input
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  step="0.1"
                  value={newProductRealCartonWeight || 0}
                  onChange={(e) => setNewProductRealCartonWeight(parseFloat(e.target.value) || 0)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-2.5 w-full text-xs font-bold font-mono focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-[11px] text-slate-500 font-bold block">موجودی اولیه پیش‌فرض انبار (کیلو):</label>
                <input
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={newProductStock}
                  onChange={(e) => setNewProductStock(parseInt(e.target.value, 10) || 0)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-2.5 w-full text-xs font-bold font-mono focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
            </div>

            {editingProductId ? (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAddProduct}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  ذخیره تغییرات کالا
                </button>
                <button
                  onClick={handleCancelEditProduct}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-200 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  انصراف
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddProduct}
                className="mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs w-full transition shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                ثبت نهایی کالا در درخت محصول
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-slate-700 pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-slate-500" />
            رانندگان ثبت شده فعلی در سیستم
          </h4>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-right text-[11px] text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 font-bold">راننده</th>
                  <th className="py-2.5 text-center font-bold">نوع خودرو</th>
                  <th className="py-2.5 text-center font-bold">رنگ اختصاصی</th>
                  <th className="py-2.5 text-left pl-3 font-bold w-24">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drivers
                  .slice((driversTablePage - 1) * DRIVERS_TABLE_PAGE_SIZE, driversTablePage * DRIVERS_TABLE_PAGE_SIZE)
                  .map((drv) => (
                  <tr key={drv.name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-800 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: COLOR_PRESETS.find(p => p.id === drv.color)?.hex || '#ccc' }}></div>
                      {drv.name}
                    </td>
                    <td className="py-2.5 text-center text-slate-500">{drv.vehicle}</td>
                    <td className="py-2.5 text-center">
                      <div className="grid grid-cols-7 gap-1 max-w-[130px] mx-auto bg-slate-50 p-1 rounded-lg border border-slate-200">
                        {COLOR_PRESETS.map((p) => {
                          const isSelected = (drv.color || "pink-light") === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                const updated = drivers.map((d) => 
                                  d.name === drv.name ? { ...d, color: p.id } : d
                                );
                                setDrivers(updated);
                                saveMasterConfig(updated, products);
                                showNotification("success", `رنگ راننده ${drv.name} بروزرسانی شد.`);
                              }}
                              className={`w-3.5 h-3.5 rounded border transition-all cursor-pointer shadow-sm relative ${
                                isSelected 
                                  ? "ring-1.5 ring-cyan-500 scale-110 border-cyan-500 z-10" 
                                  : "border-slate-300 hover:scale-110"
                              }`}
                              style={{ backgroundColor: p.hex }}
                            >
                              {isSelected && (
                                <span className="absolute inset-0 flex items-center justify-center text-white text-[7px] font-bold drop-shadow-sm">✓</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-2.5 text-left pl-3 flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleEditDriver(drv)}
                        className="p-1 text-slate-400 hover:text-cyan-600 transition cursor-pointer"
                        title="ویرایش"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDriver(drv.name)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={driversTablePage}
            totalPages={Math.max(1, Math.ceil(drivers.length / DRIVERS_TABLE_PAGE_SIZE))}
            onPageChange={setDriversTablePage}
            totalItems={drivers.length}
            pageSize={DRIVERS_TABLE_PAGE_SIZE}
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-slate-500" />
              کالاهای ثبت شده فعلی در سیستم
            </h4>
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <label className="text-[10px] text-slate-500 font-bold whitespace-nowrap">فیلتر دسته:</label>
              <select
                value={productTableFilter}
                onChange={(e) => setProductTableFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-1 text-[11px] font-bold focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="all">همه دسته‌ها</option>
                <option value="بادام زمینی">بادام زمینی</option>
                <option value="آفتابگردان">آفتابگردان</option>
                <option value="سویا">سویا</option>
                <option value="بادام هندی">بادام هندی</option>
                <option value="خلیجی">خلیجی</option>
                <option value="ذرت کبابی">ذرت کبابی</option>
                <option value="اسنک بیوگلز">اسنک بیوگلز</option>
                <option value="اسنک انگشتی">اسنک انگشتی</option>
                <option value="اسنک لوله ای">اسنک لوله ای</option>
                <option value="اسنک حلقه ای">اسنک حلقه ای</option>
                <option value="اسنک حلزونی">اسنک حلزونی</option>
                <option value="اسنک مخلوط">اسنک مخلوط</option>
                <option value="میوه خشک مخلوط 500">میوه خشک</option>
                <option value="طعم">طعم</option>
              </select>
            </div>
          </div>
          <div className="overflow-auto rounded-xl border border-slate-200 max-h-[650px] min-h-[350px]">
            <table className="w-full text-right text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="py-2 px-3 text-right">دسته‌بندی اصلی</th>
                  <th className="py-2 text-center">طعم محصول</th>
                  <th className="py-2 text-center">وزن واحد (حجمی)</th>
                  <th className="py-2 text-center">وزن واقعی کارتن</th>
                  <th className="py-2 text-left pl-3 w-24">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const filteredProductsForTable = products.filter(
                    (p) => productTableFilter === "all" || p.category === productTableFilter
                  );
                  return filteredProductsForTable
                    .slice((productsTablePage - 1) * PRODUCTS_TABLE_PAGE_SIZE, productsTablePage * PRODUCTS_TABLE_PAGE_SIZE)
                    .map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2 px-3 text-right font-bold text-slate-800">{p.category}</td>
                      <td className="py-2 text-center text-slate-500">{p.flavor || "ساده"}</td>
                      <td className="py-2 text-center font-mono font-bold text-cyan-600">{p.unitWeight} kg</td>
                      <td className="py-2 text-center font-mono font-bold text-emerald-600">{p.realCartonWeight || p.unitWeight} kg</td>
                      <td className="py-2 text-left pl-3 flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleEditProduct(p)}
                          className="p-1 text-slate-400 hover:text-cyan-600 transition cursor-pointer"
                          title="ویرایش"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                    ));
                })()}
              </tbody>
            </table>
          </div>
          <Pagination
            page={productsTablePage}
            totalPages={Math.max(1, Math.ceil(
              products.filter((p) => productTableFilter === "all" || p.category === productTableFilter).length / PRODUCTS_TABLE_PAGE_SIZE
            ))}
            onPageChange={setProductsTablePage}
            totalItems={products.filter((p) => productTableFilter === "all" || p.category === productTableFilter).length}
            pageSize={PRODUCTS_TABLE_PAGE_SIZE}
          />
        </div>
      </div>
    </motion.div>
  );
}
