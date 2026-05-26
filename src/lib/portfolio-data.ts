import {
  PositionLeg,
  groupPositionsIntoStrategies,
  rollupExposureByBias,
  computeGreeksNetting,
  computeDirectionalExposure,
  computeVolatilityExposure,
  computeConvexityMapping,
  runDeterministicScenarios,
  generatePortfolioRiskSurface,
} from "./portfolio";

// ── Types & Exports expected by frontend components ──────────────────────────

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
  costBasis: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
  status: HoldingStatus;
  bias: DirectionBias;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv: number;
  strikes: string;
  sector: string;
  riskScore: number;
  color: string;
}

export interface PortfolioGreeks {
  totalDelta: number;
  totalGamma: number;
  totalTheta: number;
  totalVega: number;
  netPnl: number;
  totalCost: number;
  winRate: number;
  avgIV: number;
  maxRisk: number;
}

export interface ExposureSegment {
  id: string;
  label: string;
  value: number;
  pct: number;
  color: string;
  glowColor: string;
  description: string;
  strategies: string[];
}

export interface PLPoint {
  date: string;
  pnl: number;
  cumulative: number;
  event?: string;
  eventType?: "earnings" | "crash" | "spike" | "recovery";
}

export interface Scenario {
  id: string;
  label: string;
  description: string;
  color: string;
  icon: string;
  assumptions: string;
  pnlImpact: number;
  ivChange: number;
  spotChange: number;
  holdingImpacts: Record<string, number>;
}

// ── Underlying Position Legs ──────────────────────────────────────────────────

export const RAW_LEGS: PositionLeg[] = [
  // 1. AAPL Bull Call Spread
  {
    id: "leg1a",
    ticker: "AAPL",
    type: "call",
    side: "long",
    strike: 185,
    quantity: 5,
    entryPrice: 5.8,
    expiryDte: 29,
    initialSpot: 189.64,
    initialIv: 0.278,
  },
  {
    id: "leg1b",
    ticker: "AAPL",
    type: "call",
    side: "short",
    strike: 200,
    quantity: 5,
    entryPrice: 2.6,
    expiryDte: 29,
    initialSpot: 189.64,
    initialIv: 0.278,
  },
  // 2. NVDA Straddle
  {
    id: "leg2a",
    ticker: "NVDA",
    type: "call",
    side: "long",
    strike: 870,
    quantity: 2,
    entryPrice: 24.5,
    expiryDte: 29,
    initialSpot: 875.3,
    initialIv: 0.543,
  },
  {
    id: "leg2b",
    ticker: "NVDA",
    type: "put",
    side: "long",
    strike: 870,
    quantity: 2,
    entryPrice: 23.5,
    expiryDte: 29,
    initialSpot: 875.3,
    initialIv: 0.543,
  },
  // 3. SPY Bear Put Spread
  {
    id: "leg3a",
    ticker: "SPY",
    type: "put",
    side: "long",
    strike: 515,
    quantity: 10,
    entryPrice: 6.25,
    expiryDte: 57,
    initialSpot: 528.42,
    initialIv: 0.142,
  },
  {
    id: "leg3b",
    ticker: "SPY",
    type: "put",
    side: "short",
    strike: 505,
    quantity: 10,
    entryPrice: 4.4,
    expiryDte: 57,
    initialSpot: 528.42,
    initialIv: 0.142,
  },
  // 4. MSFT Covered Call
  {
    id: "leg4a",
    ticker: "MSFT",
    type: "stock",
    side: "long",
    strike: 0,
    quantity: 300,
    entryPrice: 415.0,
    expiryDte: 0,
    initialSpot: 421.9,
    initialIv: 0.226,
  },
  {
    id: "leg4b",
    ticker: "MSFT",
    type: "call",
    side: "short",
    strike: 440,
    quantity: 3,
    entryPrice: 2.85,
    expiryDte: 29,
    initialSpot: 421.9,
    initialIv: 0.226,
  },
  // 5. TSLA Iron Condor
  {
    id: "leg5a",
    ticker: "TSLA",
    type: "put",
    side: "long",
    strike: 160,
    quantity: 4,
    entryPrice: 1.8,
    expiryDte: 57,
    initialSpot: 172.4,
    initialIv: 0.487,
  },
  {
    id: "leg5b",
    ticker: "TSLA",
    type: "put",
    side: "short",
    strike: 170,
    quantity: 4,
    entryPrice: 3.2,
    expiryDte: 57,
    initialSpot: 172.4,
    initialIv: 0.487,
  },
  {
    id: "leg5c",
    ticker: "TSLA",
    type: "call",
    side: "short",
    strike: 220,
    quantity: 4,
    entryPrice: 6.4,
    expiryDte: 57,
    initialSpot: 172.4,
    initialIv: 0.487,
  },
  {
    id: "leg5d",
    ticker: "TSLA",
    type: "call",
    side: "long",
    strike: 230,
    quantity: 4,
    entryPrice: 4.6,
    expiryDte: 57,
    initialSpot: 172.4,
    initialIv: 0.487,
  },
  // 6. GLD Long Call
  {
    id: "leg6a",
    ticker: "GLD",
    type: "call",
    side: "long",
    strike: 240,
    quantity: 8,
    entryPrice: 4.8,
    expiryDte: 85,
    initialSpot: 224.5,
    initialIv: 0.184,
  },
  // 7. QQQ Protective Put
  {
    id: "leg7a",
    ticker: "QQQ",
    type: "stock",
    side: "long",
    strike: 0,
    quantity: 500,
    entryPrice: 440.0,
    expiryDte: 0,
    initialSpot: 448.2,
    initialIv: 0.198,
  },
  {
    id: "leg7b",
    ticker: "QQQ",
    type: "put",
    side: "long",
    strike: 460,
    quantity: 5,
    entryPrice: 8.9,
    expiryDte: 120,
    initialSpot: 448.2,
    initialIv: 0.198,
  },
];

