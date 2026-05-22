// ============================================
// OPTIXFLOW — Portfolio Mock Data Engine
// All values are simulated for demonstration
// ============================================

// ── Strategy Holdings ──────────────────────────────────────

export type StrategyType =
  | "Long Call"
  | "Long Put"
  | "Bull Call Spread"
  | "Bear Put Spread"
  | "Iron Condor"
  | "Covered Call"
  | "Protective Put"
  | "Straddle";

export type HoldingStatus = "profit" | "loss" | "flat";
export type DirectionBias = "bullish" | "bearish" | "neutral" | "volatile";

export interface StrategyHolding {
  id: string;
  ticker: string;
  strategy: StrategyType;
  expiry: string;
  daysToExpiry: number;
  quantity: number;
  costBasis: number;    // per contract net debit/credit
  currentValue: number;
  pnl: number;
  pnlPct: number;
  status: HoldingStatus;
  bias: DirectionBias;
  // Greeks (per-position)
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv: number;
  // For display
  strikes: string;      // e.g. "165/175"
  sector: string;
  riskScore: number;    // 0–100
  color: string;        // accent color for this holding
}

export const HOLDINGS: StrategyHolding[] = [
  {
    id: "h1",
    ticker: "AAPL",
    strategy: "Bull Call Spread",
    expiry: "Jun 20 '25",
    daysToExpiry: 29,
    quantity: 5,
    costBasis: 320,
    currentValue: 481,
    pnl: 805,
    pnlPct: 50.3,
    status: "profit",
    bias: "bullish",
    delta: 0.31,
    gamma: 0.018,
    theta: -12.4,
    vega: 18.2,
    iv: 27.8,
    strikes: "185/200",
    sector: "Technology",
    riskScore: 38,
    color: "#00e5a0",
  },
  {
    id: "h2",
    ticker: "NVDA",
    strategy: "Straddle",
    expiry: "Jun 20 '25",
    daysToExpiry: 29,
    quantity: 2,
    costBasis: 4800,
    currentValue: 3940,
    pnl: -1720,
    pnlPct: -17.9,
    status: "loss",
    bias: "volatile",
    delta: 0.04,
    gamma: 0.009,
    theta: -48.2,
    vega: 92.4,
    iv: 54.3,
    strikes: "870 ATM",
    sector: "Technology",
    riskScore: 74,
    color: "#a855f7",
  },
  {
    id: "h3",
    ticker: "SPY",
    strategy: "Bear Put Spread",
    expiry: "Jul 18 '25",
    daysToExpiry: 57,
    quantity: 10,
    costBasis: 185,
    currentValue: 132,
    pnl: -530,
    pnlPct: -28.6,
    status: "loss",
    bias: "bearish",
    delta: -0.22,
    gamma: 0.011,
    theta: -6.8,
    vega: 22.1,
    iv: 14.2,
    strikes: "515/505",
    sector: "Index",
    riskScore: 25,
    color: "#ff4d6a",
  },
  {
    id: "h4",
    ticker: "MSFT",
    strategy: "Covered Call",
    expiry: "Jun 20 '25",
    daysToExpiry: 29,
    quantity: 3,
    costBasis: -285,
    currentValue: -180,
    pnl: 315,
    pnlPct: 36.8,
    status: "profit",
    bias: "neutral",
    delta: 0.72,
    gamma: 0.006,
    theta: -8.4,
    vega: 14.3,
    iv: 22.6,
    strikes: "440 Call",
    sector: "Technology",
    riskScore: 18,
    color: "#00d4ff",
  },
  {
    id: "h5",
    ticker: "TSLA",
    strategy: "Iron Condor",
    expiry: "Jul 18 '25",
    daysToExpiry: 57,
    quantity: 4,
    costBasis: -620,
    currentValue: -290,
    pnl: 1320,
    pnlPct: 53.2,
    status: "profit",
    bias: "neutral",
    delta: -0.06,
    gamma: 0.004,
    theta: -18.6,
    vega: 28.4,
    iv: 48.7,
    strikes: "160/170/220/230",
    sector: "EV",
    riskScore: 44,
    color: "#f5a623",
  },
  {
    id: "h6",
    ticker: "GLD",
    strategy: "Long Call",
    expiry: "Aug 15 '25",
    daysToExpiry: 85,
    quantity: 8,
    costBasis: 480,
    currentValue: 610,
    pnl: 1040,
    pnlPct: 27.1,
    status: "profit",
    bias: "bullish",
    delta: 0.44,
    gamma: 0.014,
    theta: -9.2,
    vega: 31.8,
    iv: 18.4,
    strikes: "240 Call",
    sector: "Commodities",
    riskScore: 30,
    color: "#00e5a0",
  },
  {
    id: "h7",
    ticker: "QQQ",
    strategy: "Protective Put",
    expiry: "Sep 19 '25",
    daysToExpiry: 120,
    quantity: 5,
    costBasis: 890,
    currentValue: 640,
    pnl: -1250,
    pnlPct: -28.1,
    status: "loss",
    bias: "bearish",
    delta: -0.18,
    gamma: 0.008,
    theta: -11.4,
    vega: 44.6,
    iv: 19.8,
    strikes: "460 Put",
    sector: "Index",
    riskScore: 22,
    color: "#ff4d6a",
  },
];

// ── Aggregate Portfolio Greeks ─────────────────────────────

export interface PortfolioGreeks {
  totalDelta: number;
  totalGamma: number;
  totalTheta: number;
  totalVega: number;
  netPnl: number;
  totalCost: number;
  winRate: number;       // 0–1
  avgIV: number;
  maxRisk: number;
}

