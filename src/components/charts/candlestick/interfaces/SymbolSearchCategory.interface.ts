/** One pill in the symbol-search modal's category filter row — "all" and "favorites" are
 *  never a result's own `category` (they're just filter views over the same results), every
 *  other value can be. */
export type SymbolSearchCategory =
  | "all"
  | "stocks"
  | "futures"
  | "forex"
  | "crypto"
  | "indices"
  | "bonds"
  | "economy"
  | "options"
  | "favorites";
