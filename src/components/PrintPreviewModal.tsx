import React from "react";
import { ExternalLink, Printer } from "lucide-react";

interface PrintPreviewModalProps {
  showPrintPreview: boolean;
  setShowPrintPreview: (show: boolean) => void;
  renderMatrixContent: (isPrint: boolean) => React.ReactNode;
  driverPrintPreview: boolean;
  setDriverPrintPreview: (show: boolean) => void;
  renderDriverSheetsContent: (isPrint: boolean, driverNameFilter: string | null) => React.ReactNode;
  printDriverName: string | null;
  setNotification: (notif: { type: "success" | "error" | "info"; message: string } | null) => void;
}

export function PrintPreviewModal({
  showPrintPreview,
  setShowPrintPreview,
  renderMatrixContent,
  driverPrintPreview,
  setDriverPrintPreview,
  renderDriverSheetsContent,
  printDriverName,
  setNotification,
}: PrintPreviewModalProps) {
  const handlePrintClick = () => {
    let isIframe = false;
    try {
      isIframe = window.self !== window.top;
    } catch (e) {
      isIframe = true;
    }

    if (isIframe) {
      setNotification({
        type: "info",
        message: "به دلیل محدودیت‌های امنیتی پیش‌نمایش، لطفاً ابتدا روی دکمه آبی رنگ 'باز کردن در تب جدید مرورگر' کلیک کنید و در صفحه جدید کلید چاپ را بزنید.",
      });
    }

    try {
      setTimeout(() => {
        window.print();
      }, 100);
    } catch (printError) {
      console.error("Failed to execute window.print():", printError);
    }
  };

  return (
    <>
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
                onClick={handlePrintClick}
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
                onClick={handlePrintClick}
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
    </>
  );
}
