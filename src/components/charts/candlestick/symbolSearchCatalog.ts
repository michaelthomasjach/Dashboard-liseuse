import type { SymbolSearchCategory } from "./interfaces/SymbolSearchCategory.interface";

export const SYMBOL_SEARCH_CATEGORIES: { value: SymbolSearchCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "stocks", label: "Stocks" },
  { value: "futures", label: "Futures" },
  { value: "forex", label: "Forex" },
  { value: "crypto", label: "Crypto" },
  { value: "indices", label: "Indices" },
  { value: "bonds", label: "Bonds" },
  { value: "economy", label: "Economy" },
  { value: "options", label: "Options" },
  { value: "favorites", label: "Favoris" },
];

// Distinct from EVENT_COLORS/INDICATOR_COLORS so a symbol's own logo placeholder never
// accidentally matches an indicator line or event badge's color at a glance.
export const SYMBOL_LOGO_COLORS = ["#5c7cd1", "#3ea377", "#c9a13a", "#c15d7a", "#8a6fd6", "#4f9fc9"];

export function defaultSymbolLogoColor(index: number): string {
  return SYMBOL_LOGO_COLORS[((index % SYMBOL_LOGO_COLORS.length) + SYMBOL_LOGO_COLORS.length) % SYMBOL_LOGO_COLORS.length];
}
