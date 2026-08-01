import { Driver } from "../types";

export const isSameDriver = (name1: string | null | undefined, name2: string | null | undefined): boolean => {
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

export const getDriverHexColor = (driverName: string, drivers: Driver[] = []): string => {
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

export const getDriverCellHexColor = (driverName: string, qty: number, isActive: boolean, drivers: Driver[] = []): string => {
  if (!isActive) return "#F1F5F9";
  if (qty === 0) {
    if (!driverName) return "#FFFFFF";
    const baseColor = getDriverHexColor(driverName, drivers);
    return baseColor + "22";
  }
  return getDriverHexColor(driverName, drivers);
};

export const getDriverColorClass = (driverName: string, round?: number, drivers: Driver[] = []): string => {
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

export const getCustomerPillClasses = (driverName: string, drivers: Driver[] = []): string => {
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

export const getDriverHeaderClasses = (driverName: string, drivers: Driver[] = []): string => {
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

export const getDriverAccentClasses = (driverName: string, drivers: Driver[] = []): { gradient: string; solid: string; ring: string } => {
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

export const getDriverCellColorClass = (
  driverName: string, 
  round: number, 
  qty: number, 
  isActive: boolean, 
  drivers: Driver[] = []
): string => {
  if (!isActive) return "bg-slate-100/85 text-slate-400";
  if (!driverName) {
    return qty > 0 ? "bg-amber-100/80 text-amber-950 font-bold border-amber-300" : "bg-white text-slate-400";
  }
  const colorClass = getDriverColorClass(driverName, round, drivers);
  if (qty === 0) {
    return colorClass.replace("bg-", "bg-opacity-20 bg-").replace("text-slate-950", "text-slate-400");
  }
  return colorClass;
};