// Baseline spot prices and volatility coefficients
export const SPOT_PRICES: Record<string, number> = {
  AAPL: 189.64,
  NVDA: 875.3,
  SPY: 528.42,
  MSFT: 421.9,
  TSLA: 172.4,
  GLD: 224.5,
  QQQ: 448.2,
};

export const IVS: Record<string, number> = {
  AAPL: 0.284,
  NVDA: 0.528,
  SPY: 0.146,
  MSFT: 0.226,
  TSLA: 0.485,
  GLD: 0.184,
  QQQ: 0.198,
};

// ── Aggregation & Processing ──────────────────────────────────────────────────

// Group raw legs into strategy structures using the engine
const strategyGroups = groupPositionsIntoStrategies(RAW_LEGS, SPOT_PRICES, IVS);

// Map strategy groups to holdings expected by the dashboard
export const HOLDINGS: StrategyHolding[] = strategyGroups.map((g) => ({
  id: g.id,
  ticker: g.ticker,
  strategy: g.strategyName as StrategyType,
  expiry: g.daysToExpiry === 0 ? "—" : `Jun 20 '25`,
  daysToExpiry: g.daysToExpiry,
  quantity: g.quantity,
  costBasis: Math.round(g.costBasis),
  currentValue: Math.round(g.currentValue),
  pnl: Math.round(g.pnl),
  pnlPct: Math.round(g.pnlPct * 10) / 10,
  status: g.status as HoldingStatus,
  bias: g.bias as DirectionBias,
  delta: Math.round(g.greeks.delta * 100) / 100,
  gamma: Math.round(g.greeks.gamma * 1000) / 1000,
  theta: Math.round(g.greeks.theta * 10) / 10,
  vega: Math.round(g.greeks.vega * 10) / 10,
  iv: Math.round((IVS[g.ticker] || 0.25) * 1000) / 10,
  strikes: g.strikes,
  sector: g.sector,
  riskScore: g.riskScore,
  color: g.color,
}));

