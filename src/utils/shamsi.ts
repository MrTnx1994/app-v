/**
 * Precise Gregorian to Solar Hijri (Shamsi) Date Converter
 */

export function gregorianToShamsi(g_y: number, g_m: number, g_d: number) {
  const g_days_in_month = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const j_days_in_month = [0, 31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

  const gy = g_y - 1600;
  const gm = g_m - 1;
  const gd = g_d - 1;

  let g_day_no = 365 * gy + Math.floor((gy + 3) / 4) - Math.floor((gy + 99) / 100) + Math.floor((gy + 399) / 400);

  for (let i = 0; i < gm; ++i) {
    g_day_no += g_days_in_month[i + 1];
  }
  if (gm > 1 && ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0)) {
    g_day_no++;
  }
  g_day_no += gd;

  let j_day_no = g_day_no - 79;

  const j_np = Math.floor(j_day_no / 12053);
  let j_day_no_rem = j_day_no % 12053;

  let jy = 979 + 33 * j_np + 4 * Math.floor(j_day_no_rem / 1461);
  j_day_no_rem %= 1461;

  if (j_day_no_rem >= 366) {
    jy += Math.floor((j_day_no_rem - 1) / 365);
    j_day_no_rem = (j_day_no_rem - 1) % 365;
  }

  let jm = 0;
  for (let i = 0; i < 12; ++i) {
    if (j_day_no_rem < j_days_in_month[i + 1]) {
      jm = i + 1;
      break;
    }
    j_day_no_rem -= j_days_in_month[i + 1];
  }
  const jd = j_day_no_rem + 1;

  const monthNames = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
  ];

  return {
    year: jy,
    month: jm,
    day: jd,
    monthName: monthNames[jm - 1],
    formatted: `${jy}/${jm.toString().padStart(2, '0')}/${jd.toString().padStart(2, '0')}`
  };
}

export function getTodayShamsi() {
  const now = new Date();
  return gregorianToShamsi(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function getTomorrowShamsi() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return gregorianToShamsi(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate());
}

export const SHAMSI_MONTHS = [
  { id: 1, name: "فروردین", days: 31 },
  { id: 2, name: "اردیبهشت", days: 31 },
  { id: 3, name: "خرداد", days: 31 },
  { id: 4, name: "تیر", days: 31 },
  { id: 5, name: "مرداد", days: 31 },
  { id: 6, name: "شهریور", days: 31 },
  { id: 7, name: "مهر", days: 30 },
  { id: 8, name: "آبان", days: 30 },
  { id: 9, name: "آذر", days: 30 },
  { id: 10, name: "دی", days: 30 },
  { id: 11, name: "بهمن", days: 30 },
  { id: 12, name: "اسفند", days: 29 }
];

export function shamsiToGregorian(jy: number, jm: number, jd: number) {
  let gy = (jy <= 979) ? 621 : 1600;
  let jyTemp = jy - ((jy <= 979) ? 0 : 979);
  let days = (365 * jyTemp) + (Math.floor(jyTemp / 33) * 8) + Math.floor(((jyTemp % 33) + 3) / 4) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  let sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    let v = sal_a[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return { gy, gm, gd };
}

export function getShamsiWeekday(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = shamsiToGregorian(jy, jm, jd);
  const date = new Date(gy, gm - 1, gd);
  const weekdays = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"];
  return weekdays[date.getDay()];
}

export function getTomorrowShamsiDate(y: number, m: number, d: number): string {
  const isLeap = (y % 33 === 1 || y % 33 === 5 || y % 33 === 9 || y % 33 === 13 || y % 33 === 17 || y % 33 === 22 || y % 33 === 26 || y % 33 === 30);
  const maxDays = m === 12 ? (isLeap ? 30 : 29) : SHAMSI_MONTHS.find(mo => mo.id === m)?.days || 30;
  
  let ny = y;
  let nm = m;
  let nd = d + 1;

  if (nd > maxDays) {
    nd = 1;
    nm = m + 1;
    if (nm > 12) {
      nm = 1;
      ny = y + 1;
    }
  }
  return `${ny}/${nm.toString().padStart(2, "0")}/${nd.toString().padStart(2, "0")}`;
}