import React from "react";
import { motion } from "motion/react";
import { Archive, Download, Upload, RefreshCw, AlertTriangle, Trash2 } from "lucide-react";

interface BackupScreenProps {
  backupDownloading: boolean;
  handleDownloadBackup: (isRange: boolean) => void;
  backupFromDate: string;
  setBackupFromDate: (val: string) => void;
  backupToDate: string;
  setBackupToDate: (val: string) => void;
  backupFileInputRef: React.RefObject<HTMLInputElement | null>;
  handleRestoreBackupFile: (file: File) => void;
  backupRestoring: boolean;
  userEmail?: string;
  handleResetDailyData: () => void;
  resettingDailyData: boolean;
  showFactoryResetConfirm: boolean;
  setShowFactoryResetConfirm: (show: boolean) => void;
  factoryResetConfirmText: string;
  setFactoryResetConfirmText: (val: string) => void;
  handleFactoryReset: () => void;
  factoryResetting: boolean;
}

export function BackupScreen({
  backupDownloading,
  handleDownloadBackup,
  backupFromDate,
  setBackupFromDate,
  backupToDate,
  setBackupToDate,
  backupFileInputRef,
  handleRestoreBackupFile,
  backupRestoring,
  userEmail,
  handleResetDailyData,
  resettingDailyData,
  showFactoryResetConfirm,
  setShowFactoryResetConfirm,
  factoryResetConfirmText,
  setFactoryResetConfirmText,
  handleFactoryReset,
  factoryResetting,
}: BackupScreenProps) {
  return (
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

      {userEmail === "admin@system.com" && (
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
  );
}
