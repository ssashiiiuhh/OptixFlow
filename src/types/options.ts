// ============================================
// OPTIXFLOW — Core Type Definitions
// ============================================

/** Option type (call or put) */
export type OptionType = "call" | "put";

/** Available strategy types */
export type StrategyType = "long_call" | "long_put" | "bull_call_spread";

/** A single (x, y) data point for the payoff chart */
export interface PayoffPoint {
  /** Stock price at expiration */
  price: number;
  /** Profit/Loss value */
  pnl: number;
  /** Positive P&L (for green fill) */
  profit: number | null;
  /** Negative P&L (for red fill) */
  loss: number | null;
}

/** Parameters for a single-leg option strategy */
export interface SingleLegParams {
  optionType: OptionType;
  strikePrice: number;
  premium: number;
  quantity: number;
  currentStockPrice: number;
}

/** Parameters for the Bull Call Spread */
export interface BullCallSpreadParams {
  lowerStrike: number;
  upperStrike: number;
  netPremium: number;
  quantity: number;
  currentStockPrice: number;
}

/** Union of all strategy parameter shapes */
export type StrategyParams =
  | ({ strategyType: "long_call" | "long_put" } & SingleLegParams)
  | ({ strategyType: "bull_call_spread" } & BullCallSpreadParams);

/** Computed strategy metrics */
export interface StrategyMetrics {
  breakevenPrice: number | null;
  maxProfit: number | null;
  maxLoss: number | null;
  /** Second breakeven for spread strategies */
  breakevenPrice2?: number | null;
}

/** Strategy metadata for display */
export interface StrategyMeta {
  id: StrategyType;
  label: string;
  description: string;
  color: string;
}
