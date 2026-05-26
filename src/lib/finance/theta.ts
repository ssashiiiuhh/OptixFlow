export {
  TOTAL_DTE,
  STRIKE,
  PRICE_MIN,
  PRICE_MAX,
  PRICE_STEP,
  IV_MULTIPLIERS,
  IV_INTENSITIES,
  IV_REGIME_META,
  timeValueFactor,
  computeStrategyPrice,
  computeStrategyGreeks,
  computeThetaPayoff,
  computeThetaMetrics,
  computeVolatilityBand,
  buildMultiChartSnapshot,
  buildComparisonChartSnapshot,
  buildDynamicChartSnapshot,
  computeDynamicMetrics
} from "../quant/strategies/payoff";

export type {
  IVScenario,
  MultiChartPoint,
  ComparisonChartPoint,
  DynamicChartPoint
} from "../quant/strategies/payoff";

export {
  normPDF,
  normCDF
} from "../quant/probability/distributions";

export {
  bsmPrice,
  bsmGreeks
} from "../quant/greeks/bsm";

export {
  getStrategyLegs
} from "../quant/strategies/legs";

export type {
  OptionLeg
} from "../quant/strategies/types";
