import React, { useState, useEffect, useRef } from "react";
import {
  Truck,
  Calendar,
  TrendingUp,
  Layers,
  FileText,
  Settings,
  AlertTriangle,
  Award,
  Trophy,
  CheckCircle,
  Download,
  Search,
  Filter,
  Upload,
  Trash2,
  XCircle,
  ZoomIn,
  ZoomOut,
  Plus,
  User,
  Users,
  MapPin,
  RotateCcw,
  Save,
  Package,
  Printer,
  ChevronRight,
  ChevronLeft,
  LogOut,
  RefreshCw,
  Sliders,
  FileSpreadsheet,
  ExternalLink,
  Edit2,
  Percent,
  Scale,
  Archive,
  Calculator,
  Sun,
  Moon
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import { getTodayShamsi, getTomorrowShamsi, SHAMSI_MONTHS, getShamsiWeekday, getTomorrowShamsiDate } from "./utils/shamsi";
import { Product, Driver, InvoiceRun, DailyPlan } from "./types";
import { useAuth } from "./context/AuthContext";
import { useDateManagement } from "./hooks/useDateManagement";
import { useInvoiceManagement } from "./hooks/useInvoiceManagement";
import { apiFetch, setAuthToken } from "./lib/apiClient";
import { Pagination } from "./components/Pagination";
import { LoginScreen } from "./components/LoginScreen";
import { ActivityLogScreen } from "./components/ActivityLogScreen";
import { UserManagementScreen } from "./components/UserManagementScreen";
import { StockForecastScreen } from "./components/StockForecastScreen";
import { logActivity } from "./lib/activityLog";

const COLOR_PRESETS = [
  { id: "pink-light", hex: "#ECA5B8" },
  { id: "pink-dark", hex: "#E6787E" },
  { id: "blue-light", hex: "#BBD5ED" },
  { id: "blue-dark", hex: "#89B6E2" },
  { id: "green-light", hex: "#A3CFA1" },
  { id: "green-dark", hex: "#10B960" },
  { id: "yellow-light", hex: "#FFE8A3" },
  { id: "yellow-dark", hex: "#CCA01A" },
  { id: "peach-light", hex: "#FCD3B6" },
  { id: "peach-medium", hex: "#FAAC84" },
  { id: "orange-medium", hex: "#F98F45" },
  { id: "orange-dark", hex: "#EE7E11" },
  { id: "gold", hex: "#FFC000" },
];

interface EditableProductCellProps {
  value: string;
  onSave: (newValue: string) => void;
}

function EditableProductCell({ value, onSave }: EditableProductCellProps) {
  const [tempValue, setTempValue] = useState(value);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSave(tempValue);
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setTempValue(value);
      e.currentTarget.blur();
    }
  };

  const handleBlur = () => {
    if (tempValue !== value) {
      onSave(tempValue);
    }
  };

  return (
    <input
      type="text"
      value={tempValue}
      onChange={(e) => setTempValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="w-full text-center bg-white border border-slate-300 rounded-lg p-1 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-sm"
    />
  );
}

