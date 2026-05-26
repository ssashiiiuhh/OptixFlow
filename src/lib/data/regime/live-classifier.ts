import { VolatilityRegime, LiveVolatilitySurface, LiveTickerQuote } from "../types";
import { classifyRegime } from "../../quant/regime/classifier";

/**
 * Dynamically classifies the market volatility regime using live surface metrics and quote details.
 */
export function classifyLiveRegime(
  surface: LiveVolatilitySurface,
  quote: LiveTickerQuote,
  hv30: number = 0.15
): VolatilityRegime {
  // Convert decimal IVs to percentages (e.g., 0.30 -> 30.0)
  const iv30Pct = surface.baseIv * 100;
  const hv30Pct = hv30 * 100;

  // Determine if term structure is in backwardation (shorter term IV > longer term IV)
  let isBackwardation = false;
  if (surface.termStructure.length > 1) {
    const front = surface.termStructure[0];
    const back = surface.termStructure[surface.termStructure.length - 1];
    isBackwardation = front.iv > back.iv;
  }

  // Estimate a VIX proxy
  let vix = iv30Pct;
  if (surface.ticker !== "SPY") {
    // Individual stock volatilities are higher; scale down to proxy the market VIX index
    vix = Math.max(10, Math.round(iv30Pct * 0.65));
  }

  return classifyRegime({
    vix: Math.round(vix * 10) / 10,
    ivRank: surface.ivRank,
    iv30: Math.round(iv30Pct * 10) / 10,
    hv30: Math.round(hv30Pct * 10) / 10,
    isBackwardation,
  });
}
