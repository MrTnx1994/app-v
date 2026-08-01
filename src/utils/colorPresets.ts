import { Driver, Product } from "../types";

export const COLOR_PRESETS = [
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

export function getDriverColorClass(driverName: string, drivers: Driver[]): string {
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
}

export function getCustomerPillClasses(driverName: string, drivers: Driver[]): string {
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
}

export function getDriverHeaderClasses(driverName: string, drivers: Driver[]): string {
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
}

export function getDriverAccentClasses(driverName: string, drivers: Driver[]): { gradient: string; solid: string; ring: string } {
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
}

export function getDriverCellColorClass(driverName: string, round: number, qty: number, isActive: boolean, drivers: Driver[]): string {
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
}

export function getCategoryStyle(category: string, products: Product[], isFlavor: boolean = false): string {
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

  return `${style.bg} ${style.text} ${style.border}`;
}