export default function App() {
  const { user, role, loading: authLoading, logout } = useAuth();
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const validProducts = React.useMemo(
    () => products.filter(p => p.category && p.category.trim() !== ''),
    [products]
  );
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);
  
  const {
    todayShamsi,
    shamsiYear, setShamsiYear,
    shamsiMonth, setShamsiMonth,
    shamsiDay, setShamsiDay,
    showDatePicker, setShowDatePicker,
    tempYear, setTempYear,
    tempMonth, setTempMonth,
    tempDay, setTempDay,
    manualDateInput, setManualDateInput,
    formattedDate
  } = useDateManagement();


  const { invoices, setInvoices, visibleInvoices } = useInvoiceManagement([], role, user);
  
  const [manualStockOverrides, setManualStockOverrides] = useState<{ [productId: string]: number }>({});
  const [computedStartingStocks, setComputedStartingStocks] = useState<{ [productId: string]: number }>({});
  
  const [activeTab, setActiveTab] = useState<"dashboard" | "planning" | "drivers" | "warehouse" | "waybill" | "config" | "logs" | "users" | "forecast">("dashboard");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [isProductEditMode, setIsProductEditMode] = useState<boolean>(false);
  const [dashboardRightTab, setDashboardRightTab] = useState<"stock" | "category_sales">("category_sales");
  const [selectedCategorySales, setSelectedCategorySales] = useState<string>("بادام زمینی");
  const [realSales, setRealSales] = useState<{ [productId: string]: number }>({});
  const [realIncoming, setRealIncoming] = useState<{ [productId: string]: number }>({});
  const [invoiceStats, setInvoiceStats] = useState<{ driverStats: { [driver: string]: number }; totalOrders: number }>({ driverStats: {}, totalOrders: 0 });

  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverVehicle, setNewDriverVehicle] = useState("نیسان");
  const [newDriverColor, setNewDriverColor] = useState("pink-light");
  const [editingDriverName, setEditingDriverName] = useState<string | null>(null);

  const [newProductCategory, setNewProductCategory] = useState("بادام زمینی");
  const [newProductFlavor, setNewProductFlavor] = useState("");
  const [newProductWeight, setNewProductWeight] = useState(10);
  const [newProductStock, setNewProductStock] = useState(200);
  const [newProductRealCartonWeight, setNewProductRealCartonWeight] = useState(0);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productTableFilter, setProductTableFilter] = useState<string>("all");
  const [detailedInventoryFilter, setDetailedInventoryFilter] = useState<string>("all");
  const [driversTablePage, setDriversTablePage] = useState(1);
  const [productsTablePage, setProductsTablePage] = useState(1);
  const DRIVERS_TABLE_PAGE_SIZE = 8;
  const PRODUCTS_TABLE_PAGE_SIZE = 10;

  const [driverSearchSlots, setDriverSearchSlots] = useState<string[]>(Array(10).fill(""));
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [driverPrintPreview, setDriverPrintPreview] = useState<boolean>(false);
  const [printDriverName, setPrintDriverName] = useState<string | null>(null);

  const invoicesRef = useRef(invoices);
  const overridesRef = useRef(manualStockOverrides);
  const slotsRef = useRef(driverSearchSlots);
  useEffect(() => { invoicesRef.current = invoices; }, [invoices]);
  useEffect(() => { overridesRef.current = manualStockOverrides; }, [manualStockOverrides]);
  useEffect(() => { slotsRef.current = driverSearchSlots; }, [driverSearchSlots]);

  const lastSyncedSnapshotRef = useRef<string>("");
  const warnedAboutConflictRef = useRef<boolean>(false);
  const makeSnapshot = (inv: InvoiceRun[], ov: { [k: string]: number }, slots: string[]) =>
    JSON.stringify({ inv, ov, slots });

  const [excelPasteText, setExcelPasteText] = useState("");
  const [showPasteModal, setShowPasteModal] = useState(false);

  const [showCustomerSearchModal, setShowCustomerSearchModal] = useState(false);
  const [customerSearchName, setCustomerSearchName] = useState("");
  const [customerSearchFromDate, setCustomerSearchFromDate] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<any[] | null>(null);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [customerSearchError, setCustomerSearchError] = useState<string | null>(null);

  const openCustomerSearchModal = () => {
    const today = getTodayShamsi();
    const todayStr = `${today.year}/${today.month.toString().padStart(2, '0')}/${today.day.toString().padStart(2, '0')}`;
    setCustomerSearchFromDate(todayStr);
    setCustomerSearchName('');
    setCustomerSearchResults(null);
    setCustomerSearchError(null);
    setShowCustomerSearchModal(true);
  };

  const handleCustomerSearch = async () => {
    if (!customerSearchName.trim()) {
      setCustomerSearchError("لطفاً نام مشتری را وارد کنید.");
      return;
    }
    if (!customerSearchFromDate.trim()) {
      setCustomerSearchError("لطفاً تاریخ شروع جستجو را وارد کنید (مثال: 1405/01/01).");
      return;
    }
    setCustomerSearchLoading(true);
    setCustomerSearchError(null);
    try {
      const params = new URLSearchParams({
        name: customerSearchName.trim(),
        fromDate: customerSearchFromDate.trim()
      });

      const res = await apiFetch(`/api/search/customer?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "خطا در جستجو");
      }

      setCustomerSearchResults(data.results || []);
    } catch (err: any) {
      console.error("Customer search error:", err);
      setCustomerSearchError(err.message || "خطا در برقراری ارتباط با سرور.");
      setCustomerSearchResults(null);
    } finally {
      setCustomerSearchLoading(false);
    }
  };

  const [backupFromDate, setBackupFromDate] = useState("");
  const [backupToDate, setBackupToDate] = useState("");
  const [backupDownloading, setBackupDownloading] = useState(false);
  const [backupRestoring, setBackupRestoring] = useState(false);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const [resettingDailyData, setResettingDailyData] = useState(false);
  const [showFactoryResetConfirm, setShowFactoryResetConfirm] = useState(false);
  const [factoryResetConfirmText, setFactoryResetConfirmText] = useState("");
  const [factoryResetting, setFactoryResetting] = useState(false);

  type GridCellSelection = { startRow: number; startCol: number; endRow: number; endCol: number };
  const [cellSelection, setCellSelection] = useState<GridCellSelection | null>(null);
  const isDraggingSelectionRef = useRef(false);
  const selectionAnchorRef = useRef<{ row: number; col: number } | null>(null);
  const dragCellsCacheRef = useRef<{ el: HTMLElement; row: number; col: number }[]>([]);
  const dragRafIdRef = useRef<number | null>(null);
  const pendingDragRangeRef = useRef<GridCellSelection | null>(null);
  const sumBarCountRef = useRef<HTMLSpanElement>(null);
  const sumBarValueRef = useRef<HTMLSpanElement>(null);

  const HIGHLIGHT_CLASSES = ["ring-2", "ring-inset", "ring-emerald-500", "bg-emerald-100/60"];

  const visibleProductsForGrid = React.useMemo(
    () => validProducts.filter((p) => selectedCategoryFilter === "all" || p.category === selectedCategoryFilter),
    [validProducts, selectedCategoryFilter]
  );

  const buildDragCellsCache = () => {
    const container = document.getElementById("main-unified-grid");
    if (!container) {
      dragCellsCacheRef.current = [];
      return;
    }
    const nodeList = container.querySelectorAll<HTMLElement>("td[data-row][data-col]");
    const cells: { el: HTMLElement; row: number; col: number }[] = [];
    nodeList.forEach((el) => {
      const row = parseInt(el.getAttribute("data-row") || "-1", 10);
      const col = parseInt(el.getAttribute("data-col") || "-1", 10);
      if (row >= 0 && col >= 0) cells.push({ el, row, col });
    });
    dragCellsCacheRef.current = cells;
  };

  const applyDragHighlightAndSum = (sel: GridCellSelection | null) => {
    const range = sel ? {
      minRow: Math.min(sel.startRow, sel.endRow),
      maxRow: Math.max(sel.startRow, sel.endRow),
      minCol: Math.min(sel.startCol, sel.endCol),
      maxCol: Math.max(sel.startCol, sel.endCol),
    } : null;

    let count = 0;
    let sum = 0;

    dragCellsCacheRef.current.forEach(({ el, row, col }) => {
      const inRange = !!range && row >= range.minRow && row <= range.maxRow && col >= range.minCol && col <= range.maxCol;
      if (inRange) {
        el.classList.add(...HIGHLIGHT_CLASSES);
        const product = visibleProductsForGrid[row];
        const inv = invoicesRef.current[col];
        if (product && inv) {
          count++;
          sum += Number(inv.quantities[product.id]) || 0;
        }
      } else {
        el.classList.remove(...HIGHLIGHT_CLASSES);
      }
    });

    if (sumBarCountRef.current) sumBarCountRef.current.textContent = count.toLocaleString("en-US");
    if (sumBarValueRef.current) sumBarValueRef.current.textContent = sum.toLocaleString("en-US");
  };

  const flushDragSelection = () => {
    dragRafIdRef.current = null;
    if (pendingDragRangeRef.current) {
      applyDragHighlightAndSum(pendingDragRangeRef.current);
    }
  };

  const scheduleDragSelectionUpdate = (sel: GridCellSelection) => {
    pendingDragRangeRef.current = sel;
    if (dragRafIdRef.current === null) {
      dragRafIdRef.current = requestAnimationFrame(flushDragSelection);
    }
  };

  const gridZoomRef = useRef(100);
  const gridZoomWrapperRef = useRef<HTMLDivElement>(null);
  const zoomLabelRef = useRef<HTMLSpanElement>(null);
  const ZOOM_STEP = 10;
  const ZOOM_MIN = 50;
  const ZOOM_MAX = 200;

  const applyZoom = (newZoom: number) => {
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, newZoom));
    gridZoomRef.current = clamped;
    if (gridZoomWrapperRef.current) {
      // Deliberately using the CSS `zoom` property (not `transform: scale`).
      // `zoom` reflows layout and updates scrollWidth, so the grid's
      // horizontal scrollbar correctly grows/shrinks with it. `transform`
      // does not affect layout size at all, which breaks scrolling on this
      // wide, horizontally-scrollable table (content gets clipped or leaves
      // a stale empty scroll area depending on zoom direction).
      gridZoomWrapperRef.current.style.zoom = `${clamped}%`;
    }
    if (zoomLabelRef.current) zoomLabelRef.current.textContent = `${clamped}%`;
  };

  const handleZoomIn = () => applyZoom(gridZoomRef.current + ZOOM_STEP);
  const handleZoomOut = () => applyZoom(gridZoomRef.current - ZOOM_STEP);
  const handleZoomReset = () => applyZoom(100);

  useEffect(() => {
    const onMouseUp = () => {
      if (!isDraggingSelectionRef.current) return;
      isDraggingSelectionRef.current = false;
      if (dragRafIdRef.current !== null) {
        cancelAnimationFrame(dragRafIdRef.current);
        dragRafIdRef.current = null;
      }
      if (pendingDragRangeRef.current) {
        setCellSelection(pendingDragRangeRef.current);
        pendingDragRangeRef.current = null;
      }
    };
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      if (dragRafIdRef.current !== null) cancelAnimationFrame(dragRafIdRef.current);
    };
  }, []);

  useEffect(() => {
    setCellSelection(null);
    selectionAnchorRef.current = null;
  }, [formattedDate, selectedCategoryFilter]);

  const handleGridCellMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    isDraggingSelectionRef.current = true;
    buildDragCellsCache();
    let range: GridCellSelection;
    if (e.shiftKey && selectionAnchorRef.current) {
      range = { startRow: selectionAnchorRef.current.row, startCol: selectionAnchorRef.current.col, endRow: row, endCol: col };
    } else {
      selectionAnchorRef.current = { row, col };
      range = { startRow: row, startCol: col, endRow: row, endCol: col };
    }
    setCellSelection(range);
    applyDragHighlightAndSum(range);
  };

  const handleGridCellMouseEnter = (row: number, col: number) => {
    if (isDraggingSelectionRef.current && selectionAnchorRef.current) {
      scheduleDragSelectionUpdate({ startRow: selectionAnchorRef.current.row, startCol: selectionAnchorRef.current.col, endRow: row, endCol: col });
    }
  };

  const gridSelectionRange = cellSelection ? {
    minRow: Math.min(cellSelection.startRow, cellSelection.endRow),
    maxRow: Math.max(cellSelection.startRow, cellSelection.endRow),
    minCol: Math.min(cellSelection.startCol, cellSelection.endCol),
    maxCol: Math.max(cellSelection.startCol, cellSelection.endCol),
  } : null;

  const isGridCellSelected = (row: number, col: number): boolean => {
    if (!gridSelectionRange) return false;
    return row >= gridSelectionRange.minRow && row <= gridSelectionRange.maxRow &&
           col >= gridSelectionRange.minCol && col <= gridSelectionRange.maxCol;
  };

  const gridSelectionStats = React.useMemo(() => {
    if (!gridSelectionRange) return { count: 0, sum: 0 };
    let sum = 0;
    let count = 0;
    for (let r = gridSelectionRange.minRow; r <= gridSelectionRange.maxRow; r++) {
      const product = visibleProductsForGrid[r];
      if (!product) continue;
      for (let c = gridSelectionRange.minCol; c <= gridSelectionRange.maxCol; c++) {
        const inv = invoices[c];
        if (!inv) continue;
        count++;
        sum += Number(inv.quantities[product.id]) || 0;
      }
    }
    return { count, sum };
  }, [gridSelectionRange, visibleProductsForGrid, invoices]);

  const handleClearSelectedGridCells = () => {
    if (!gridSelectionRange) return;
    const productIdsInSelection = new Set<string>();
    for (let r = gridSelectionRange.minRow; r <= gridSelectionRange.maxRow; r++) {
      const product = visibleProductsForGrid[r];
      if (product) productIdsInSelection.add(product.id);
    }
    setInvoices(
      invoices.map((inv, colIdx) => {
        if (colIdx < gridSelectionRange.minCol || colIdx > gridSelectionRange.maxCol) return inv;
        const newQuantities = { ...inv.quantities };
        productIdsInSelection.forEach((pid) => { delete newQuantities[pid]; });
        return { ...inv, quantities: newQuantities };
      })
    );
    showNotification("info", `مقادیر ${gridSelectionStats.count} سلول انتخاب‌شده پاک شد.`);
    setCellSelection(null);
    selectionAnchorRef.current = null;
  };

  useEffect(() => {
    if (user && !authLoading) {
      loadConfig();
      loadSalesStatistics();
    }
  }, [user, authLoading, role]);

  useEffect(() => {
    setProductsTablePage(1);
  }, [productTableFilter]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(drivers.length / DRIVERS_TABLE_PAGE_SIZE));
    if (driversTablePage > totalPages) setDriversTablePage(totalPages);
  }, [drivers.length, driversTablePage]);

  useEffect(() => {
    const visibleCount = products.filter((p) => productTableFilter === "all" || p.category === productTableFilter).length;
    const totalPages = Math.max(1, Math.ceil(visibleCount / PRODUCTS_TABLE_PAGE_SIZE));
    if (productsTablePage > totalPages) setProductsTablePage(totalPages);
  }, [products, productTableFilter, productsTablePage]);

  useEffect(() => {
    if (user && !authLoading && products.length > 0) {
      loadDailyPlan(formattedDate);
    }
  }, [formattedDate, products, user, authLoading, role]);

  useEffect(() => {
    if (!user || authLoading || products.length === 0) return;

    const POLL_INTERVAL_MS = 8000;

    const poll = async () => {
      if (document.hidden) return;
      try {
        const res = await apiFetch(`/api/load/${encodeURIComponent(formattedDate)}`);
        if (!res.ok) return;
        const payload = await res.json();

        const currentSnapshot = makeSnapshot(invoicesRef.current, overridesRef.current, slotsRef.current);
        const isLocallyDirty = currentSnapshot !== lastSyncedSnapshotRef.current;

        const remoteInvoices: InvoiceRun[] = payload.found && payload.data ? (payload.data.invoices || []) : [];
        const remoteOverrides: { [productId: string]: number } = payload.found && payload.data ? (payload.data.manualStockOverrides || {}) : {};
        const remoteSlots: string[] = payload.found && payload.data ? (payload.data.driverSearchSlots || Array(10).fill("")) : Array(10).fill("");
        const remoteSnapshot = makeSnapshot(remoteInvoices, remoteOverrides, remoteSlots);

        if (remoteSnapshot === currentSnapshot) {
          return;
        }

        if (isLocallyDirty) {
          if (!warnedAboutConflictRef.current) {
            warnedAboutConflictRef.current = true;
            showNotification("info", "شخص دیگری این تاریخ را تغییر داده است. بعد از ذخیره اطلاعات خودتان، صفحه را بررسی کنید.");
          }
          return;
        }

        setInvoices(remoteInvoices);
        setManualStockOverrides(remoteOverrides);
        setDriverSearchSlots(remoteSlots);
        if (payload.computedStartingStocks) {
          setComputedStartingStocks(payload.computedStartingStocks);
        }
        lastSyncedSnapshotRef.current = remoteSnapshot;
        warnedAboutConflictRef.current = false;
      } catch (e) {
        console.error("Live-sync poll failed", e);
      }
    };

    const intervalId = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [formattedDate, user, authLoading, products.length, role]);

  useEffect(() => {
    if (!user || authLoading) return;
    const STATS_POLL_INTERVAL_MS = 15000;
    const intervalId = setInterval(() => {
      if (document.hidden) return;
      loadSalesStatistics(undefined, true);
    }, STATS_POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [user, authLoading, formattedDate, role]);

  const renderCustomerSearchModal = () => (
    <>
      {showCustomerSearchModal && (
        <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-2 rounded-xl text-white">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    جستجوی کلی مشتری
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    جستجو در تمام فاکتورهای ثبت‌شده از یک تاریخ مشخص به بعد (فقط نمایش)
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCustomerSearchModal(false);
                  setCustomerSearchResults(null);
                  setCustomerSearchError(null);
                }}
                className="text-slate-400 hover:text-slate-700 transition p-1"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] text-slate-500 font-bold block">نام مشتری:</label>
                <input
                  type="text"
                  value={customerSearchName}
                  onChange={(e) => setCustomerSearchName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCustomerSearch(); }}
                  placeholder="مثلاً: احمدی"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
                  autoFocus
                />
              </div>
              <div className="w-full sm:w-52 space-y-1">
                <label className="text-[11px] text-slate-500 font-bold block">از تاریخ (شمسی):</label>
                <input
                  type="text"
                  value={customerSearchFromDate}
                  onChange={(e) => setCustomerSearchFromDate(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCustomerSearch(); }}
                  placeholder="1405/01/01"
                  dir="ltr"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>
              <button
                onClick={handleCustomerSearch}
                disabled={customerSearchLoading}
                className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-md disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                <Search className="w-4 h-4" />
                {customerSearchLoading ? "در حال جستجو..." : "جستجو"}
              </button>
            </div>

            {customerSearchError && (
              <div className="mx-5 mt-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-3 py-2 rounded-lg">
                {customerSearchError}
              </div>
            )}

            <div className="flex-1 overflow-auto p-5">
              {customerSearchResults === null ? (
                <div className="text-center text-slate-400 text-sm py-12">
                  نام مشتری و تاریخ شروع را وارد کرده و روی «جستجو» بزنید.
                </div>
              ) : customerSearchResults.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-12">
                  هیچ نتیجه‌ای برای «{customerSearchName}» از تاریخ {customerSearchFromDate} به بعد پیدا نشد.
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 font-bold">
                    {customerSearchResults.length.toLocaleString("fa-IR")} نتیجه پیدا شد:
                  </p>

                                    <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="p-2.5">تاریخ</th>
                        <th className="p-2.5">مشتری</th>
                        <th className="p-2.5">راننده</th>
                        <th className="p-2.5">مسیر</th>
                        <th className="p-2.5">نوبت</th>
                        <th className="p-2.5">جمع اقلام (کیلو)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerSearchResults.map((r: any, idx: number) => {
                        const totalKg: number = Object.values(r.invoice.quantities || {}).reduce<number>(
                          (sum, q) => sum + (Number(q) || 0), 0
                        );
                        return (
                          <React.Fragment key={`${r.date}-${r.invoice.id}-${idx}`}>
                          <tr className="hover:bg-slate-50/50">
                            <td className="p-2.5 font-mono text-slate-600">{r.date}</td>
                            <td className="p-2.5 font-bold text-slate-900">{r.invoice.customerName}</td>
                            <td className="p-2.5 text-slate-700">{r.invoice.driverName || "-"}</td>
                            <td className="p-2.5 text-slate-500">{r.invoice.destinationLocation || "-"}</td>
                            <td className="p-2.5 text-center text-slate-500">{r.invoice.round || 1}</td>
                            <td className="p-2.5 font-mono font-bold text-emerald-700">{totalKg.toLocaleString("en-US")}</td>
                          </tr>
                          <tr>
                            <td colSpan={6} className="p-0 bg-slate-50 border-b border-slate-200">
                              <div className="px-4 py-2 text-[10px]">
                                <span className="font-bold text-slate-700">ریز سفارشات: </span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {Object.entries(r.invoice.quantities || {}).map(([pid, qty]) => {
                                    const product = products.find(p => p.id === pid);
                                    const prodName = product ? `${product.category} ${product.flavor}` : pid;
                                    return (
                                      <span key={pid} className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                                        {prodName}: {qty}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (authLoading) return <div className="flex items-center justify-center min-h-screen">در حال بارگذاری...</div>;
  if (!user) return <LoginScreen />;

  const showNotification = (type: "success" | "error" | "info", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const loadSalesStatistics = async (dateToExclude?: string, silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const targetDate = dateToExclude || formattedDate;
      const [resSales, resIncoming, resInvoiceStats] = await Promise.all([
        apiFetch(`/api/statistics/sales?endDate=${encodeURIComponent(formattedDate)}`),
        apiFetch(`/api/statistics/incoming?endDate=${encodeURIComponent(formattedDate)}`),
        apiFetch(`/api/statistics/invoices?endDate=${encodeURIComponent(formattedDate)}`)
      ]);

      if (!resSales.ok || !resIncoming.ok || !resInvoiceStats.ok) {
        throw new Error("Failed to load statistics: Server returned an error");
      }
      
      const dataSales = await resSales.json();
      if (dataSales && dataSales.sales) {
        setRealSales(dataSales.sales);
      }

      const dataIncoming = await resIncoming.json();
      if (dataIncoming && dataIncoming.incoming) {
        setRealIncoming(dataIncoming.incoming);
      }

      const dataInvoices = await resInvoiceStats.json();
      if (dataInvoices) {
        setInvoiceStats(dataInvoices);
      }
    } catch (e) {
      console.error("Error loading statistics", e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/config");
      const config = await res.json();
      if (config.drivers && config.drivers.length > 0) {
        setDrivers(config.drivers);
      }
      if (config.products && config.products.length > 0) {
        setProducts(config.products);
      }
    } catch (e) {
      console.error("Error loading configuration", e);
      showNotification("error", "خطا در اتصال به سرور و دریافت تنظیمات اولیه.");
    } finally {
      setLoading(false);
    }
  };

  const loadDailyPlan = async (dateStr: string, silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await apiFetch(`/api/load/${encodeURIComponent(dateStr)}`);
      const payload = await res.json();
      
      if (payload.computedStartingStocks) {
        setComputedStartingStocks(payload.computedStartingStocks);
      } else {
        setComputedStartingStocks({});
      }
      
      let newInvoices: InvoiceRun[] = [];
      let newOverrides: { [productId: string]: number } = {};
      let newSlots: string[] = Array(10).fill("");

      if (payload.found && payload.data) {
        newInvoices = payload.data.invoices || [];
        newOverrides = payload.data.manualStockOverrides || {};
        newSlots = payload.data.driverSearchSlots || Array(10).fill("");
        setInvoices(newInvoices);
        setManualStockOverrides(newOverrides);
        setDriverSearchSlots(newSlots);
        if (!silent) showNotification("success", `برنامه توزیع تاریخ ${dateStr} با موفقیت بارگذاری شد.`);
      } else {
        setInvoices(newInvoices);
        setManualStockOverrides(newOverrides);
        setDriverSearchSlots(prev => prev.length ? prev : Array(10).fill(""));
        if (!silent) showNotification("info", `اطلاعاتی برای تاریخ ${dateStr} وجود ندارد. آماده ورود اطلاعات جدید.`);
      }
      lastSyncedSnapshotRef.current = makeSnapshot(newInvoices, newOverrides, newSlots);
      warnedAboutConflictRef.current = false;
      loadSalesStatistics(dateStr, silent);
    } catch (e) {
      console.error("Error loading daily plan", e);
      if (!silent) showNotification("error", "خطا در بازیابی اطلاعات توزیع روزانه.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const saveDailyPlan = async () => {
    try {
      setSaving(true);
      const planData: DailyPlan = {
        date: formattedDate,
        invoices,
        manualStockOverrides,
        driverSearchSlots
      };

      const res = await apiFetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formattedDate,
          data: planData,
          userEmail: user?.email || "unknown@system.com"
        })
      });

      const result = await res.json();
      if (result.status === "success") {
        showNotification("success", `اطلاعات تاریخ ${formattedDate} با موفقیت در بانک اطلاعاتی ذخیره شد.`);
        lastSyncedSnapshotRef.current = makeSnapshot(invoices, manualStockOverrides, driverSearchSlots);
        warnedAboutConflictRef.current = false;
        loadSalesStatistics();
      } else {
        showNotification("error", `خطا در ذخیره‌سازی: ${result.message}`);
      }
    } catch (e) {
      console.error("Error saving daily plan", e);
      showNotification("error", "خطا در ارسال اطلاعات به سرور.");
    } finally {
      setSaving(false);
    }
  };

  const saveMasterConfig = async (updatedDrivers: Driver[], updatedProducts: Product[]) => {
    try {
      const res = await apiFetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drivers: updatedDrivers,
          products: updatedProducts
        })
      });
      const result = await res.json();
      if (result.status === "success") {
        showNotification("success", "تنظیمات پایه و محصولات جدید با موفقیت ذخیره شدند.");
        loadSalesStatistics();
      }
    } catch (e) {
      console.error("Error saving master config", e);
      showNotification("error", "خطا در ذخیره‌سازی تنظیمات پایه.");
    }
  };

  const isSameDriver = (name1: string | null | undefined, name2: string | null | undefined): boolean => {
    if (!name1 || !name2) return false;
    const norm = (s: string) => s
      .trim()
      .replace(/[\u064A\u06CC]/g, 'ی')
      .replace(/[\u0643\u06A9]/g, 'ک')
      .replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 1776))
      .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 144))
      .replace(/\s+/g, '');
    return norm(name1) === norm(name2);
  };

  const getInvoiceWeight = (inv: InvoiceRun): number => {
    let total = 0;
    Object.entries(inv.quantities).forEach(([pId, qty]) => {
      const numQty = Number(qty) || 0;
      if (numQty > 0) {
        total += numQty;
      }
    });
    return total;
  };

  const getInvoiceCartonsReal = (inv: InvoiceRun): number => {
    let total = 0;
    Object.entries(inv.quantities).forEach(([pId, qty]) => {
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

  const getInvoiceVolumetricWeight = (inv: InvoiceRun): number => {
    let total = 0;
    Object.entries(inv.quantities).forEach(([pId, qty]) => {
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

  const getInvoiceCartonsVolumetric = (inv: InvoiceRun): number => {
    let total = 0;
    Object.entries(inv.quantities).forEach(([pId, qty]) => {
      const numQty = Number(qty) || 0;
      const prod = products.find((p) => p.id === pId);
      if (prod && numQty > 0 && prod.unitWeight > 0) {
        total += numQty / prod.unitWeight;
      }
    });
    return total;
  };

  const getDriverCapacity = (driverName: string): number => {
    const drv = drivers.find((d) => d.name === driverName);
    return drv && drv.capacity ? drv.capacity : 99999999;
  };

  const getDriverColorClass = (driverName: string, round?: number): string => {
    if (!driverName) return "bg-slate-100 text-slate-800 border-slate-200";

    const drv = drivers.find((d) => d.name === driverName);
    const baseColor = drv?.color || "";

    let colorKey = baseColor;
    if (!colorKey) {
      if (driverName.includes("شفیعی")) colorKey = "pink-light";
      else if (driverName.includes("فقانی")) colorKey = "blue-light";
      else if (driverName.includes("کریمی")) colorKey = "green-light";
      else if (driverName.includes("زارعی")) colorKey = "yellow-light";
      else if (driverName.includes("حضوری")) colorKey = "peach-light";
      else if (driverName.includes("ارسال")) colorKey = "gold";
      else colorKey = "slate";
    }

    switch (colorKey) {
      case "pink-light": return "bg-[#ECA5B8] text-slate-950 border-[#db8da1]";
      case "pink-dark": return "bg-[#E6787E] text-slate-950 border-[#cc5e64]";
      case "blue-light": return "bg-[#BBD5ED] text-slate-950 border-[#99badb]";
      case "blue-dark": return "bg-[#89B6E2] text-slate-950 border-[#6297cc]";
      case "green-light": return "bg-[#A3CFA1] text-slate-950 border-[#85b583]";
      case "green-dark": return "bg-[#10B960] text-slate-950 border-[#0b964c]";
      case "yellow-light": return "bg-[#FFE8A3] text-slate-950 border-[#e8ce82]";
      case "yellow-dark": return "bg-[#CCA01A] text-slate-950 border-[#b08810]";
      case "peach-light": return "bg-[#FCD3B6] text-slate-950 border-[#e5b390]";
      case "peach-medium": return "bg-[#FAAC84] text-slate-950 border-[#e38c62]";
      case "orange-medium": return "bg-[#F98F45] text-slate-950 border-[#e0752b]";
      case "orange-dark": return "bg-[#EE7E11] text-slate-950 border-[#cc6808]";
      case "gold": return "bg-[#FFC000] text-slate-950 border-[#e0a800]";
      default:
        return "bg-slate-200 text-slate-900 border-slate-300";
    }
  };

  const getCustomerPillClasses = (driverName: string): string => {
    const drv = drivers.find((d) => d.name === driverName);
    const colorKey = drv?.color || "slate";

    switch (colorKey) {
      case "pink-light": return "bg-pink-50 border-pink-100 text-pink-950";
      case "pink-dark": return "bg-pink-100 border-pink-200 text-pink-950";
      case "blue-light": return "bg-blue-50 border-blue-100 text-blue-950";
      case "blue-dark": return "bg-blue-100 border-blue-200 text-blue-950";
      case "green-light": return "bg-emerald-50 border-emerald-100 text-emerald-950";
      case "green-dark": return "bg-emerald-100 border-emerald-200 text-emerald-950";
      case "yellow-light": return "bg-amber-50 border-amber-100 text-amber-950";
      case "yellow-dark": return "bg-amber-100 border-amber-200 text-amber-950";
      case "peach-light": return "bg-orange-50 border-orange-100 text-orange-950";
      case "peach-medium": return "bg-orange-100 border-orange-200 text-orange-950";
      case "orange-medium": return "bg-orange-100 border-orange-200 text-orange-950";
      case "orange-dark": return "bg-orange-200 border-orange-300 text-orange-950";
      case "gold": return "bg-yellow-100 border-yellow-200 text-yellow-950";
      default: return "bg-slate-50 border-slate-100 text-slate-950";
    }
  };

  const getDriverHeaderClasses = (driverName: string): string => {
    const drv = drivers.find((d) => d.name === driverName);
    const colorKey = drv?.color || "slate";

    switch (colorKey) {
      case "pink-light": return "bg-pink-50 border-pink-100 text-pink-600";
      case "pink-dark": return "bg-pink-100 border-pink-200 text-pink-700";
      case "blue-light": return "bg-blue-50 border-blue-100 text-blue-600";
      case "blue-dark": return "bg-blue-100 border-blue-200 text-blue-700";
      case "green-light": return "bg-emerald-50 border-emerald-100 text-emerald-600";
      case "green-dark": return "bg-emerald-100 border-emerald-200 text-emerald-700";
      case "yellow-light": return "bg-amber-50 border-amber-100 text-amber-600";
      case "yellow-dark": return "bg-amber-100 border-amber-200 text-amber-700";
      case "peach-light": return "bg-orange-50 border-orange-100 text-orange-600";
      case "peach-medium": return "bg-orange-100 border-orange-200 text-orange-700";
      case "orange-medium": return "bg-orange-100 border-orange-200 text-orange-700";
      case "orange-dark": return "bg-orange-200 border-orange-300 text-orange-800";
      case "gold": return "bg-yellow-100 border-yellow-200 text-yellow-700";
      default: return "bg-slate-50 border-slate-100 text-slate-600";
    }
  };

  const getDriverAccentClasses = (driverName: string): { gradient: string; solid: string; ring: string } => {
    const drv = drivers.find((d) => d.name === driverName);
    const colorKey = drv?.color || "slate";

    switch (colorKey) {
      case "pink-light":
      case "pink-dark":
        return { gradient: "from-pink-400 to-rose-500", solid: "bg-pink-500", ring: "ring-pink-200" };
      case "blue-light":
      case "blue-dark":
        return { gradient: "from-blue-400 to-indigo-500", solid: "bg-blue-500", ring: "ring-blue-200" };
      case "green-light":
      case "green-dark":
        return { gradient: "from-emerald-400 to-teal-500", solid: "bg-emerald-500", ring: "ring-emerald-200" };
      case "yellow-light":
      case "yellow-dark":
      case "gold":
        return { gradient: "from-amber-400 to-yellow-500", solid: "bg-amber-500", ring: "ring-amber-200" };
      case "peach-light":
      case "peach-medium":
      case "orange-medium":
      case "orange-dark":
        return { gradient: "from-orange-400 to-red-500", solid: "bg-orange-500", ring: "ring-orange-200" };
      default:
        return { gradient: "from-slate-400 to-slate-600", solid: "bg-slate-500", ring: "ring-slate-200" };
    }
  };

  const getDriverCellColorClass = (driverName: string, round: number, qty: number, isActive: boolean): string => {
    if (!isActive) return "bg-slate-100/85 text-slate-400";
    if (!driverName) {
      return qty > 0 
        ? "bg-blue-300/80 text-blue-950 font-bold" 
        : "bg-blue-100/40 text-slate-700/60";
    }

    const drv = drivers.find((d) => d.name === driverName);
    const baseColor = drv?.color || "";

    let colorKey = baseColor;
    if (!colorKey) {
      if (driverName.includes("شفیعی")) colorKey = "pink-light";
      else if (driverName.includes("فقانی")) colorKey = "blue-light";
      else if (driverName.includes("کریمی")) colorKey = "green-light";
      else if (driverName.includes("زارعی")) colorKey = "yellow-light";
      else if (driverName.includes("حضوری")) colorKey = "peach-light";
      else if (driverName.includes("ارسال")) colorKey = "gold";
      else colorKey = "slate";
    }

    switch (colorKey) {
      case "pink-light":
        return qty > 0 ? "bg-[#ECA5B8] text-slate-950 font-bold" : "bg-[#ECA5B8]/15 text-rose-900/40";
      case "pink-dark":
        return qty > 0 ? "bg-[#E6787E] text-slate-950 font-bold" : "bg-[#E6787E]/15 text-rose-950/40";
      case "blue-light":
        return qty > 0 ? "bg-[#BBD5ED] text-slate-950 font-bold" : "bg-[#BBD5ED]/15 text-sky-900/40";
      case "blue-dark":
        return qty > 0 ? "bg-[#89B6E2] text-slate-950 font-bold" : "bg-[#89B6E2]/15 text-sky-950/40";
      case "green-light":
        return qty > 0 ? "bg-[#A3CFA1] text-slate-950 font-bold" : "bg-[#A3CFA1]/15 text-emerald-900/40";
      case "green-dark":
        return qty > 0 ? "bg-[#10B960] text-slate-950 font-bold" : "bg-[#10B960]/15 text-emerald-950/40";
      case "yellow-light":
        return qty > 0 ? "bg-[#FFE8A3] text-slate-950 font-bold" : "bg-[#FFE8A3]/15 text-amber-900/40";
      case "yellow-dark":
        return qty > 0 ? "bg-[#CCA01A] text-slate-950 font-bold" : "bg-[#CCA01A]/15 text-amber-950/40";
      case "peach-light":
        return qty > 0 ? "bg-[#FCD3B6] text-slate-950 font-bold" : "bg-[#FCD3B6]/15 text-orange-900/40";
      case "peach-medium":
        return qty > 0 ? "bg-[#FAAC84] text-slate-950 font-bold" : "bg-[#FAAC84]/15 text-orange-950/40";
      case "orange-medium":
        return qty > 0 ? "bg-[#F98F45] text-slate-950 font-bold" : "bg-[#F98F45]/15 text-orange-950/40";
      case "orange-dark":
        return qty > 0 ? "bg-[#EE7E11] text-slate-950 font-bold" : "bg-[#EE7E11]/15 text-orange-950/40";
      case "gold":
        return qty > 0 ? "bg-[#FFC000] text-slate-950 font-bold" : "bg-[#FFC000]/15 text-amber-950/40";
      default:
        return qty > 0 ? "bg-slate-300 text-slate-950 font-bold" : "bg-slate-50 text-slate-700/60";
    }
  };

  const getCategoryStyle = (category: string, isFlavor: boolean = false): string => {
    if (!category) return "bg-slate-50 text-slate-900 border-slate-200";
    const c = category.trim();
    
    const cats = Array.from(new Set(products.map((p) => p.category)));
    const index = cats.indexOf(c);
    const total = cats.length || 1;
    
    const palette = [
      { bg: "bg-[#f0f9ff]", text: "text-[#0369a1]", border: "border-[#bae6fd]" },
      { bg: "bg-[#e0f2fe]", text: "text-[#0369a1]", border: "border-[#bae6fd]" },
      { bg: "bg-[#bae6fd]", text: "text-[#0c4a6e]", border: "border-[#7dd3fc]" },
      { bg: "bg-[#e0e7ff]", text: "text-[#4338ca]", border: "border-[#c7d2fe]" },
      { bg: "bg-[#c7d2fe]", text: "text-[#312e81]", border: "border-[#a5b4fc]" },
      { bg: "bg-[#bfdbfe]", text: "text-[#1e3a8a]", border: "border-[#60a5fa]" },
      { bg: "bg-[#93c5fd]", text: "text-[#1e3a8a]", border: "border-[#60a5fa]" },
      { bg: "bg-[#60a5fa]", text: "text-[#172554]", border: "border-[#3b82f6]" },
      { bg: "bg-[#3b82f6]", text: "text-white", border: "border-[#2563eb]" },
      { bg: "bg-[#2563eb]", text: "text-white", border: "border-[#1d4ed8]" },
      { bg: "bg-[#1d4ed8]", text: "text-white", border: "border-[#1e40af]" },
      { bg: "bg-[#1e40af]", text: "text-slate-100", border: "border-[#1e3a8a]" },
      { bg: "bg-[#1e3a8a]", text: "text-slate-100", border: "border-[#172554]" },
      { bg: "bg-[#172554]", text: "text-cyan-200", border: "border-[#0f172a]" }
    ];
    
    const ratio = index >= 0 ? index / total : 0;
    const paletteIndex = Math.min(ratio * palette.length, palette.length - 1);
    const style = palette[paletteIndex] || palette[0];
    
    if (isFlavor) {
      return `${style.bg} ${style.text} ${style.border}`;
    }
    return `${style.bg} ${style.text} ${style.border}`;
  };

  const getAllocatedQuantities = (): { [productId: string]: number } => {
    const allocations: { [productId: string]: number } = {};
    validProducts.forEach((p) => {
      allocations[p.id] = 0;
    });
    visibleInvoices.forEach((inv) => {
      if (inv.isActive !== false) {
        Object.entries(inv.quantities).forEach(([pId, qty]) => {
          const numQty = Number(qty) || 0;
          if (allocations[pId] !== undefined) {
            allocations[pId] += numQty;
          } else {
            allocations[pId] = numQty;
          }
        });
      }
    });
    return allocations;
  };

  const allocatedQuantities = getAllocatedQuantities();

  const getProductStock = (productId: string, defaultStock: number): number => {
    const carriedOver = computedStartingStocks[productId] || 0;
    const manualAdd = manualStockOverrides[productId] !== undefined ? manualStockOverrides[productId] : 0;
    return carriedOver + manualAdd;
  };

  const totalPlannedWeight = visibleInvoices
    .filter((inv) => inv.isActive !== false)
    .reduce((sum, inv) => sum + getInvoiceWeight(inv), 0);

  const totalInitialStockWeight = validProducts.reduce((sum, p) => {
    const stock = getProductStock(p.id, p.defaultStock);
    return sum + stock;
  }, 0);
  
  const totalPlannedCartons = visibleInvoices
    .filter((inv) => inv.isActive !== false)
    .reduce((sum, inv) => sum + getInvoiceCartonsReal(inv), 0);

  const totalOverloadedDrivers = visibleInvoices.filter((inv) => {
    if (inv.isActive === false || !inv.driverName) return false;
    const currentVolumetricWeight = getInvoiceVolumetricWeight(inv);
    const maxCapacity = getDriverCapacity(inv.driverName);
    return currentVolumetricWeight > maxCapacity;
  }).length;

  const totalSentDrivers = Array.from(
    new Set(
      visibleInvoices
        .filter((inv) => inv.isActive !== false && inv.driverName && inv.driverName.trim() !== "")
        .map((inv) => inv.driverName.trim())
    )
  ).length;

  const totalSentCustomers = Array.from(
    new Set(
      visibleInvoices
        .filter((inv) => inv.isActive !== false && inv.customerName && inv.customerName.trim() !== "")
        .map((inv) => inv.customerName.trim())
    )
  ).length;

  const totalRemainingStockWeight = Math.max(0, totalInitialStockWeight - totalPlannedWeight);
  const loadingRate = totalInitialStockWeight > 0 ? (totalPlannedWeight / totalInitialStockWeight) * 100 : 0;
  const avgWeightPerDriver = totalSentDrivers > 0 ? totalPlannedWeight / totalSentDrivers : 0;

  const getTopTenProducts = () => {
    if (!validProducts || validProducts.length === 0) return [];

    const allMapped = validProducts.map((p) => {
      const todayWeight = allocatedQuantities[p.id] || 0;
      const totalSales = getProductSalesInPeriod(p, 30);
      return {
        product: p,
        name: `${p.category} ${p.flavor ? `(${p.flavor})` : ""}`,
        totalSales,
        todayWeight,
        category: p.category
      };
    });
    return allMapped.sort((a, b) => b.totalSales - a.totalSales).slice(0, 10);
  };

  const getProductSalesInPeriod = (p: Product, days: number) => {
    const todayWeight = allocatedQuantities[p.id] || 0;
    const historicalSales = realSales[p.id] || 0;
    const avgDaily = historicalSales / 30;
    return avgDaily * days + todayWeight;
  };

  const totalSalesToday = validProducts.reduce((sum, p) => sum + (allocatedQuantities[p.id] || 0), 0);
  const totalSales30Days = validProducts.reduce((sum, p) => sum + getProductSalesInPeriod(p, 30), 0);

  const top3Drivers = Object.entries(invoiceStats.driverStats)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 3);
    
  const getProduct30DayIncoming = (p: Product) => {
    const todayIncoming = manualStockOverrides[p.id] || 0;
    const historicalIncoming = realIncoming[p.id] || 0;
    return historicalIncoming + todayIncoming;
  };

  const totalIncoming30Days = validProducts.reduce((sum, p) => sum + getProduct30DayIncoming(p), 0);

  const getCategorySalesAggregate = () => {
    const aggregates: { [category: string]: { totalSales: number; todaySales: number; count: number } } = {};
    validProducts.forEach((p) => {
      const todayWeight = allocatedQuantities[p.id] || 0;
      const totalSales = getProductSalesInPeriod(p, 30);
      if (!aggregates[p.category]) {
        aggregates[p.category] = { totalSales: 0, todaySales: 0, count: 0 };
      }
      aggregates[p.category].totalSales += totalSales;
      aggregates[p.category].todaySales += todayWeight;
      aggregates[p.category].count += 1;
    });
    return aggregates;
  };

  const getCategoryFlavorsRanking = (category: string) => {
    const filtered = validProducts.filter((p) => p.category === category);
    return filtered.map((p) => {
      const todayWeight = allocatedQuantities[p.id] || 0;
      const totalSales = getProductSalesInPeriod(p, 30);
      return {
        product: p,
        flavorName: p.flavor || "ساده",
        totalSales,
        todayWeight
      };
    }).sort((a, b) => b.totalSales - a.totalSales);
  };

  const handleAddInvoiceRun = () => {
    const newRun: InvoiceRun = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      driverName: "",
      round: 1,
      customerName: "",
      destinationLocation: "",
      quantities: {},
      isActive: true,
      description: "",
      shippingAgency: ""
    };

    setInvoices([...invoices, newRun]);
    showNotification("success", "فاکتور جدید خام (بدون راننده) با موفقیت ایجاد شد.");
  };

  const handleUpdateInvoiceHeader = (runId: string, field: keyof InvoiceRun, value: any) => {
    setInvoices(
      invoices.map((inv) => {
        if (inv.id === runId) {
          if (field === "driverName") {
            const nextRound = invoices
              .filter((i) => i.driverName === value && i.id !== runId)
              .reduce((max, i) => Math.max(max, i.round), 0) + 1;
            return { ...inv, [field]: value, round: nextRound };
          }
          return { ...inv, [field]: value };
        }
        return inv;
      })
    );
  };

  const handleUpdateCell = (runId: string, productId: string, value: number) => {
    setInvoices(
      invoices.map((inv) => {
        if (inv.id === runId) {
          return {
            ...inv,
            quantities: {
              ...inv.quantities,
              [productId]: value
            }
          };
        }
        return inv;
      })
    );
  };

  const handleUpdateStockOverride = (productId: string, value: number | null | undefined) => {
    const updated = { ...manualStockOverrides };
    if (value === null || value === undefined) {
      delete updated[productId];
    } else {
      updated[productId] = value;
    }
    setManualStockOverrides(updated);
  };

  const handleDeleteInvoice = (runId: string) => {
    setInvoices(invoices.filter((inv) => inv.id !== runId));
    showNotification("info", "فاکتور مربوطه حذف شد.");
  };

  const handleDownloadBackup = async (ranged: boolean) => {
    if (ranged && (!backupFromDate.trim() || !backupToDate.trim())) {
      showNotification("error", "برای دانلود بازه زمانی، هر دو تاریخ را وارد کنید.");
      return;
    }
    setBackupDownloading(true);
    try {
      const params = new URLSearchParams();
      if (ranged) {
        params.set("fromDate", backupFromDate.trim());
        params.set("toDate", backupToDate.trim());
      }
      const res = await apiFetch(`/api/backup/download?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "خطا در دریافت فایل پشتیبان");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match ? match[1] : `backup-${formattedDate.replace(/\//g, "-")}.json`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showNotification("success", "فایل پشتیبان با موفقیت دانلود شد.");
    } catch (err: any) {
      console.error("Backup download error:", err);
      showNotification("error", err.message || "خطا در دانلود فایل پشتیبان.");
    } finally {
      setBackupDownloading(false);
    }
  };

  const handleRestoreBackupFile = async (file: File) => {
    if (!confirm("فایل پشتیبان با اطلاعات فعلی سیستم ادغام می‌شود (چیزی حذف یا جایگزین نمی‌شود، فقط موارد جدید اضافه می‌شوند). ادامه می‌دهید؟")) {
      return;
    }
    setBackupRestoring(true);
    try {
      const text = await file.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("فایل انتخاب‌شده یک فایل پشتیبان معتبر (JSON) نیست.");
      }
      const res = await apiFetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "خطا در بازگردانی فایل پشتیبان");
      }
      const s = data.summary;
      showNotification(
        "success",
        `بازگردانی موفق: ${s.dailyPlansAdded} روز جدید، ${s.dailyPlansMerged} روز ادغام‌شده، ${s.driversAdded} راننده جدید، ${s.productsAdded} کالای جدید، ${s.usersAdded} کاربر جدید، ${s.logsAdded} لاگ جدید اضافه شد.`
      );
      loadConfig();
      loadDailyPlan(formattedDate);
    } catch (err: any) {
      console.error("Backup restore error:", err);
      showNotification("error", err.message || "فایل پشتیبان نامعتبر است.");
    } finally {
      setBackupRestoring(false);
      if (backupFileInputRef.current) backupFileInputRef.current.value = "";
    }
  };

  const handleResetDailyData = async () => {
    if (!confirm("همه‌ی برنامه‌های روزانه (فاکتورها) و تمام تاریخچه‌ی لاگ فعالیت‌ها برای همیشه پاک می‌شن. رانندگان، کالاها و کاربران دست‌نخورده می‌مونن. ادامه می‌دهید؟")) {
      return;
    }
    setResettingDailyData(true);
    try {
      const res = await apiFetch("/api/system/reset-daily-data", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "خطا در پاک‌سازی");
      showNotification("success", "تمام برنامه‌های روزانه و لاگ‌ها پاک شد.");
      loadDailyPlan(formattedDate);
    } catch (err: any) {
      showNotification("error", err.message || "خطا در پاک‌سازی اطلاعات.");
    } finally {
      setResettingDailyData(false);
    }
  };

  const handleFactoryReset = async () => {
    if (factoryResetConfirmText !== "RESET") return;
    setFactoryResetting(true);
    try {
      const res = await apiFetch("/api/system/factory-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "RESET" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "خطا در ریست کامل سیستم");
      if (data.token) setAuthToken(data.token);
      showNotification("success", "سیستم کاملاً ریست شد. صفحه در حال بارگذاری مجدد است...");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      showNotification("error", err.message || "خطا در ریست کامل سیستم.");
      setFactoryResetting(false);
    }
  };

  const handleMoveInactiveToTomorrow = async () => {
    const inactiveInvoices = invoices.filter((inv) => inv.isActive === false);
    if (inactiveInvoices.length === 0) {
      showNotification("info", "هیچ فاکتور غیرفعالی برای انتقال پیدا نشد.");
      return;
    }

    try {
      setSaving(true);
      const tomorrowStr = getTomorrowShamsiDate(shamsiYear, shamsiMonth, shamsiDay);

      const loadRes = await apiFetch(`/api/load/${encodeURIComponent(tomorrowStr)}`);
      const payload = await loadRes.json();

      let tomorrowPlan: DailyPlan;
      if (payload.found && payload.data) {
        tomorrowPlan = payload.data;
      } else {
        tomorrowPlan = {
          date: tomorrowStr,
          invoices: [],
          manualStockOverrides: {}
        };
      }

      const moved = inactiveInvoices.map((inv) => ({
        ...inv,
        isActive: true
      }));

      tomorrowPlan.invoices = [...(tomorrowPlan.invoices || []), ...moved];

      const saveTomorrowRes = await apiFetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: tomorrowStr,
          data: tomorrowPlan
        })
      });

      const tomorrowResult = await saveTomorrowRes.json();
      if (tomorrowResult.status !== "success") {
        throw new Error("خطا در ذخیره برنامه فردا");
      }

      const remainingInvoices = invoices.filter((inv) => inv.isActive !== false);
      setInvoices(remainingInvoices);

      const saveTodayRes = await apiFetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formattedDate,
          data: {
            date: formattedDate,
            invoices: remainingInvoices,
            manualStockOverrides
          }
        })
      });

      const todayResult = await saveTodayRes.json();
      if (todayResult.status === "success") {
        await logActivity(user?.email || 'admin@system.com', 'انتقال فاکتورهای غیرفعال به روز بعد', {
          count: inactiveInvoices.length,
          fromDate: formattedDate,
          toDate: tomorrowStr
        });
        showNotification(
          "success",
          `تعداد ${inactiveInvoices.length} فاکتور با موفقیت به فردا (${tomorrowStr}) منتقل و ثبت شدند.`
        );
      } else {
        showNotification("error", "خطا در بروزرسانی برنامه امروز.");
      }
    } catch (err) {
      console.error("Error moving inactive invoices", err);
      showNotification("error", "خطا در فرایند انتقال فاکتورها به روز بعد.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddDriver = () => {
    if (!newDriverName.trim()) {
      showNotification("error", "نام راننده نمی‌تواند خالی باشد.");
      return;
    }
    const trimmedName = newDriverName.trim();

    if (editingDriverName) {
      if (trimmedName !== editingDriverName && drivers.some((d) => d.name === trimmedName)) {
        showNotification("error", "راننده‌ای با این نام قبلاً ثبت شده است.");
        return;
      }

      const updatedDrivers = drivers.map((d) =>
        d.name === editingDriverName
          ? { name: trimmedName, vehicle: newDriverVehicle, capacity: d.capacity, color: newDriverColor }
          : d
      );

      const updatedInvoices = invoices.map((inv) =>
        inv.driverName === editingDriverName ? { ...inv, driverName: trimmedName } : inv
      );

      const updatedSearchSlots = driverSearchSlots.map((slot) =>
        slot === editingDriverName ? trimmedName : slot
      );

      setDrivers(updatedDrivers);
      setInvoices(updatedInvoices);
      setDriverSearchSlots(updatedSearchSlots);

      setEditingDriverName(null);
      setNewDriverName("");
      setNewDriverVehicle("نیسان");
      setNewDriverColor("pink-light");

      saveMasterConfig(updatedDrivers, products);
      showNotification("success", "تغییرات راننده با موفقیت ذخیره شد.");
    } else {
      if (drivers.some((d) => d.name === trimmedName)) {
        showNotification("error", "راننده‌ای با این نام قبلاً ثبت شده است.");
        return;
      }
      const updated = [...drivers, { 
        name: trimmedName, 
        vehicle: newDriverVehicle, 
        color: newDriverColor
      }];
      setDrivers(updated);
      setNewDriverName("");
      setNewDriverVehicle("نیسان");
      setNewDriverColor("pink-light");
      saveMasterConfig(updated, products);
      showNotification("success", "راننده جدید با موفقیت اضافه شد.");
    }
  };

  const handleEditDriver = (drv: Driver) => {
    setEditingDriverName(drv.name);
    setNewDriverName(drv.name);
    setNewDriverVehicle(drv.vehicle);
    setNewDriverColor(drv.color || "pink-light");
  };

  const handleCancelEditDriver = () => {
    setEditingDriverName(null);
    setNewDriverName("");
    setNewDriverVehicle("نیسان");
    setNewDriverColor("pink-light");
  };

  const handleDeleteDriver = (name: string) => {
    const updated = drivers.filter((d) => d.name !== name);
    setDrivers(updated);
    saveMasterConfig(updated, products);
    showNotification("info", `راننده ${name} حذف شد.`);
  };

  const handleAddProduct = () => {
    if (!newProductFlavor.trim()) {
      showNotification("error", "طعم محصول نمی‌تواند خالی باشد.");
      return;
    }
    const trimmedFlavor = newProductFlavor.trim();

    if (editingProductId) {
      const exists = products.some(
        (p) => p.id !== editingProductId && p.category === newProductCategory && p.flavor.trim().toLowerCase() === trimmedFlavor.toLowerCase()
      );
      if (exists) {
        showNotification("error", "این ترکیب کالا و طعم قبلاً ثبت شده است.");
        return;
      }

      const updated = products.map((p) =>
        p.id === editingProductId
          ? {
              ...p,
              category: newProductCategory,
              flavor: trimmedFlavor,
              unitWeight: newProductWeight,
              realCartonWeight: newProductRealCartonWeight,
              defaultStock: newProductStock,
            }
          : p
      );

      setProducts(updated);
      setEditingProductId(null);
      setNewProductFlavor("");
      setNewProductWeight(10);
      setNewProductRealCartonWeight(0);
      setNewProductStock(200);

      saveMasterConfig(drivers, updated);
      showNotification("success", "تغییرات محصول با موفقیت ذخیره شد.");
    } else {
      const exists = products.some(
        (p) => p.category === newProductCategory && p.flavor.trim().toLowerCase() === trimmedFlavor.toLowerCase()
      );
      if (exists) {
        showNotification("error", "این ترکیب کالا و طعم قبلاً ثبت شده است.");
        return;
      }

      const newProd: Product = {
        id: `prod_${Date.now()}`,
        category: newProductCategory,
        flavor: trimmedFlavor,
        unitWeight: newProductWeight,
        realCartonWeight: newProductRealCartonWeight,
        defaultStock: newProductStock
      };

      const updated = [...products, newProd];
      setProducts(updated);
      
      setManualStockOverrides({
        ...manualStockOverrides,
        [newProd.id]: newProductStock
      });

      setNewProductFlavor("");
      saveMasterConfig(drivers, updated);
      showNotification("success", "محصول جدید با موفقیت ثبت شد.");
    }
  };

  const handleEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setNewProductCategory(prod.category);
    setNewProductFlavor(prod.flavor);
    setNewProductWeight(prod.unitWeight);
    setNewProductRealCartonWeight(prod.realCartonWeight || 0);
    setNewProductStock(prod.defaultStock);
  };

  const handleCancelEditProduct = () => {
    setEditingProductId(null);
    setNewProductFlavor("");
    setNewProductWeight(10);
    setNewProductRealCartonWeight(0);
    setNewProductStock(200);
  };

  const handleDeleteProduct = (id: string) => {
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    saveMasterConfig(drivers, updated);
    showNotification("info", "محصول از تنظیمات پایه حذف شد.");
  };

  const handlePrevDay = () => {
    if (shamsiDay > 1) {
      setShamsiDay(shamsiDay - 1);
    } else {
      const prevMonth = shamsiMonth === 1 ? 12 : shamsiMonth - 1;
      const prevYear = shamsiMonth === 1 ? shamsiYear - 1 : shamsiYear;
      const daysInPrevMonth = SHAMSI_MONTHS.find((m) => m.id === prevMonth)?.days || 30;
      setShamsiYear(prevYear);
      setShamsiMonth(prevMonth);
      setShamsiDay(daysInPrevMonth);
    }
  };

  const handleNextDay = () => {
    const maxDays = SHAMSI_MONTHS.find((m) => m.id === shamsiMonth)?.days || 30;
    if (shamsiDay < maxDays) {
      setShamsiDay(shamsiDay + 1);
    } else {
      const nextMonth = shamsiMonth === 12 ? 1 : shamsiMonth + 1;
      const nextYear = shamsiMonth === 12 ? shamsiYear + 1 : shamsiYear;
      setShamsiYear(nextYear);
      setShamsiMonth(nextMonth);
      setShamsiDay(1);
    }
  };

  const handleResetCurrentDayPlan = () => {
    if (confirm("آیا مطمئن هستید که می‌خواهید تمام فاکتورهای امروز را پاک کنید؟")) {
      setInvoices([]);
      showNotification("info", "برنامه امروز بازنشانی شد.");
    }
  };

  const handleExportExcel = () => {
    try {
      const filteredProducts = products.filter(
        (p) => selectedCategoryFilter === "all" || p.category === selectedCategoryFilter
      );

      const dateStr = formattedDate ? formattedDate.replace(/\//g, "-") : "امروز";
      
      const getDriverHexColor = (driverName: string): string => {
        if (!driverName) return "#F1F5F9";
        const drv = drivers.find((d) => d.name === driverName);
        const baseColor = drv?.color || "";
        let colorKey = baseColor;
        if (!colorKey) {
          if (driverName.includes("شفیعی")) colorKey = "pink-light";
          else if (driverName.includes("فقانی")) colorKey = "blue-light";
          else if (driverName.includes("کریمی")) colorKey = "green-light";
          else if (driverName.includes("زارعی")) colorKey = "yellow-light";
          else if (driverName.includes("حضوری")) colorKey = "peach-light";
          else if (driverName.includes("ارسال")) colorKey = "gold";
          else colorKey = "slate";
        }
        switch (colorKey) {
          case "pink-light": return "#ECA5B8";
          case "pink-dark": return "#E6787E";
          case "blue-light": return "#BBD5ED";
          case "blue-dark": return "#89B6E2";
          case "green-light": return "#A3CFA1";
          case "green-dark": return "#10B960";
          case "yellow-light": return "#FFE8A3";
          case "yellow-dark": return "#CCA01A";
          case "peach-light": return "#FCD3B6";
          case "peach-medium": return "#FAAC84";
          case "orange-medium": return "#F98F45";
          case "orange-dark": return "#EE7E11";
          case "gold": return "#FFC000";
          default: return "#E2E8F0";
        }
      };

      const getDriverCellHexColor = (driverName: string, qty: number, isActive: boolean): string => {
        if (!isActive) return "#F1F5F9";
        if (qty === 0) {
          if (!driverName) return "#FFFFFF";
          const baseColor = getDriverHexColor(driverName);
          return baseColor + "22";
        }
        return getDriverHexColor(driverName);
      };

      let html = `<html dir="rtl" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<!--[if gte mso 9]>
<xml>
  <x:ExcelWorkbook>
    <x:ExcelWorksheets>
      <x:ExcelWorksheet>
        <x:Name>برنامه‌ریزی توزیع و فروش</x:Name>
        <x:WorksheetOptions>
          <x:DisplayRightToLeft/>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: 'Tahoma', 'Segoe UI', Arial, sans-serif; direction: rtl; margin: 20px; }
  table { border-collapse: collapse; width: 100%; direction: rtl; text-align: center; font-size: 11px; margin-bottom: 30px; }
  th, td { border: 1px solid #94A3B8; padding: 6px 8px; text-align: center; vertical-align: middle; }
  .title-header { background-color: #1E3A8A; color: #FFFFFF; font-size: 16px; font-weight: bold; padding: 12px; border: 2px solid #1E3A8A; }
  .section-header { background-color: #475569; color: #FFFFFF; font-size: 13px; font-weight: bold; padding: 8px; text-align: right; }
  .col-label { font-weight: bold; background-color: #F8FAFC; color: #334155; }
  .text-right { text-align: right; }
  .text-left { text-align: left; }
  .font-bold { font-weight: bold; }
  .shortage { background-color: #FEE2E2; color: #991B1B; font-weight: bold; }
  .surplus { background-color: #D1FAE5; color: #065F46; font-weight: bold; }
  .sum-row { background-color: #FEF3C7; font-weight: bold; color: #78350F; }
  .search-col { background-color: #FFF7ED; color: #7C2D12; }
  .search-total { background-color: #FFEDD5; color: #7C2D12; font-weight: bold; }
</style>
</head>
<body dir="rtl">

  <table dir="rtl">
    <tr>
      <th colspan="${11 + invoices.length}" class="title-header">
        برنامه‌ریزی توزیع و فروش شرکت - تاریخ: ${formattedDate}
      </th>
    </tr>
  </table>

  <table dir="rtl">
    <thead>
      <tr style="background-color: #F1F5F9; font-weight: bold;">
        <th rowspan="8" style="background-color: #BFDBFE; color: #1E3A8A; font-weight: bold; width: 110px; border: 1px solid #1E3A8A;">دسته‌بندی اصلی</th>
        <th rowspan="8" style="background-color: #BFDBFE; color: #1E3A8A; font-weight: bold; width: 110px; border: 1px solid #1E3A8A;">طعم / محصول</th>
        
        ${invoices.map((inv, idx) => `
          <th style="background-color: ${getDriverHexColor(inv.driverName)}; font-weight: bold; font-size: 11px; min-width: 140px; color: #0F172A; border: 1px solid #1E3A8A;">
            سفر ${idx + 1} (${inv.isActive !== false ? 'فعال' : 'غیرفعال'})
          </th>
        `).join('')}

        <th colspan="5" style="background-color: #10B981; color: #FFFFFF; font-weight: bold; border: 1px solid #047857;">وضعیت انبار و موجودی</th>
        <th colspan="${driverSearchSlots.length}" style="background-color: #F97316; color: #FFFFFF; font-weight: bold; border: 1px solid #C2410C;">جستجوی رانندگان</th>
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
                <span style="font-size: 9px; font-weight: normal;">(${getInvoiceCartonsVolumetric(inv)} کارتن)</span>
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
        ${Object.entries(getCategoryAggregateOutflow()).map(([cat, info]: any) => `
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

      showNotification("success", "فایل اکسل پیشرفته قالب‌بندی شده و رنگی دقیقا مشابه جدول برنامه ریزی با موفقیت دانلود شد.");
    } catch (e) {
      console.error(e);
      showNotification("error", "خطا در تولید فایل اکسل رنگی.");
    }
  };

  const handleExportAsImage = async () => {
    const element = document.getElementById("main-unified-grid");
    if (!element) {
      showNotification("error", "جدول اصلی پیدا نشد.");
      return;
    }

    showNotification("info", "در حال پردازش و تولید تصویر باکیفیت از جدول... لطفا شکیبا باشید.");

    try {
      const html2canvas = (await import("html2canvas")).default;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth + 100,
        windowHeight: element.scrollHeight + 100,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById("main-unified-grid");
          if (clonedElement) {
            const buttons = clonedElement.querySelectorAll("button");
            buttons.forEach((btn) => {
              btn.style.display = "none";
            });

            const inputs = clonedElement.querySelectorAll("input");
            inputs.forEach((input) => {
              if (input.type === "checkbox") {
                const parentLabel = input.closest("label");
                if (parentLabel) {
                  if (!input.checked) {
                    parentLabel.style.opacity = "0.4";
                    parentLabel.textContent = "غیرفعال";
                  } else {
                    parentLabel.textContent = "فعال";
                  }
                }
              } else {
                const value = input.value || "";
                const span = clonedDoc.createElement("span");
                span.textContent = value === "" ? "-" : value;
                span.className = "font-extrabold text-[11px] text-slate-800 text-center block w-full py-1";
                input.parentNode?.replaceChild(span, input);
              }
            });

            const selects = clonedElement.querySelectorAll("select");
            selects.forEach((select) => {
              const selectedOption = select.options[select.selectedIndex];
              let value = selectedOption ? selectedOption.text : "";
              if (value.startsWith("--")) value = "-";
              const span = clonedDoc.createElement("span");
              span.textContent = value;
              span.className = "font-black text-xs text-slate-900 text-center block w-full py-1";
              select.parentNode?.replaceChild(span, select);
            });

            clonedElement.style.overflow = "visible";
            clonedElement.style.width = "auto";
            clonedElement.style.maxWidth = "none";

            const stickies = clonedElement.querySelectorAll(".sticky");
            stickies.forEach((el) => {
              const elem = el as HTMLElement;
              elem.style.position = "static";
              elem.style.boxShadow = "none";
              elem.style.backgroundColor = "#f1f5f9";
            });
          }
        }
      });

      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const dateStr = formattedDate ? formattedDate.replace(/\//g, "-") : "امروز";
      link.download = `جدول_برنامه‌ریزی_و_فروش_${dateStr}.png`;
      link.href = imgData;
      link.click();
      showNotification("success", "تصویر باکیفیت جدول با موفقیت دانلود شد.");
    } catch (error) {
      console.error(error);
      showNotification("error", "خطا در تولید تصویر جدول.");
    }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          showNotification("error", "فایل اکسل خالی یا نامعتبر است.");
          return;
        }

        const importedProducts: Product[] = [];
        const newStockOverrides: { [productId: string]: number } = { ...manualStockOverrides };

        data.forEach((row, idx) => {
          const category = row["دسته‌بندی اصلی"] || row["دسته"] || row["کالا"] || "نامشخص";
          const flavor = row["طعم"] || row["اسانس"] || `طعم ${idx + 1}`;
          const unitWeight = parseFloat(row["وزن واحد"] || row["وزن واحد (کیلو)"] || "10");
          const defaultStock = parseInt(row["موجودی"] || row["موجودی انبار"] || "200", 10);

          const id = `imported_${idx}_${Date.now()}`;
          importedProducts.push({
            id,
            category,
            flavor,
            unitWeight,
            defaultStock
          });

          newStockOverrides[id] = defaultStock;
        });

        if (confirm(`تعداد ${importedProducts.length} محصول از اکسل استخراج شد. آیا جایگزین محصولات پایه فعلی شوند؟`)) {
          setProducts(importedProducts);
          setManualStockOverrides(newStockOverrides);
          saveMasterConfig(drivers, importedProducts);
          showNotification("success", "لیست کالاها و موجودی انبار با موفقیت از اکسل درون‌ریزی شد.");
        }
      } catch (err) {
        console.error(err);
        showNotification("error", "قالب‌بندی فایل اکسل نادرست است.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const getCategoryAggregateOutflow = () => {
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

  const getCategoryAggregateStock = () => {
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

  const getCustomWarehouseSummary = () => {
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
      else if (cat && cat.startsWith("اسنک")) snack += qty;
      else if (cat && cat.includes("اسنک")) snack += qty;
    });
    const total = badam + sunflower + soya + cashew + khaleeji + corn + snack;
    return { badam, sunflower, soya, cashew, khaleeji, corn, snack, total };
  };

  const getCustomRemainingStockSummary = () => {
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
      else if (cat && cat.startsWith("اسنک")) snack += remaining;
      else if (cat && cat.includes("اسنک")) snack += remaining;
    });
    const total = badam + sunflower + soya + cashew + khaleeji + corn + snack;
    return { badam, sunflower, soya, cashew, khaleeji, corn, snack, total };
  };

  const getDetailedExcelGridData = (categoryFilter: string = "all") => {
    const getProductInfo = (p: Product) => {
      const stock = getProductStock(p.id, p.defaultStock);
      const sold = allocatedQuantities[p.id] || 0;
      const remaining = stock - sold;
      const name = p.flavor && p.flavor !== "-" ? `${p.category} (${p.flavor})` : p.category;
      return { name, value: remaining };
    };

    const filteredProducts = categoryFilter === "all" 
      ? validProducts.filter(p => p.category && p.category.trim() !== '')
      : validProducts.filter(p => p.category === categoryFilter && p.category && p.category.trim() !== '');

    const rightCols: { name: string; value: number | string; isSpacer: boolean }[] = [];
    const leftCols: { name: string; value: number | string; isSpacer: boolean }[] = [];

    const totalProducts = filteredProducts.length;
    const half = Math.ceil(totalProducts / 2);

    for (let i = 0; i < half; i++) {
      if (i < totalProducts) {
        rightCols.push({ ...getProductInfo(filteredProducts[i]), isSpacer: false });
      } else {
        rightCols.push({ name: "", value: "", isSpacer: true });
      }
    }

    for (let i = half; i < totalProducts; i++) {
      if (i < totalProducts) {
        leftCols.push({ ...getProductInfo(filteredProducts[i]), isSpacer: false });
      } else {
        leftCols.push({ name: "", value: "", isSpacer: true });
      }
    }

    const maxLen = Math.max(rightCols.length, leftCols.length);
    const finalRows = [];
    for (let i = 0; i < maxLen; i++) {
      finalRows.push({
        right: rightCols[i] || { name: "", value: "", isSpacer: true },
        left: leftCols[i] || { name: "", value: "", isSpacer: true }
      });
    }

    return finalRows;
  };

  const renderMatrixContent = (isModal = false) => {
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
  };

  const renderDriverSheetsContent = (isPrint: boolean, targetDriver: string | null) => {
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
          const capacityPct = Math.min((totalWeight / capacity) * 100, 100);

          const slotsUsed: string[] = [];
          driverSearchSlots.forEach((slotName, sIdx) => {
            if (slotName === drvName) {
              slotsUsed.push(`جستجو ${sIdx + 1}`);
            }
          });

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
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-cyan-200 selection:text-slate-950">
      <div className={(showPrintPreview || driverPrintPreview) ? "print:hidden flex flex-col flex-1" : "flex flex-col flex-1"}>
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-4 left-4 right-4 md:left-auto md:right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border backdrop-blur-md max-w-md ${
              notification.type === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                : notification.type === "error"
                ? "bg-rose-50 border-rose-300 text-rose-950"
                : "bg-cyan-50 border-cyan-300 text-cyan-950"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
            ) : notification.type === "error" ? (
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
            ) : (
              <Package className="w-6 h-6 text-cyan-600 shrink-0" />
            )}
            <p className="text-sm font-semibold leading-relaxed">{notification.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 py-3 px-3 sm:py-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4 no-print shrink-0 shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-gradient-to-tr from-cyan-600 to-blue-700 p-2 sm:p-2.5 rounded-xl shadow-md text-white shrink-0">
            <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-sm sm:text-xl font-extrabold tracking-tight text-slate-900 leading-tight">
              سامانه برنامه ریزی و توزیع و لجستیک برنا تجارت باور
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">پخش برخط و آنلاین...</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap justify-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-all duration-300 shadow-sm flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
            title={isDarkMode ? "تغییر به حالت روز (روشن)" : "تغییر به حالت شب (تیره)"}
          >
            {isDarkMode ? (
              <Sun className="w-4.5 h-4.5 text-amber-400" />
            ) : (
              <Moon className="w-4.5 h-4.5 text-slate-700" />
            )}
          </button>

          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm" dir="rtl">
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800 tracking-wide font-mono select-none">
                {user?.email}
              </span>
              <span className="text-[10px] font-extrabold text-cyan-600 select-none text-right">
                {role === 'admin' ? 'مدیر کل' : role === 'sales' ? 'مدیر فروش' : role === 'visitor' ? 'ویزیتور' : user?.driverName ? `راننده (${user.driverName})` : 'راننده (بدون اتصال)'}
              </span>
            </div>
            <button
              onClick={logout}
              className="p-1.5 bg-slate-200/60 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition border border-slate-300 hover:border-rose-200 flex items-center gap-1 text-xs font-bold cursor-pointer"
              title="خروج از حساب"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-1.5 shadow-sm text-amber-800" dir="rtl">
            <span className="text-xs font-bold select-none">امروز:</span>
            <span className="text-xs font-extrabold tracking-wide select-none">
              {getShamsiWeekday(todayShamsi.year, todayShamsi.month, todayShamsi.day)} {todayShamsi.day} {todayShamsi.monthName}
            </span>
          </div>

          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1">
          <button
            onClick={handlePrevDay}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
            title="روز قبل"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => {
              setTempYear(shamsiYear);
              setTempMonth(shamsiMonth);
              setTempDay(shamsiDay);
              setManualDateInput(`${shamsiYear}/${String(shamsiMonth).padStart(2, '0')}/${String(shamsiDay).padStart(2, '0')}`);
              setShowDatePicker(true);
            }}
            className="px-3 py-1.5 flex items-center gap-2 hover:bg-slate-200 rounded-lg transition text-slate-800 font-bold cursor-pointer"
            title="انتخاب سریع یا وارد کردن دستی تاریخ"
          >
            <Calendar className="w-4 h-4 text-cyan-600" />
            <span className="font-sans tracking-wide text-xs sm:text-sm font-extrabold">
              {getShamsiWeekday(shamsiYear, shamsiMonth, shamsiDay)}، {formattedDate}
            </span>
          </button>

          <button
            onClick={handleNextDay}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
            title="روز بعد"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>

      <nav className="bg-white border-b border-slate-200 px-3 sm:px-6 overflow-x-auto flex justify-start items-center gap-1.5 no-print shrink-0 py-2 sm:py-2.5">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0 cursor-pointer ${
            activeTab === "dashboard"
              ? "bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          داشبورد نظارت
        </button>

        {role !== 'driver' && role !== 'visitor' && (
          <button
            onClick={() => setActiveTab("planning")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0 cursor-pointer ${
              activeTab === "planning"
                ? "bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            برنامه‌ریزی و فروش
          </button>
        )}

        {role !== 'visitor' && (
          <button
            onClick={() => setActiveTab("drivers")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0 cursor-pointer ${
              activeTab === "drivers"
                ? "bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <Truck className="w-4 h-4" />
            عملکرد و مسیر رانندگان
          </button>
        )}

        {(role !== 'driver' || role === 'visitor') && (
          <button
            onClick={() => setActiveTab("warehouse")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0 cursor-pointer ${
              activeTab === "warehouse"
                ? "bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <Layers className="w-4 h-4" />
            گزارش کلی انبار
          </button>
        )}


        {role !== 'driver' && role !== 'visitor' && (
          <button
            onClick={() => setActiveTab("forecast")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0 cursor-pointer ${
              activeTab === "forecast"
                ? "bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <Calculator className="w-4 h-4" />
            پیش‌بینی نیاز انبار
          </button>
        )}

        {role === 'admin' && (
          <button
            onClick={() => setActiveTab("config")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0 cursor-pointer ${
              activeTab === "config"
                ? "bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <Settings className="w-4 h-4" />
            پیکربندی پایه و کالاها
          </button>
        )}

        {role === 'admin' && (
          <button
            onClick={() => setActiveTab("logs")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0 cursor-pointer ${
              activeTab === "logs"
                ? "bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <FileText className="w-4 h-4" />
            لاگ تغییرات
          </button>
        )}

        {role === 'admin' && (
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0 cursor-pointer ${
              activeTab === "users"
                ? "bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <Users className="w-4 h-4" />
            کاربران
          </button>
        )}

        {role === 'admin' && (
          <button
            onClick={() => setActiveTab("backup")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0 cursor-pointer ${
              activeTab === "backup"
                ? "bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <Archive className="w-4 h-4" />
            پشتیبان‌گیری
          </button>
        )}
      </nav>

      <main className="flex-1 overflow-auto p-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin" />
            <p className="text-slate-400 font-medium">داده‌ها در حال همگام‌سازی و بارگذاری هستند...</p>
          </div>
        )}

        {!loading && (
          <AnimatePresence mode="wait">
            {activeTab === "logs" && role === "admin" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
              >
                <ActivityLogScreen />
              </motion.div>
            )}

            {activeTab === "users" && role === "admin" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
              >
                <UserManagementScreen />
              </motion.div>
            )}

            {activeTab === "backup" && role === "admin" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 max-w-3xl"
              >
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                    <Archive className="w-4 h-4 text-slate-500" />
                    دانلود پشتیبان
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    فایل پشتیبان روی سیستم خودتون (کامپیوتر/موبایل) دانلود می‌شه — هر وقت خواستید می‌تونید همون فایل رو دوباره آپلود کنید تا اطلاعاتش با سیستم فعلی ادغام بشه.
                  </p>
                  <button
                    onClick={() => handleDownloadBackup(false)}
                    disabled={backupDownloading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-sm transition shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    {backupDownloading ? "در حال آماده‌سازی..." : "دانلود پشتیبان کامل"}
                  </button>

                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <p className="text-xs font-bold text-slate-600">دانلود فقط یک بازه‌ی زمانی مشخص:</p>
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                      <div className="flex-1 space-y-1">
                        <label className="text-[11px] text-slate-500 font-bold block">از تاریخ:</label>
                        <input
                          type="text"
                          value={backupFromDate}
                          onChange={(e) => setBackupFromDate(e.target.value)}
                          placeholder="1405/01/01"
                          dir="ltr"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono text-center focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[11px] text-slate-500 font-bold block">تا تاریخ:</label>
                        <input
                          type="text"
                          value={backupToDate}
                          onChange={(e) => setBackupToDate(e.target.value)}
                          placeholder="1405/04/31"
                          dir="ltr"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono text-center focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition"
                        />
                      </div>
                      <button
                        onClick={() => handleDownloadBackup(true)}
                        disabled={backupDownloading}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-sm transition shadow-md disabled:opacity-50 cursor-pointer whitespace-nowrap"
                      >
                        <Download className="w-4 h-4" />
                        دانلود بازه زمانی
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-slate-500" />
                    بازگردانی از فایل پشتیبان
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    فایل پشتیبانی که قبلاً دانلود کرده بودید رو انتخاب کنید. اطلاعات داخلش با اطلاعات فعلی سیستم <span className="font-bold text-slate-700">ادغام</span> می‌شه — یعنی فقط چیزهای جدید (روز، فاکتور، راننده، کالا، کاربر) اضافه می‌شن؛ هیچی از اطلاعات فعلی حذف یا جایگزین نمی‌شه.
                    <br />
                    <span className="text-slate-400">فایل‌های قدیمی <code className="bg-slate-100 px-1 rounded">db_store.json</code> و <code className="bg-slate-100 px-1 rounded">db_logs.json</code> از نسخه‌های قبلی هم پشتیبانی می‌شن؛ سیستم خودکار تشخیص می‌ده.</span>
                  </p>
                  <input
                    ref={backupFileInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleRestoreBackupFile(file);
                    }}
                    disabled={backupRestoring}
                    className="block w-full text-xs text-slate-600 file:ml-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 cursor-pointer disabled:opacity-50"
                  />
                  {backupRestoring && (
                    <p className="text-xs text-cyan-600 font-bold flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      در حال بازگردانی و ادغام اطلاعات...
                    </p>
                  )}
                </div>

                {user?.email === "admin@system.com" && (
                  <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-5 shadow-sm space-y-5">
                    <h4 className="text-sm font-extrabold text-rose-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      منطقه خطر — فقط مدیر اصلی
                    </h4>

                    <div className="space-y-2 pb-4 border-b border-rose-200">
                      <p className="text-xs font-bold text-rose-700">پاک کردن برنامه‌های روزانه و لاگ‌ها</p>
                      <p className="text-[11px] text-rose-600/80 leading-relaxed">
                        تمام فاکتورهای ثبت‌شده در همه‌ی تاریخ‌ها و کل تاریخچه‌ی لاگ فعالیت پاک می‌شن. رانندگان، کالاها و کاربران دست‌نخورده می‌مونن.
                      </p>
                      <button
                        onClick={handleResetDailyData}
                        disabled={resettingDailyData}
                        className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition shadow-md disabled:opacity-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {resettingDailyData ? "در حال پاک‌سازی..." : "پاک کردن برنامه‌های روزانه"}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-rose-700">ریست کامل کارخانه‌ای</p>
                      <p className="text-[11px] text-rose-600/80 leading-relaxed">
                        سیستم کاملاً خام می‌شه: رانندگان، کالاها، تمام برنامه‌های روزانه، لاگ‌ها، و همه‌ی کاربران <span className="font-bold">به‌جز خود شما (مدیر اصلی)</span> پاک می‌شن. این عملیات برگشت‌ناپذیره.
                      </p>
                      {!showFactoryResetConfirm ? (
                        <button
                          onClick={() => setShowFactoryResetConfirm(true)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-white border-2 border-rose-600 text-rose-700 hover:bg-rose-100 font-bold rounded-xl text-xs transition cursor-pointer"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          می‌خوام کل سیستم رو ریست کنم
                        </button>
                      ) : (
                        <div className="bg-white border border-rose-300 rounded-xl p-4 space-y-3">
                          <p className="text-[11px] font-bold text-rose-700">
                            برای تأیید نهایی، عبارت <span className="font-mono bg-rose-100 px-1.5 py-0.5 rounded">RESET</span> رو دقیقاً در کادر زیر تایپ کنید:
                          </p>
                          <input
                            type="text"
                            value={factoryResetConfirmText}
                            onChange={(e) => setFactoryResetConfirmText(e.target.value)}
                            placeholder="RESET"
                            dir="ltr"
                            className="w-full px-3 py-2 bg-slate-50 border border-rose-200 rounded-xl text-sm font-mono font-bold text-center focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white transition"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleFactoryReset}
                              disabled={factoryResetConfirmText !== "RESET" || factoryResetting}
                              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-xl text-xs transition shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {factoryResetting ? "در حال ریست کامل..." : "تأیید نهایی و ریست کامل"}
                            </button>
                            <button
                              onClick={() => { setShowFactoryResetConfirm(false); setFactoryResetConfirmText(""); }}
                              disabled={factoryResetting}
                              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                            >
                              انصراف
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "forecast" && role !== 'driver' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
              >
                <StockForecastScreen 
                  products={validProducts}
                  getProductStock={getProductStock}
                  allocatedQuantities={allocatedQuantities}
                  getProductSalesInPeriod={getProductSalesInPeriod}
                />
              </motion.div>
            )}
            
            {activeTab === "dashboard" && (
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
                      <span className="text-xs text-slate-500 font-bold block mb-1">حجم کل فروش ۳۰ روز گذشته</span>
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
                      <span className="text-xs text-slate-500 font-bold block mb-1">حجم کل ورودی ۳۰ روز گذشته</span>
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
                            ۱۰ محصول پرفروش انبار (۳۰ روز گذشته)
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
            )}

            {activeTab === "planning" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">برنامه ریزی و فروش(کنترل هوشمند)</h2>
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
                        className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 rounded-xl text-xs font-bold transition shadow-sm animate-pulse"
                        title="انتقال فاکتورهای غیرفعال به فردا"
                      >
                        <Calendar className="w-4 h-4 text-amber-600 animate-spin-slow" />
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
                      title="دانلود فایل اکسل پیشرفته با دو تب تفکیکی کارتن و کیلوگرم همراه با کل ستون‌های رانندگان"
                    >
                      <Download className="w-4 h-4 text-cyan-100" />
                      خروجی اکسل روزانه
                    </button>
                    <button
                      onClick={handleAddInvoiceRun}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-sm transition shadow-md"
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
                        .map((cat) => {
                          return (
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
                          );
                        })}
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
                          className="mr-1 flex items-center gap-1 bg-rose-600 hover:bg-rose-500 transition-colors text-white text-xs font-bold rounded-full px-3 py-1"
                          title="پاک کردن مقادیر سلول‌های انتخاب‌شده"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          پاک کردن
                        </button>
                        <button
                          onClick={() => { setCellSelection(null); selectionAnchorRef.current = null; }}
                          className="text-slate-400 hover:text-white transition-colors text-xs px-1"
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
                          <table className="text-right text-xs table-fixed" style={{ width: `${1710 + invoices.length * 130}px` }}>
                            <thead className="sticky top-0 z-30 bg-slate-50 border-b border-slate-200">
                              <tr className="border-b border-slate-200 bg-slate-50">
                                <th 
                                  className="sticky right-0 z-40 bg-blue-300 py-2.5 px-1 font-black text-black w-[110px] text-center border-l border-blue-400 shadow-[[-3px_0_6px_rgba(0,0,0,0.06)]]"
                                  style={{ right: 0 }}
                                >
                                  نوع مغز
                                </th>
                                <th 
                                  className="sticky z-40 bg-blue-300 py-2.5 px-1 font-black text-black w-[90px] text-center border-l border-blue-400 shadow-[[-3px_0_6px_rgba(0,0,0,0.06)]]"
                                  style={{ right: '110px' }}
                                >
                                  طعم
                                </th>

                                {invoices.map((inv, index) => {
                                  const isActive = inv.isActive !== false;
                                  return (
                                    <th
                                      key={inv.id}
                                      rowSpan={2}
                                      className={`p-1.5 border-l border-slate-200 min-w-[135px] w-[140px] transition-all duration-300 ${
                                        !isActive 
                                          ? "bg-slate-100 opacity-60 saturate-50" 
                                          : "bg-gradient-to-b from-blue-50/70 to-white border-t-2 border-t-blue-500"
                                      }`}
                                    >
                                      <div className="space-y-1.5 text-right">
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
                                              className="w-3.5 h-3.5 rounded cursor-pointer transition focus:ring-1 text-blue-600 focus:ring-blue-500 border-blue-300"
                                            />
                                            <span>فعال</span>
                                          </label>

                                          <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md font-mono ${
                                            !isActive 
                                              ? "bg-slate-200/60 text-slate-500" 
                                              : "bg-blue-100 text-blue-800"
                                          }`}>
                                            {index + 1}
                                          </span>

                                          <button
                                            onClick={() => handleDeleteInvoice(inv.id)}
                                            className="p-0.5 rounded transition text-blue-400 hover:text-rose-600 hover:bg-blue-100/50"
                                            title="حذف سفر"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>

                                        <div className="relative">
                                          <div className={`rounded-md border p-1 transition-all shadow-sm ${getDriverColorClass(inv.driverName, inv.round)}`}>
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

                                        <div className="space-y-1 bg-white/60 p-1 rounded-md border border-slate-150 shadow-sm">
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
                                              className={`w-full font-black focus:outline-none text-center pl-1 pr-7 text-xs rounded py-1 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 border ${getDriverColorClass(inv.driverName)}`}
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
                                                  const nextInput = document.getElementById(`shippingAgency-${index}`);
                                                  if (nextInput) {
                                                    nextInput.focus();
                                                    (nextInput as HTMLInputElement).select();
                                                  }
                                                }
                                              }}
                                              className={`w-full font-black focus:outline-none text-center pl-1 pr-7 text-xs rounded py-1 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 border ${getDriverColorClass(inv.driverName)}`}
                                              placeholder="مقصد / مسیر..."
                                            />
                                          </div>
                                          <div className="relative">
                                            <span className="absolute right-1 top-1.5 text-[8px] text-slate-400 pointer-events-none font-bold">باربری:</span>
                                            <input
                                              id={`shippingAgency-${index}`}
                                              type="text"
                                              value={inv.shippingAgency || ""}
                                              onChange={(e) => handleUpdateInvoiceHeader(inv.id, "shippingAgency", e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                  e.preventDefault();
                                                  const nextInput = document.getElementById(`description-${index}`);
                                                  if (nextInput) {
                                                    nextInput.focus();
                                                    (nextInput as HTMLInputElement).select();
                                                  }
                                                }
                                              }}
                                              className={`w-full font-black focus:outline-none text-center pl-1 pr-9 text-xs rounded py-1 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 border ${getDriverColorClass(inv.driverName)}`}
                                              placeholder="باربری..."
                                            />
                                          </div>
                                          <div className="relative">
                                            <span className="absolute right-1 top-1.5 text-[8px] text-slate-400 pointer-events-none font-bold">توضیحات:</span>
                                            <input
                                              id={`description-${index}`}
                                              type="text"
                                              value={inv.description || ""}
                                              onChange={(e) => handleUpdateInvoiceHeader(inv.id, "description", e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                  e.preventDefault();
                                                  const firstCell = document.getElementById(`cell-${index}-0`);
                                                  if (firstCell) {
                                                    firstCell.focus();
                                                    (firstCell as HTMLInputElement).select();
                                                  }
                                                }
                                              }}
                                              className={`w-full font-bold focus:outline-none text-center pl-1 pr-11 text-[9px] rounded py-1 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 border ${getDriverColorClass(inv.driverName)}`}
                                              placeholder="توضیحات..."
                                            />
                                          </div>
                                        </div>

                                        {(() => {
                                          const weight = getInvoiceWeight(inv);
                                          const limit = getDriverCapacity(inv.driverName);
                                          const isOverloaded = weight > limit;
                                          return (
                                            <div className={`flex flex-col items-center justify-center p-1 rounded-md border transition-all ${
                                              !isActive
                                                ? "bg-slate-100 border-slate-200 text-slate-400"
                                                : "bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm"
                                            }`}>
                                              <div className="text-[8px] font-bold opacity-80 leading-tight">جمع کل وزن بار:</div>
                                              <div className="text-[11.5px] font-black tracking-tight leading-none mt-0.5">
                                                {weight.toLocaleString("en-US", { maximumFractionDigits: 1 })} Kg
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </th>
                                  );
                                })}

                                <th className="bg-emerald-200 py-2 px-1 font-bold text-emerald-950 w-[85px] text-center border-l border-slate-200">
                                  جمع
                                </th>
                                <th className="bg-emerald-200 py-2 px-1 font-bold text-emerald-950 w-[85px] text-center border-l border-slate-200">
                                  موجودی دستی
                                </th>
                                <th className="bg-emerald-200 py-2 px-1 font-bold text-emerald-950 w-[85px] text-center border-l border-slate-200">
                                  موجودی
                                </th>
                                <th className="bg-emerald-200 py-2 px-1 font-bold text-emerald-950 w-[85px] text-center border-l border-slate-200">
                                  باقیمانده
                                </th>
                                <th className="bg-rose-200 py-2 px-1 font-bold text-rose-950 w-[85px] text-center border-l border-slate-200">
                                  کسری
                                </th>
                                {driverSearchSlots.map((slot, idx) => {
                                  const realIdx = 9 - idx;
                                  const driver = driverSearchSlots[realIdx];
                                  let totalCartons = 0;
                                  if (driver) {
                                    invoices
                                      .filter((inv) => isSameDriver(inv.driverName, driver) && inv.isActive !== false)
                                      .forEach((inv) => {
                                        totalCartons += getInvoiceCartonsVolumetric(inv);
                                      });
                                  }

                                  return (
                                    <th key={idx} className="bg-orange-50/90 py-1.5 px-1 border-l border-slate-200 text-center w-[100px] min-w-[100px] max-w-[100px]">
                                      <div className="space-y-1">
                                        <div className="flex flex-col items-center justify-center">
                                          <span className="text-[10px] text-orange-700 font-extrabold block">جستجو {10 - idx}</span>
                                          {driver && totalCartons > 0 && (
                                            <span className="text-[10px] text-red-700 font-bold bg-red-50 px-1 rounded block mt-0.5" dir="rtl">
                                              {totalCartons.toLocaleString("en-US", { maximumFractionDigits: 1 })} کارتن
                                            </span>
                                          )}
                                        </div>
                                        <div className="rounded border border-orange-200 bg-white p-0.5">
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
                                <th className="bg-orange-100 py-2 px-1 font-bold text-slate-800 w-[85px] text-center border-l border-slate-200">
                                  جمع کل جستجو (Kg)
                                </th>
                              </tr>

                              {(() => {
                                const filteredProducts = validProducts.filter((p) => selectedCategoryFilter === "all" || p.category === selectedCategoryFilter);
                                let sumAllocated = 0;
                                let sumStock = 0;
                                let sumShortage = 0;

                                filteredProducts.forEach((p) => {
                                  const allocated = allocatedQuantities[p.id] || 0;
                                  const currentStock = getProductStock(p.id, p.defaultStock);

                                  sumAllocated += allocated;
                                  sumStock += currentStock;

                                  const rem = currentStock - allocated;
                                  if (rem < 0) {
                                    sumShortage += Math.abs(rem);
                                  }
                                });

                                const sumRemaining = sumStock - sumAllocated;

                                return (
                                  <tr className="border-b border-slate-200 bg-amber-100/90 font-mono font-bold text-amber-950 text-[11px] h-9">
                                    <th 
                                      className="sticky right-0 z-40 bg-blue-300 py-1.5 px-2 text-center border-l border-blue-400 font-sans text-[11px] font-black text-black w-[110px]"
                                      style={{ right: 0 }}
                                    >
                                      جمع کل
                                    </th>
                                    <th 
                                      className="sticky z-40 bg-blue-300 py-1.5 px-2 text-center border-l border-blue-400 font-sans text-[10px] font-black text-black w-[90px]"
                                      style={{ right: '110px' }}
                                    >
                                      (کیلو)
                                    </th>

                                    {invoices.map((inv, idx) => (
                                      <th key={idx} className="py-1 px-0.5 text-center border-l border-slate-200 bg-amber-100/50 font-mono font-bold text-amber-950">
                                        {getInvoiceWeight(inv).toLocaleString("en-US", { maximumFractionDigits: 1 })}
                                      </th>
                                    ))}

                                    <th className="py-1 px-0.5 text-center border-l border-slate-200 text-emerald-950 font-bold bg-emerald-200">
                                      {sumAllocated.toLocaleString("en-US", { maximumFractionDigits: 1 })}
                                    </th>
                                    <th className="py-1 px-0.5 text-center border-l border-slate-200 bg-emerald-200"></th>
                                    <th className="py-1 px-0.5 text-center border-l border-slate-200 text-emerald-950 font-bold bg-emerald-200">
                                      {sumStock.toLocaleString("en-US", { maximumFractionDigits: 1 })}
                                    </th>
                                    <th className={`py-1 px-0.5 text-center border-l border-slate-200 font-bold ${sumRemaining < 0 ? "text-rose-800 bg-rose-200 font-extrabold" : "bg-emerald-200 text-emerald-950"}`}>
                                      {sumRemaining.toLocaleString("en-US", { maximumFractionDigits: 1 })}
                                    </th>
                                    <th className="py-1 px-0.5 text-center border-l border-slate-200 font-bold text-rose-900 bg-rose-200 font-extrabold">
                                      {sumShortage.toLocaleString("en-US", { maximumFractionDigits: 1 })}
                                    </th>
                                    {driverSearchSlots.map((slot, idx) => {
                                      const realIdx = 9 - idx;
                                      const driver = driverSearchSlots[realIdx];
                                      let slotTotalWeight = 0;
                                      if (driver) {
                                        filteredProducts.forEach((p) => {
                                          invoices
                                            .filter((inv) => isSameDriver(inv.driverName, driver) && inv.isActive !== false)
                                            .forEach((inv) => {
                                              slotTotalWeight += Number(inv.quantities[p.id] || 0);
                                            });
                                        });
                                      }
                                      return (
                                        <th key={idx} className="bg-orange-100/70 py-1 px-1 border-l border-slate-200 text-center text-red-700 font-bold text-[11px] font-mono">
                                          {slotTotalWeight > 0 ? slotTotalWeight.toLocaleString("en-US") : "-"}
                                        </th>
                                      );
                                    }).reverse()}
                                    <th className="bg-orange-100 py-1 px-1 border-l border-slate-200 text-center text-slate-900 font-extrabold text-[11px] font-mono" dir="rtl">
                                      {(() => {
                                        let searchGrandTotalWeight = 0;
                                        driverSearchSlots.forEach((driver) => {
                                          if (driver) {
                                            filteredProducts.forEach((p) => {
                                              invoices
                                                .filter((inv) => isSameDriver(inv.driverName, driver) && inv.isActive !== false)
                                                .forEach((inv) => {
                                                  searchGrandTotalWeight += Number(inv.quantities[p.id] || 0);
                                                });
                                            });
                                          }
                                        });
                                        return searchGrandTotalWeight > 0 ? `${searchGrandTotalWeight.toLocaleString("en-US")} Kg` : "0";
                                      })()}
                                    </th>
                                  </tr>
                                );
                              })()}


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
                                            className={`p-0.5 border-l border-slate-200 text-center select-none ${getDriverCellColorClass(inv.driverName, inv.round, qty, isActive)} ${borderBottomClass} ${isSelectedCell ? "ring-2 ring-inset ring-emerald-500 bg-emerald-100/60" : ""}`}
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
                                              className={`border rounded py-0.5 px-0.5 h-7 w-full font-mono text-center font-extrabold text-xs focus:outline-none ${
                                                !isActive
                                                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-40"
                                                  : qty > 0
                                                    ? "bg-blue-300 text-blue-950 border-blue-400 focus:border-blue-600 focus:bg-blue-200"
                                                    : "bg-blue-100/50 text-blue-900 border-blue-200 focus:border-blue-400 focus:bg-blue-50"
                                              }`}
                                              placeholder="-"
                                              disabled={!isActive}
                                            />
                                          </td>
                                        );
                                      })}

                                      <td className={`py-1 px-0.5 border-l border-slate-200 text-center bg-emerald-100 font-mono text-emerald-950 w-[85px] ${borderBottomClass} group-focus-within:bg-blue-300 group-focus-within:text-blue-950 group-focus-within:group-hover:bg-blue-300 group-focus-within:group-hover:text-blue-950`}>
                                        <div className="font-extrabold text-xs">{allocated > 0 ? allocated.toLocaleString("en-US") : "0"}</div>
                                      </td>

                                      <td className={`p-0.5 border-l border-slate-200 text-center bg-emerald-100/60 w-[85px] ${borderBottomClass} group-focus-within:bg-blue-300 group-focus-within:text-blue-950 group-focus-within:group-hover:bg-blue-300 group-focus-within:group-hover:text-blue-950`}>
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

                                      <td className={`py-1 px-0.5 border-l border-slate-200 text-center bg-emerald-100 font-mono text-emerald-950 w-[85px] ${borderBottomClass} group-focus-within:bg-blue-300 group-focus-within:text-blue-950 group-focus-within:group-hover:bg-blue-300 group-focus-within:group-hover:text-blue-950`}>
                                        <div className="font-extrabold text-xs">{currentStock !== 0 ? currentStock.toLocaleString("en-US") : "0"}</div>
                                      </td>

                                      <td
                                        className={`py-1 px-0.5 border-l border-slate-200 text-center font-mono transition w-[85px] ${borderBottomClass} ${
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
                                        className={`py-1 px-0.5 border-l border-slate-200 text-center font-mono transition w-[85px] ${borderBottomClass} ${
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
                                          <td key={idx} className={`py-1 px-1 border-l border-slate-200 font-mono text-center text-xs text-slate-700 font-extrabold bg-orange-50/15 group-hover:bg-orange-100/30 ${borderBottomClass} group-focus-within:bg-blue-300 group-focus-within:text-blue-950 group-focus-within:group-hover:bg-blue-300 group-focus-within:group-hover:text-blue-950`}>
                                            {productWeight > 0 ? productWeight.toLocaleString("en-US") : "0"}
                                          </td>
                                        );
                                      }).reverse()}
                                      <td className={`py-1 px-1 border-l border-slate-200 font-mono text-center text-xs text-slate-900 font-black bg-orange-100/20 group-hover:bg-orange-100/40 ${borderBottomClass} group-focus-within:bg-blue-300 group-focus-within:text-blue-950 group-focus-within:group-hover:bg-blue-300 group-focus-within:group-hover:text-blue-950`}>
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
              </motion.div>
            )}

            {activeTab === "drivers" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {(() => {
                  const activeSearchDrivers: string[] = Array.from(
                    new Set(
                      visibleInvoices
                        .filter((inv) => inv.isActive !== false && inv.driverName && inv.driverName.trim() !== "")
                        .map((inv) => inv.driverName.trim())
                    )
                  );

                  if (activeSearchDrivers.length === 0) {
                    return (
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
                    );
                  }

                  return (
                    <div className="space-y-6">
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
                        {activeSearchDrivers.map((drvName, idx) => {
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
                              <div className={`h-1.5 w-full bg-gradient-to-l ${getDriverAccentClasses(drvName).gradient}`} />

                              <div className="p-5 space-y-4">
                                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${getDriverAccentClasses(drvName).gradient} text-white shadow-md`}>
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
                                      <span key={run.id} className={`text-xs px-2 py-0.5 rounded-lg font-black inline-block border ${getCustomerPillClasses(drvName)}`}>
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

                              <div className="pt-3 mt-4 border-t border-slate-100">
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
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {activeTab === "warehouse" && (
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
                  <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-start`}>
                  
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
            )}



            {activeTab === "config" && (
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
                                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: products.find(p => p.id === drv.color)?.hex || '#ccc' }}></div>
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
            )}
          </AnimatePresence>
        )}
      </main>

      <footer className="py-5 px-6 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl text-center text-xs text-slate-500 dark:text-slate-400 select-none no-print transition-colors duration-300 w-full shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-bold">
            © کلیه حقوق مادی و معنوی این سیستم برای <span className="text-blue-600 dark:text-cyan-400 text-sm font-black">برناتجارت باور</span> محفوظ است.
          </p>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400 transition-all shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>حق کپی رایت محفوظ است:</span>
            <a href="mailto:nazari925@gmail.com" className="underline hover:no-underline">nazari925@gmail.com</a>
          </div>
        </div>
      </footer>
      </div>

      {renderCustomerSearchModal()}

      <AnimatePresence>
        {showPrintPreview && (
          <div className="print-modal-backdrop fixed inset-0 z-[100] flex flex-col bg-slate-50 text-slate-900 w-full h-full p-6 print:p-0 print:bg-white overflow-hidden print:static print:h-auto" dir="rtl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 no-print max-w-7xl mx-auto w-full border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">پیش‌نمایش چاپ جدول جستجو</h2>
                <p className="text-xs text-slate-500 mt-1">جهت چاپ با کیفیت بالا و تنظیمات کاغذ خودکار</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold rounded-xl transition cursor-pointer text-sm"
                >
                  انصراف و بازگشت
                </button>
                
                <a
                  href={typeof window !== "undefined" ? window.location.href : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition cursor-pointer text-sm flex items-center gap-2 shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  باز کردن در تب جدید مرورگر
                </a>

                <button
                  onClick={() => {
                    console.log("Print button clicked");
                    let isIframe = false;
                    try {
                      isIframe = window.self !== window.top;
                    } catch (e) {
                      isIframe = true;
                    }

                    if (isIframe) {
                      setNotification({ 
                        type: "info", 
                        message: "به دلیل محدودیت‌های امنیتی پیش‌نمایش، لطفاً ابتدا روی دکمه آبی رنگ 'باز کردن در تب جدید مرورگر' کلیک کنید و در صفحه جدید کلید چاپ را بزنید." 
                      });
                    }
                    
                    try {
                      setTimeout(() => {
                        window.print();
                      }, 100);
                    } catch (printError) {
                      console.error("Failed to execute window.print():", printError);
                    }
                  }}
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold rounded-xl transition cursor-pointer text-sm flex items-center gap-2 shadow-sm"
                >
                  <Printer className="w-5 h-5" />
                  چاپ نهایی
                </button>
              </div>
            </div>

            {typeof window !== "undefined" && window.self !== window.top && (
              <div className="no-print max-w-7xl mx-auto w-full mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">⚠️</span>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">مرورگر شما در کادر فعلی اجازه چاپ مستقیم نمی‌دهد</h4>
                    <p className="text-xs text-amber-700 mt-1">
                      به دلیل قوانین امنیتی نمایشگرهای جانبی (iFrame)، دکمه پرینت در این بخش مسدود است. لطفاً دکمه آبی بالا را بزنید تا برنامه در صفحه مستقل باز شده و پرینت بدون هیچ مشکلی انجام شود.
                    </p>
                  </div>
                </div>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  انتقال فوری به صفحه مستقل
                </a>
              </div>
            )}
            
            <div className="flex-1 overflow-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-4 print:shadow-none print:border-none print:p-0 no-scrollbar max-w-7xl mx-auto w-full print:max-w-none print:overflow-visible" id="printable-matrix-outer">
              {renderMatrixContent(true)}
            </div>
          </div>
        )}
      </AnimatePresence>

      {driverPrintPreview && (
        <div className="print-modal-backdrop fixed inset-0 z-[100] flex flex-col bg-slate-50 text-slate-900 w-full h-full p-6 print:p-0 print:bg-white overflow-hidden print:static print:h-auto" dir="rtl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 no-print max-w-4xl mx-auto w-full border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">پیش‌نمایش چاپ حواله بارگیری راننده</h2>
                <p className="text-xs text-slate-500 mt-1">نسخه چاپی رسمی با حذف خودکار تمامی ردیف‌های صفر</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setDriverPrintPreview(false)}
                  className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold rounded-xl transition cursor-pointer text-sm"
                >
                  انصراف و بازگشت
                </button>
                
                <a
                  href={typeof window !== "undefined" ? window.location.href : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition cursor-pointer text-sm flex items-center gap-2 shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  باز کردن در تب جدید مرورگر
                </a>

                <button
                  onClick={() => {
                    console.log("Print button clicked");
                    let isIframe = false;
                    try {
                      isIframe = window.self !== window.top;
                    } catch (e) {
                      isIframe = true;
                    }

                    if (isIframe) {
                      setNotification({ 
                        type: "info", 
                        message: "به دلیل محدودیت‌های امنیتی پیش‌نمایش، لطفاً ابتدا روی دکمه آبی رنگ 'باز کردن در تب جدید مرورگر' کلیک کنید و در صفحه جدید کلید چاپ را بزنید." 
                      });
                    }
                    
                    try {
                      setTimeout(() => {
                        window.print();
                      }, 100);
                    } catch (printError) {
                      console.error("Failed to execute window.print():", printError);
                    }
                  }}
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold rounded-xl transition cursor-pointer text-sm flex items-center gap-2 shadow-sm"
                >
                  <Printer className="w-5 h-5" />
                  چاپ نهایی حواله
                </button>
              </div>
            </div>

            {typeof window !== "undefined" && window.self !== window.top && (
              <div className="no-print max-w-4xl mx-auto w-full mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">⚠️</span>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">مرورگر شما در کادر فعلی اجازه چاپ مستقیم نمی‌دهد</h4>
                    <p className="text-xs text-amber-700 mt-1">
                      به دلیل قوانین امنیتی نمایشگرهای جانبی (iFrame)، دکمه پرینت در این بخش مسدود است. لطفاً دکمه آبی بالا را بزنید تا برنامه در صفحه مستقل باز شده و پرینت بدون هیچ مشکلی انجام شود.
                    </p>
                  </div>
                </div>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  انتقال فوری به صفحه مستقل
                </a>
              </div>
            )}
            
            <div className="flex-1 overflow-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 print:shadow-none print:border-none print:p-0 print:m-0 no-scrollbar max-w-4xl mx-auto w-full print:max-w-none print:overflow-visible print:flex-none print:h-auto" id="printable-matrix-outer">
              {renderDriverSheetsContent(true, printDriverName)}
            </div>
          </div>
        )}

        {showDatePicker && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-xs" id="datepicker-modal">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200" dir="rtl">
              <div className="bg-slate-950 text-white p-5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-extrabold text-sm">انتخاب سریع تاریخ</h3>
                </div>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="text-slate-400 hover:text-white transition text-2xl font-bold cursor-pointer leading-none"
                >
                  &times;
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-extrabold text-slate-500 block">انتخاب از لیست کشویی:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 font-bold">سال</label>
                      <select
                        value={tempYear}
                        onChange={(e) => setTempYear(parseInt(e.target.value))}
                        className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        {Array.from({ length: 15 }, (_, i) => 1400 + i).map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 font-bold">ماه</label>
                      <select
                        value={tempMonth}
                        onChange={(e) => {
                          const m = parseInt(e.target.value);
                          setTempMonth(m);
                          const maxDays = SHAMSI_MONTHS.find((mon) => mon.id === m)?.days || 30;
                          if (tempDay > maxDays) {
                            setTempDay(maxDays);
                          }
                        }}
                        className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        {SHAMSI_MONTHS.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 font-bold">روز</label>
                      <select
                        value={tempDay}
                        onChange={(e) => setTempDay(parseInt(e.target.value))}
                        className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        {Array.from(
                          { length: SHAMSI_MONTHS.find((m) => m.id === tempMonth)?.days || 30 },
                          (_, i) => i + 1
                        ).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-150"></div>
                  <span className="flex-shrink mx-3 text-slate-400 text-[10px] font-bold">یا</span>
                  <div className="flex-grow border-t border-slate-150"></div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-500 block">وارد کردن دستی تاریخ (مثال: ۱۴۰۵/۰۴/۱۱):</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="1405/04/11"
                      value={manualDateInput}
                      onChange={(e) => setManualDateInput(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold text-center tracking-widest rounded-xl p-2.5 flex-1 focus:outline-none focus:border-cyan-500 focus:bg-white"
                    />
                    <button
                      onClick={() => {
                        let cleaned = manualDateInput.replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776));
                        const parts = cleaned.split(/[\/\- \s]+/);
                        if (parts.length === 3) {
                          const y = parseInt(parts[0]);
                          const m = parseInt(parts[1]);
                          const d = parseInt(parts[2]);
                          if (y >= 1390 && y <= 1420 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
                            setTempYear(y);
                            setTempMonth(m);
                            const maxDays = SHAMSI_MONTHS.find((mon) => mon.id === m)?.days || 30;
                            setTempDay(d > maxDays ? maxDays : d);
                            showNotification("success", "تاریخ وارد شده با موفقیت قالب‌بندی و تنظیم شد.");
                          } else {
                            showNotification("error", "تاریخ نامعتبر است! لطفا سال را بین ۱۳۹۰ تا ۱۴۲۰ و ماه را بین ۱ تا ۱۲ و روز را بین ۱ تا ۳۱ وارد کنید.");
                          }
                        } else {
                          showNotification("error", "فرمت تاریخ معتبر نیست. نمونه معتبر: 1405/04/11");
                        }
                      }}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      ثبت دستی
                    </button>
                  </div>
                </div>

                <div className="flex justify-start">
                  <button
                    onClick={() => {
                      setTempYear(todayShamsi.year);
                      setTempMonth(todayShamsi.month);
                      setTempDay(todayShamsi.day);
                      setManualDateInput(`${todayShamsi.year}/${String(todayShamsi.month).padStart(2, '0')}/${String(todayShamsi.day).padStart(2, '0')}`);
                      showNotification("info", "تنظیم موقت روی تاریخ امروز.");
                    }}
                    className="text-xs text-cyan-600 hover:text-cyan-700 font-bold underline cursor-pointer"
                  >
                    تنظیم موقت بر اساس تاریخ امروز
                  </button>
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShamsiYear(tempYear);
                      setShamsiMonth(tempMonth);
                      setShamsiDay(tempDay);
                      setShowDatePicker(false);
                      showNotification("success", `تاریخ برنامه به ${tempYear}/${String(tempMonth).padStart(2, '0')}/${String(tempDay).padStart(2, '0')} تغییر یافت.`);
                    }}
                    className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl text-xs font-extrabold shadow-md transition cursor-pointer"
                  >
                    اعمال و تغییر تاریخ برنامه
                  </button>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}