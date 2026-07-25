export interface ThemeStyles {
  id: string;
  name: string;
  bg: string;
  card: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  accentBg: string;
  accentBgHover: string;
  accentText: string;
  accentBadge: string;
  buttonClass: string;
}

export const THEMES: { [key: string]: ThemeStyles } = {
  cosmic: {
    id: "cosmic",
    name: "Cosmo Profundo",
    bg: "bg-[#0b1329] text-gray-100",
    card: "bg-[#0f1b35] border-[#1e2d4d]",
    border: "border-[#1e2d4d]",
    textPrimary: "text-white",
    textSecondary: "text-gray-400",
    accentBg: "bg-blue-600",
    accentBgHover: "hover:bg-blue-700",
    accentText: "text-blue-400",
    accentBadge: "bg-blue-500/10 text-blue-400 border border-blue-900/40",
    buttonClass: "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20"
  },
  slate: {
    id: "slate",
    name: "Grafite Clássico",
    bg: "bg-[#0f172a] text-gray-100",
    card: "bg-[#1e293b] border-[#334155]",
    border: "border-[#334155]",
    textPrimary: "text-slate-100",
    textSecondary: "text-slate-400",
    accentBg: "bg-slate-700",
    accentBgHover: "hover:bg-slate-600",
    accentText: "text-slate-300",
    accentBadge: "bg-slate-500/10 text-slate-300 border border-slate-700",
    buttonClass: "bg-slate-700 text-white hover:bg-slate-600 shadow-slate-500/20"
  },
  emerald: {
    id: "emerald",
    name: "Floresta Esmeralda",
    bg: "bg-[#022c22] text-gray-100",
    card: "bg-[#064e3b] border-[#115e59]",
    border: "border-[#115e59]",
    textPrimary: "text-emerald-50",
    textSecondary: "text-emerald-400",
    accentBg: "bg-emerald-600",
    accentBgHover: "hover:bg-emerald-700",
    accentText: "text-emerald-400",
    accentBadge: "bg-emerald-500/10 text-emerald-400 border border-emerald-950/40",
    buttonClass: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20"
  },
  sunset: {
    id: "sunset",
    name: "Crepúsculo Quente",
    bg: "bg-[#1c0f0d] text-gray-100",
    card: "bg-[#2d1815] border-[#5c2a1c]",
    border: "border-[#5c2a1c]",
    textPrimary: "text-orange-50",
    textSecondary: "text-orange-400",
    accentBg: "bg-orange-600",
    accentBgHover: "hover:bg-orange-700",
    accentText: "text-orange-400",
    accentBadge: "bg-orange-500/10 text-orange-400 border border-orange-950/40",
    buttonClass: "bg-orange-600 text-white hover:bg-orange-700 shadow-orange-500/20"
  },
  light: {
    id: "light",
    name: "Minimalista Claro",
    bg: "bg-[#f8fafc] text-gray-800",
    card: "bg-white border-slate-200 shadow-sm",
    border: "border-slate-200",
    textPrimary: "text-slate-900",
    textSecondary: "text-slate-500",
    accentBg: "bg-indigo-600",
    accentBgHover: "hover:bg-indigo-700",
    accentText: "text-indigo-600",
    accentBadge: "bg-indigo-50 text-indigo-700 border border-indigo-100",
    buttonClass: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/10"
  }
};
