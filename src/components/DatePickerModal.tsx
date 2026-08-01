import React from "react";
import { Calendar } from "lucide-react";
import { SHAMSI_MONTHS } from "../utils/shamsi";

interface DatePickerModalProps {
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;
  tempYear: number;
  setTempYear: (year: number) => void;
  tempMonth: number;
  setTempMonth: (month: number) => void;
  tempDay: number;
  setTempDay: (day: number) => void;
  manualDateInput: string;
  setManualDateInput: (input: string) => void;
  todayShamsi: { year: number; month: number; day: number };
  setShamsiYear: (year: number) => void;
  setShamsiMonth: (month: number) => void;
  setShamsiDay: (day: number) => void;
  showNotification: (type: "success" | "error" | "info", message: string) => void;
}

export function DatePickerModal({
  showDatePicker,
  setShowDatePicker,
  tempYear,
  setTempYear,
  tempMonth,
  setTempMonth,
  tempDay,
  setTempDay,
  manualDateInput,
  setManualDateInput,
  todayShamsi,
  setShamsiYear,
  setShamsiMonth,
  setShamsiDay,
  showNotification
}: DatePickerModalProps) {
  if (!showDatePicker) return null;

  return (
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
  );
}
