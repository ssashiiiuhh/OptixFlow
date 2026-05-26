import { VolatilityRegime } from "./types";

/**
 * Derives a volatility regime from quantitative market state parameters.
 */
export function classifyRegime(params: {
  vix: number;
  ivRank: number;
  iv30: number;
  hv30: number;
  isBackwardation: boolean;
}): VolatilityRegime {
  const ivHvSpread = params.iv30 - params.hv30;

  // Extreme panic or market stress
  if (params.vix >= 35 || (params.isBackwardation && params.vix >= 25)) {
    return "LIQUIDITY_SHOCK";
  }

  // Panic expansion
  if (params.vix >= 22 && ivHvSpread > 5) {
    return "PANIC_EXPANSION";
  }

  // Catalyst / Earnings volatility
  if (params.ivRank >= 70) {
    return "EARNINGS_INSTABILITY";
  }

  // Deep complacency
  if (params.vix <= 13 && params.ivRank <= 25) {
    return "LOW_VOL_COMPLACENCY";
  }

  // IV Crush / post event
  if (ivHvSpread < -2) {
    return "POST_EVENT_CRUSH";
  }

  // Standard drift / contango
  return "VOL_COMPRESSION";
}
