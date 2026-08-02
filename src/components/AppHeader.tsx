import React from "react";
import {
  Truck,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Calendar,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  Calculator,
  Settings,
  FileText,
  Users,
  Archive,
  KeyRound
} from "lucide-react";
import { getShamsiWeekday } from "../utils/shamsi";

interface AppHeaderProps {
  user: any;
  role: string | null;
  logout: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  todayShamsi: { year: number; month: number; day: number; monthName: string };
  shamsiYear: number;
  shamsiMonth: number;
  shamsiDay: number;
  formattedDate: string;
  handlePrevDay: () => void;
  handleNextDay: () => void;
  setShowDatePicker: (val: boolean) => void;
  setTempYear: (val: number) => void;
  setTempMonth: (val: number) => void;
  setTempDay: (val: number) => void;
  setManualDateInput: (val: string) => void;
  activeTab: "dashboard" | "planning" | "drivers" | "warehouse" | "waybill" | "config" | "logs" | "users" | "forecast" | "backup";
  setActiveTab: (tab: any) => void;
  onOpenChangePassword?: () => void;
}

export function AppHeader({
  user,
  role,
  logout,
  isDarkMode,
  setIsDarkMode,
  todayShamsi,
  shamsiYear,
  shamsiMonth,
  shamsiDay,
  formattedDate,
  handlePrevDay,
  handleNextDay,
  setShowDatePicker,
  setTempYear,
  setTempMonth,
  setTempDay,
  setManualDateInput,
  activeTab,
  setActiveTab,
  onOpenChangePassword
}: AppHeaderProps) {
  return (
    <>
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
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenChangePassword}
                className="p-1.5 bg-slate-200/60 hover:bg-cyan-50 text-slate-600 hover:text-cyan-700 rounded-lg transition border border-slate-300 hover:border-cyan-200 flex items-center gap-1 text-xs font-bold cursor-pointer"
                title="تغییر رمز عبور"
              >
                <KeyRound className="w-3.5 h-3.5 text-cyan-600" />
                <span className="hidden sm:inline">تغییر رمز</span>
              </button>
              <button
                onClick={logout}
                className="p-1.5 bg-slate-200/60 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition border border-slate-300 hover:border-rose-200 flex items-center gap-1 text-xs font-bold cursor-pointer"
                title="خروج از حساب"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج</span>
              </button>
            </div>
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

        {role !== 'driver' && (
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
    </>
  );
}
