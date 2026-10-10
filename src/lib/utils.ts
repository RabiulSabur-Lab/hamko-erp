import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Robust Bengali digit converter helper function (BUG-016).
 * Converts Western Arabic numerals (0-9) to Bengali digits (০-৯).
 */
export const toBnDigit = (num: number | string | null | undefined): string => {
  if (num === null || num === undefined) return '';
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (digit) => bnDigits[parseInt(digit, 10)]);
};

/**
 * Returns the active language code from localStorage or document element.
 */
export function getActiveLanguage(): string {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("lang");
      if (saved) return saved;
    } catch {
      // ignore
    }
    if (typeof document !== "undefined" && document.documentElement?.lang) {
      return document.documentElement.lang;
    }
  }
  return "en";
}

/**
 * Determines if the application is currently running in Bengali mode.
 */
export function isBengaliMode(langOverride?: string | null): boolean {
  if (langOverride) {
    return langOverride === "bn";
  }
  return getActiveLanguage() === "bn";
}

export function formatCurrency(amount: number | undefined | null, langOverride?: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) {
    console.warn("[formatCurrency] received non-finite value:", amount);
    return isBengaliMode(langOverride) ? toBnDigit("0") : "0";
  }
  const formatted = new Intl.NumberFormat("en-BD", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);

  return isBengaliMode(langOverride) ? toBnDigit(formatted) : formatted;
}

export function formatBDT(amount: number | undefined | null, langOverride?: string): string {
  return "৳ " + formatCurrency(amount, langOverride);
}

export function safeNumber(amount: number | undefined | null): number {
  const n = Number(amount);
  return Number.isFinite(n) ? n : 0;
}

export function formatNumber(val: number | string | null | undefined, langOverride?: string): string {
  if (val === null || val === undefined) return "";
  const n = Number(val);
  const formatted = Number.isFinite(n) ? n.toLocaleString("en-BD") : String(val);
  return isBengaliMode(langOverride) ? toBnDigit(formatted) : formatted;
}

export function formatDate(date: string | Date | null, langOverride?: string): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  if (isBengaliMode(langOverride)) {
    try {
      const bnDate = d.toLocaleDateString("bn-BD", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      return toBnDigit(bnDate);
    } catch {
      const enDate = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      return toBnDigit(enDate);
    }
  }

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date | null, langOverride?: string): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  if (isBengaliMode(langOverride)) {
    try {
      const bnDateTime = d.toLocaleString("bn-BD", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return toBnDigit(bnDateTime);
    } catch {
      const enDateTime = d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return toBnDigit(enDateTime);
    }
  }

  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(date: string | Date, langOverride?: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  const isBn = isBengaliMode(langOverride);

  if (seconds < 60) return isBn ? "এইমাত্র" : "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return isBn ? `${toBnDigit(minutes)} মিনিট আগে` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return isBn ? `${toBnDigit(hours)} ঘণ্টা আগে` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return isBn ? `${toBnDigit(days)} দিন আগে` : `${days}d ago`;
  return formatDate(d, langOverride);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Sanitizes input text to prevent CSV / Formula Injection attacks (strings starting with =, +, -, @).
 */
export function sanitizeFormulaInput(val: string | null | undefined): string {
  if (val === null || val === undefined) return "";
  let str = String(val).trim();
  while (str.length > 0 && /^[=+\-@\t\r]/.test(str)) {
    str = str.replace(/^[=+\-@\t\r]+/, "").trim();
  }
  return str;
}

/**
 * Strips price amounts inside parentheses (e.g. `(৳ 5,350)`) and suffix words like "Rate" or "Price".
 * E.g.: "DP Price (৳ 5,350)" -> "DP", "D10 Rate (৳ 5,296.5)" -> "D10", "Custom Price" -> "Custom".
 */
export const formatTierLabel = (tierName?: string | null): string => {
  if (!tierName || typeof tierName !== "string") return "";
  const cleaned = tierName
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s*(Rate|Price)\s*/gi, "")
    .trim();
  return cleaned || tierName.trim();
};


