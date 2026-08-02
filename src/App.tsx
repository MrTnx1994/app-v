import React, { useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Package,
  RefreshCw
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as XLSX from "xlsx";
import { getTodayShamsi, SHAMSI_MONTHS, getShamsiWeekday, getTomorrowShamsiDate } from "./utils/shamsi";
import { Product, Driver, InvoiceRun, DailyPlan } from "./types";
import { useAuth } from "./context/AuthContext";
import { useDateManagement } from "./hooks/useDateManagement";
import { useInvoiceManagement } from "./hooks/useInvoiceManagement";
import { apiFetch, setAuthToken } from "./lib/apiClient";
import { LoginScreen } from "./components/LoginScreen";
import { ActivityLogScreen } from "./components/ActivityLogScreen";
import { UserManagementScreen } from "./components/UserManagementScreen";
import { StockForecastScreen } from "./components/StockForecastScreen";
import { DatePickerModal } from "./components/DatePickerModal";
import { BackupScreen } from "./components/BackupScreen";
import { DashboardScreen } from "./components/DashboardScreen";
import { DriversScreen } from "./components/DriversScreen";
import { WarehouseScreen } from "./components/WarehouseScreen";
import { ConfigScreen } from "./components/ConfigScreen";
import { CustomerSearchModal } from "./components/CustomerSearchModal";
import { PrintPreviewModal } from "./components/PrintPreviewModal";
import { PlanningScreen } from "./components/PlanningScreen";
import { AppHeader } from "./components/AppHeader";
import { ChangePasswordModal } from "./components/ChangePasswordModal";
import { renderMatrixContent as renderMatrixContentUtil, renderDriverSheetsContent as renderDriverSheetsContentUtil } from "./components/MatrixPrintSheets";
import { isSameDriver } from "./utils/driverHelpers";
import { getInvoiceWeight } from "./utils/invoiceCalculations";
import { exportToExcelHtml } from "./utils/excelExport";
import { logActivity } from "./lib/activityLog";

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
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);
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

  const handleCustomerSearch = async (overrideFromDate?: string, overrideToDate?: string) => {
    if (!customerSearchName.trim()) {
      setCustomerSearchError("لطفاً نام مشتری را وارد کنید.");
      return;
    }
    const from = overrideFromDate !== undefined ? overrideFromDate : customerSearchFromDate;
    const to = overrideToDate !== undefined ? overrideToDate : "";

    setCustomerSearchLoading(true);
    setCustomerSearchError(null);
    try {
      const params = new URLSearchParams({
        name: customerSearchName.trim(),
        fromDate: from.trim(),
        toDate: to.trim()
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
    exportToExcelHtml(
      invoices,
      validProducts,
      allocatedQuantities,
      getProductStock,
      manualStockOverrides,
      driverSearchSlots,
      selectedCategoryFilter,
      formattedDate,
      showNotification
    );
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

  const matrixProps = {
    products,
    drivers,
    invoices,
    driverSearchSlots,
    selectedCategoryFilter,
    shamsiYear,
    shamsiMonth,
    shamsiDay,
    validProducts
  };

  const renderMatrixContent = (isModal = false) => {
    return renderMatrixContentUtil(isModal, matrixProps);
  };

  const renderDriverSheetsContent = (isPrint: boolean, targetDriver: string | null) => {
    return renderDriverSheetsContentUtil(isPrint, targetDriver, matrixProps);
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

      <AppHeader
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        user={user}
        role={role}
        logout={logout}
        todayShamsi={todayShamsi}
        shamsiYear={shamsiYear}
        shamsiMonth={shamsiMonth}
        shamsiDay={shamsiDay}
        formattedDate={formattedDate}
        handlePrevDay={handlePrevDay}
        handleNextDay={handleNextDay}
        setTempYear={setTempYear}
        setTempMonth={setTempMonth}
        setTempDay={setTempDay}
        setManualDateInput={setManualDateInput}
        setShowDatePicker={setShowDatePicker}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenChangePassword={() => setShowChangePasswordModal(true)}
      />

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
              <BackupScreen
                handleDownloadBackup={handleDownloadBackup}
                backupDownloading={backupDownloading}
                backupFromDate={backupFromDate}
                setBackupFromDate={setBackupFromDate}
                backupToDate={backupToDate}
                setBackupToDate={setBackupToDate}
                backupFileInputRef={backupFileInputRef}
                handleRestoreBackupFile={handleRestoreBackupFile}
                backupRestoring={backupRestoring}
                userEmail={user?.email}
                handleResetDailyData={handleResetDailyData}
                resettingDailyData={resettingDailyData}
                showFactoryResetConfirm={showFactoryResetConfirm}
                setShowFactoryResetConfirm={setShowFactoryResetConfirm}
                factoryResetConfirmText={factoryResetConfirmText}
                setFactoryResetConfirmText={setFactoryResetConfirmText}
                handleFactoryReset={handleFactoryReset}
                factoryResetting={factoryResetting}
              />
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
              <DashboardScreen
                role={role}
                user={user}
                totalPlannedWeight={totalPlannedWeight}
                totalInitialStockWeight={totalInitialStockWeight}
                totalSentDrivers={totalSentDrivers}
                totalSentCustomers={totalSentCustomers}
                totalSales30Days={totalSales30Days}
                totalIncoming30Days={totalIncoming30Days}
                top3Drivers={top3Drivers as Array<[string, number]>}
                invoiceStats={invoiceStats}
                getTopTenProducts={getTopTenProducts}
                dashboardRightTab={dashboardRightTab}
                setDashboardRightTab={setDashboardRightTab}
                getCategorySalesAggregate={getCategorySalesAggregate}
                selectedCategorySales={selectedCategorySales}
                setSelectedCategorySales={setSelectedCategorySales}
                getCategoryFlavorsRanking={getCategoryFlavorsRanking}
                getCategoryAggregateStock={getCategoryAggregateStock}
              />
            )}

            {activeTab === "planning" && (
              <PlanningScreen
                role={role}
                invoices={invoices}
                drivers={drivers}
                products={products}
                allocatedQuantities={allocatedQuantities}
                getProductStock={getProductStock}
                manualStockOverrides={manualStockOverrides}
                driverSearchSlots={driverSearchSlots}
                setDriverSearchSlots={setDriverSearchSlots}
                shamsiYear={shamsiYear}
                shamsiMonth={shamsiMonth}
                shamsiDay={shamsiDay}
                formattedDate={formattedDate}
                selectedCategoryFilter={selectedCategoryFilter}
                setSelectedCategoryFilter={setSelectedCategoryFilter}
                isProductEditMode={isProductEditMode}
                setIsProductEditMode={setIsProductEditMode}
                gridSelectionStats={gridSelectionStats}
                setCellSelection={setCellSelection}
                selectionAnchorRef={selectionAnchorRef}
                gridZoomWrapperRef={gridZoomWrapperRef}
                zoomLabelRef={zoomLabelRef}
                sumBarCountRef={sumBarCountRef}
                sumBarValueRef={sumBarValueRef}
                handleUpdateInvoiceHeader={handleUpdateInvoiceHeader}
                handleDeleteInvoice={handleDeleteInvoice}
                handleUpdateCell={handleUpdateCell}
                handleUpdateStockOverride={handleUpdateStockOverride}
                handleAddInvoiceRun={handleAddInvoiceRun}
                handleResetCurrentDayPlan={handleResetCurrentDayPlan}
                saveDailyPlan={saveDailyPlan}
                saving={saving}
                handleMoveInactiveToTomorrow={handleMoveInactiveToTomorrow}
                openCustomerSearchModal={openCustomerSearchModal}
                handleExportExcel={handleExportExcel}
                setShowPrintPreview={setShowPrintPreview}
                handleGridCellMouseDown={handleGridCellMouseDown}
                handleGridCellMouseEnter={handleGridCellMouseEnter}
                handleClearSelectedGridCells={handleClearSelectedGridCells}
                handleZoomIn={handleZoomIn}
                handleZoomOut={handleZoomOut}
                handleZoomReset={handleZoomReset}
                isGridCellSelected={isGridCellSelected}
                saveMasterConfig={saveMasterConfig}
                setProducts={setProducts}
              />
            )}

            {activeTab === "drivers" && (
              <DriversScreen
                visibleInvoices={visibleInvoices}
                drivers={drivers}
                validProducts={validProducts}
                driverSearchSlots={driverSearchSlots}
                role={role}
                setPrintDriverName={setPrintDriverName}
                setDriverPrintPreview={setDriverPrintPreview}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === "warehouse" && (
              <WarehouseScreen
                role={role}
                openCustomerSearchModal={openCustomerSearchModal}
                handleExcelImport={handleExcelImport}
                shamsiYear={shamsiYear}
                shamsiMonth={shamsiMonth}
                shamsiDay={shamsiDay}
                getCustomRemainingStockSummary={getCustomRemainingStockSummary}
                getCustomWarehouseSummary={getCustomWarehouseSummary}
                detailedInventoryFilter={detailedInventoryFilter}
                setDetailedInventoryFilter={setDetailedInventoryFilter}
                validProducts={validProducts}
                getDetailedExcelGridData={getDetailedExcelGridData}
              />
            )}

            {activeTab === "config" && (
              <ConfigScreen
                editingDriverName={editingDriverName}
                newDriverName={newDriverName}
                setNewDriverName={setNewDriverName}
                newDriverVehicle={newDriverVehicle}
                setNewDriverVehicle={setNewDriverVehicle}
                newDriverColor={newDriverColor}
                setNewDriverColor={setNewDriverColor}
                handleAddDriver={handleAddDriver}
                handleCancelEditDriver={handleCancelEditDriver}
                editingProductId={editingProductId}
                newProductCategory={newProductCategory}
                setNewProductCategory={setNewProductCategory}
                newProductFlavor={newProductFlavor}
                setNewProductFlavor={setNewProductFlavor}
                newProductWeight={newProductWeight}
                setNewProductWeight={setNewProductWeight}
                newProductRealCartonWeight={newProductRealCartonWeight}
                setNewProductRealCartonWeight={setNewProductRealCartonWeight}
                newProductStock={newProductStock}
                setNewProductStock={setNewProductStock}
                handleAddProduct={handleAddProduct}
                handleCancelEditProduct={handleCancelEditProduct}
                drivers={drivers}
                setDrivers={setDrivers}
                products={products}
                driversTablePage={driversTablePage}
                setDriversTablePage={setDriversTablePage}
                saveMasterConfig={saveMasterConfig}
                showNotification={showNotification}
                handleEditDriver={handleEditDriver}
                handleDeleteDriver={handleDeleteDriver}
                productTableFilter={productTableFilter}
                setProductTableFilter={setProductTableFilter}
                productsTablePage={productsTablePage}
                setProductsTablePage={setProductsTablePage}
                handleEditProduct={handleEditProduct}
                handleDeleteProduct={handleDeleteProduct}
              />
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

      <CustomerSearchModal
        showCustomerSearchModal={showCustomerSearchModal}
        setShowCustomerSearchModal={setShowCustomerSearchModal}
        customerSearchName={customerSearchName}
        setCustomerSearchName={setCustomerSearchName}
        customerSearchFromDate={customerSearchFromDate}
        setCustomerSearchFromDate={setCustomerSearchFromDate}
        customerSearchResults={customerSearchResults}
        setCustomerSearchResults={setCustomerSearchResults}
        customerSearchLoading={customerSearchLoading}
        customerSearchError={customerSearchError}
        setCustomerSearchError={setCustomerSearchError}
        handleCustomerSearch={handleCustomerSearch}
        products={products}
      />

      <PrintPreviewModal
        showPrintPreview={showPrintPreview}
        setShowPrintPreview={setShowPrintPreview}
        driverPrintPreview={driverPrintPreview}
        setDriverPrintPreview={setDriverPrintPreview}
        printDriverName={printDriverName}
        renderMatrixContent={renderMatrixContent}
        renderDriverSheetsContent={renderDriverSheetsContent}
        setNotification={setNotification}
      />

      <DatePickerModal
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
        tempYear={tempYear}
        setTempYear={setTempYear}
        tempMonth={tempMonth}
        setTempMonth={setTempMonth}
        tempDay={tempDay}
        setTempDay={setTempDay}
        manualDateInput={manualDateInput}
        setManualDateInput={setManualDateInput}
        todayShamsi={todayShamsi}
        setShamsiYear={setShamsiYear}
        setShamsiMonth={setShamsiMonth}
        setShamsiDay={setShamsiDay}
        showNotification={showNotification}
      />

      <ChangePasswordModal
        show={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        showNotification={showNotification}
      />
    </div>
  );
}