// Aggregate total portfolio metrics
const totalCost = strategyGroups.reduce((sum, g) => sum + Math.abs(g.costBasis), 0);
const netPnl = strategyGroups.reduce((sum, g) => sum + g.pnl, 0);

export const PORTFOLIO_GREEKS: PortfolioGreeks = {
  totalDelta: Math.round(strategyGroups.reduce((sum, g) => sum + g.greeks.delta, 0) * 100) / 100,
  totalGamma: Math.round(strategyGroups.reduce((sum, g) => sum + g.greeks.gamma, 0) * 1000) / 1000,
  totalTheta: Math.round(strategyGroups.reduce((sum, g) => sum + g.greeks.theta, 0) * 10) / 10,
  totalVega: Math.round(strategyGroups.reduce((sum, g) => sum + g.greeks.vega, 0) * 10) / 10,
  netPnl: Math.round(netPnl),
  totalCost: Math.round(totalCost),
  winRate: 0.571,
  avgIV: 29.4,
  maxRisk: 8200,
};

// Radar chart properties
export const GREEKS_RADAR = [
  { axis: "Delta", value: 0.53, raw: PORTFOLIO_GREEKS.totalDelta, color: "#00d4ff" },
  { axis: "Gamma", value: 0.70, raw: PORTFOLIO_GREEKS.totalGamma, color: "#a855f7" },
  { axis: "Theta", value: 0.58, raw: PORTFOLIO_GREEKS.totalTheta, color: "#ff4d6a" },
  { axis: "Vega",  value: 0.84, raw: PORTFOLIO_GREEKS.totalVega, color: "#00e5a0" },
  { axis: "Risk",  value: 0.41, raw: 41, color: "#f5a623" },
];

// Exposure rollup segments
export const EXPOSURE_SEGMENTS: ExposureSegment[] = rollupExposureByBias(strategyGroups).map((s) => ({
  id: s.id,
  label: s.label,
  value: s.value,
  pct: s.pct,
  color: s.color,
  glowColor: s.glowColor,
  description: s.description,
  strategies: s.strategies,
}));

// P&L historical timeline (simulated carry)
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

// ── Stress Testing Results ────────────────────────────────────────────────────

const stressResults = runDeterministicScenarios(strategyGroups, SPOT_PRICES, SPOT_PRICES);

const iconMap: Record<string, string> = {
  crash: "💥",
  vol_spike: "⚡",
  earnings: "📊",
  sideways: "→",
};
const colorMap: Record<string, string> = {
  crash: "#ff4d6a",
  vol_spike: "#a855f7",
  earnings: "#f5a623",
  sideways: "#00d4ff",
};
const assumptionsMap: Record<string, string> = {
  crash: "Spot −10%, IV +35%, correlation convergence",
  vol_spike: "Spot flat, IV +50%, skew expansion",
  earnings: "Spot +5%, IV crush −30%, smile flattening",
  sideways: "Spot flat, IV unchanged, 15d time decay",
};

export const SCENARIOS: Scenario[] = stressResults.map((r) => {
  // Map simulated group ids back to mock holding ids
  const holdingImpacts: Record<string, number> = {};
  strategyGroups.forEach((g, idx) => {
    const mockId = `h${idx + 1}`; // maps g-xxxx back to h1, h2, h3...
    holdingImpacts[mockId] = r.holdingImpacts[g.id] ?? 0;
  });

  return {
    id: r.id,
    label: r.label,
    description: r.description,
    color: colorMap[r.id] || "#00d4ff",
    icon: iconMap[r.id] || "→",
    assumptions: assumptionsMap[r.id] || "",
    pnlImpact: r.pnlImpact,
    ivChange: r.ivChange,
    spotChange: r.spotChange,
    holdingImpacts,
  };
});