export const PORTFOLIO_GREEKS: PortfolioGreeks = {
  totalDelta: 1.06,
  totalGamma: 0.070,
  totalTheta: -115.0,
  totalVega: 251.8,
  netPnl: 1980,
  totalCost: 28400,
  winRate: 0.571,
  avgIV: 29.4,
  maxRisk: 8200,
};

// Normalised 0–1 for radar / gauge
export const GREEKS_RADAR = [
  { axis: "Delta", value: 0.53, raw: 1.06, color: "#00d4ff" },
  { axis: "Gamma", value: 0.70, raw: 0.07, color: "#a855f7" },
  { axis: "Theta", value: 0.58, raw: -115.0, color: "#ff4d6a" },
  { axis: "Vega",  value: 0.84, raw: 251.8, color: "#00e5a0" },
  { axis: "Risk",  value: 0.41, raw: 41, color: "#f5a623" },
];

// ── Exposure Map ───────────────────────────────────────────

export interface ExposureSegment {
  id: string;
  label: string;
  value: number;        // Dollar-weighted exposure
  pct: number;          // 0–100
  color: string;
  glowColor: string;
  description: string;
  strategies: string[];
}

export const EXPOSURE_SEGMENTS: ExposureSegment[] = [
  {
    id: "bullish",
    label: "Bullish",
    value: 14_200,
    pct: 47,
    color: "#00e5a0",
    glowColor: "rgba(0,229,160,0.3)",
    description: "Long delta positions with directional upside",
    strategies: ["AAPL Bull Spread", "GLD Long Call", "MSFT Covered Call"],
  },
  {
    id: "bearish",
    label: "Bearish",
    value: 5_460,
    pct: 18,
    color: "#ff4d6a",
    glowColor: "rgba(255,77,106,0.3)",
    description: "Negative delta hedging and downside protection",
    strategies: ["SPY Bear Spread", "QQQ Protective Put"],
  },
  {
    id: "neutral",
    label: "Neutral",
    value: 9_600,
    pct: 32,
    color: "#00d4ff",
    glowColor: "rgba(0,212,255,0.3)",
    description: "Delta-neutral range-bound income strategies",
    strategies: ["TSLA Iron Condor", "MSFT Covered Call"],
  },
  {
    id: "volatile",
    label: "Vol Long",
    value: 960,
    pct: 3,
    color: "#a855f7",
    glowColor: "rgba(168,85,247,0.3)",
    description: "Long vega positions benefiting from volatility expansion",
    strategies: ["NVDA Straddle"],
  },
];

// ── P/L Timeline ───────────────────────────────────────────

export interface PLPoint {
  date: string;
  pnl: number;
  cumulative: number;
  event?: string;
  eventType?: "earnings" | "crash" | "spike" | "recovery";
}

export const PL_TIMELINE: PLPoint[] = [
  { date: "Apr 1",  pnl: 0,    cumulative: 0 },
  { date: "Apr 7",  pnl: 420,  cumulative: 420 },
  { date: "Apr 14", pnl: 380,  cumulative: 800 },
  { date: "Apr 21", pnl: -640, cumulative: 160,  event: "Fed shock",  eventType: "crash" },
  { date: "Apr 28", pnl: 290,  cumulative: 450 },
  { date: "May 5",  pnl: 820,  cumulative: 1270, event: "AAPL earnings", eventType: "earnings" },
  { date: "May 12", pnl: -310, cumulative: 960 },
  { date: "May 19", pnl: 540,  cumulative: 1500 },
  { date: "May 26", pnl: 480,  cumulative: 1980, event: "Vol spike", eventType: "spike" },
];

// ── Risk Scenarios ─────────────────────────────────────────

export interface Scenario {
  id: string;
  label: string;
  description: string;
  color: string;
  icon: string;
  assumptions: string;
  pnlImpact: number;   // Dollar impact
  ivChange: number;    // IV change %
  spotChange: number;  // Spot price change %
  holdingImpacts: Record<string, number>; // holdingId → P&L change
}

export const SCENARIOS: Scenario[] = [
  {
    id: "crash",
    label: "Market Crash",
    description: "S&P −10% drawdown in 5 days",
    color: "#ff4d6a",
    icon: "💥",
    assumptions: "Spot −10%, IV +35%, term structure in contango",
    pnlImpact: -4_820,
    ivChange: 35,
    spotChange: -10,
    holdingImpacts: { h1: -1280, h2: 3100, h3: 840, h4: -2200, h5: -1480, h6: -820, h7: 1020 },
  },
  {
    id: "vol_spike",
    label: "Volatility Spike",
    description: "VIX jumps to 35 without large price move",
    color: "#a855f7",
    icon: "⚡",
    assumptions: "Spot flat, IV +50%, skew steepens",
    pnlImpact: 2_140,
    ivChange: 50,
    spotChange: 0,
    holdingImpacts: { h1: 420, h2: 4200, h3: 480, h4: -380, h5: -1840, h6: 640, h7: 620 },
  },
  {
    id: "earnings",
    label: "Earnings Event",
    description: "Portfolio-wide earnings catalyst +5% rally",
    color: "#f5a623",
    icon: "📊",
    assumptions: "Spot +5%, IV crush −30%, vol compression",
    pnlImpact: 3_640,
    ivChange: -30,
    spotChange: 5,
    holdingImpacts: { h1: 1840, h2: -2800, h3: -640, h4: 920, h5: 1200, h6: 1180, h7: -1060 },
  },
  {
    id: "sideways",
    label: "Theta Decay",
    description: "15 calendar days pass, market flat",
    color: "#00d4ff",
    icon: "→",
    assumptions: "Spot flat, IV unchanged, 15d time decay",
    pnlImpact: -1_725,
    ivChange: 0,
    spotChange: 0,
    holdingImpacts: { h1: -186, h2: -723, h3: -102, h4: -126, h5: -279, h6: -138, h7: -171 },
  },
];
