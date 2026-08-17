/** ADX's own value shape — the trend-strength line itself (`adx`, conventionally read against a
 *  fixed 0-100 scale, same as RSI/CHOP) plus the two directional lines Wilder's own DMI derives it
 *  from (`plusDI`/`minusDI`) — each independently useful for reading which direction is currently
 *  dominant, not just how strong the trend is. */
export interface IndicatorADXPoint {
  adx: number;
  plusDI: number;
  minusDI: number;
}
