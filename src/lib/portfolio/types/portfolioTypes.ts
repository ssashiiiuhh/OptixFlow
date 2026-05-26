import { OptionType, OptionSide } from "../../quant/greeks/types";

export type PositionType = "call" | "put" | "stock" | "cash";

export interface PositionLeg {
  id: string;
  ticker: string;
  type: PositionType;
  side: OptionSide;
  strike: number;
  quantity: number;      // Number of shares or number of options contracts
  entryPrice: number;    // Stock price or net premium paid/received per option
  expiryDte: number;     // Days to expiry (0 for stock/cash)
  initialSpot: number;   // Underlier spot price at entry
  initialIv: number;     // IV at entry (decimal)
  sector?: string;
  color?: string;
}

export interface PortfolioGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface StrategyHoldingGroup {
  id: string;
  ticker: string;
  strategyName: string;
  legs: PositionLeg[];
  quantity: number;
  costBasis: number;      // Total net premium paid/received (debit/credit)
  currentValue: number;   // Current market value of all legs
  pnl: number;            // Dollar P&L
  pnlPct: number;         // Percent P&L
  status: "profit" | "loss" | "flat";
  bias: "bullish" | "bearish" | "neutral" | "volatile";
  greeks: PortfolioGreeks;
  strikes: string;
  daysToExpiry: number;
  sector: string;
  riskScore: number;
  color: string;
}

export interface ExposureSegment {
  id: string;
  label: string;
  value: number; // Dollar-weighted exposure
  pct: number;   // 0–100
  color: string;
  glowColor: string;
  description: string;
  strategies: string[];
}

export interface StressScenarioResult {
  id: string;
  label: string;
  description: string;
  pnlImpact: number;
  ivChange: number;
  spotChange: number;
  holdingImpacts: Record<string, number>; // strategyGroupId -> P&L change
  shiftedGreeks: PortfolioGreeks;
  fragilityAlerts: string[];
}

export interface VaRMetrics {
  var95: number;   // 95% Confidence Value at Risk
  var99: number;   // 99% Confidence Value at Risk
  cvar95: number;  // 95% Conditional VaR (Expected shortfall)
  cvar99: number;  // 99% Conditional VaR (Expected shortfall)
}

export interface RiskSurfacePoint {
  spotOffset: number; // percentage change (e.g. -10 to 10)
  ivOffset: number;   // percentage change (e.g. -10 to 15)
  pnl: number;
  delta: number;
  gamma: number;
  vega: number;
}

export interface PortfolioState {
  holdings: StrategyHoldingGroup[];
  netGreeks: PortfolioGreeks;
  totalCost: number;
  netPnl: number;
  pnlPct: number;
  totalTheta: number; // daily decay rate
  winRate: number;
  avgIv: number;
  maxRisk: number;
}
