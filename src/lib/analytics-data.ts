// ============================================
// OPTIXFLOW — Analytics Mock Data & Helpers
// All analytics computations are pure functions
// ============================================

// ── IV Term Structure ─────────────────────────────────

export interface IVTerm {
  expiry: string;   // "1W" | "2W" | "1M" etc.
  daysToExpiry: number;
  iv: number;       // Annualised implied volatility %
  ivCall: number;
  ivPut: number;
}

export const IV_TERM_STRUCTURE: IVTerm[] = [
  { expiry: "1W",  daysToExpiry: 7,   iv: 38.2, ivCall: 37.1, ivPut: 39.4 },
  { expiry: "2W",  daysToExpiry: 14,  iv: 35.6, ivCall: 34.8, ivPut: 36.5 },
  { expiry: "1M",  daysToExpiry: 30,  iv: 32.1, ivCall: 31.5, ivPut: 32.8 },
  { expiry: "6W",  daysToExpiry: 45,  iv: 30.4, ivCall: 30.0, ivPut: 30.9 },
  { expiry: "2M",  daysToExpiry: 60,  iv: 29.8, ivCall: 29.5, ivPut: 30.2 },
  { expiry: "3M",  daysToExpiry: 90,  iv: 28.6, ivCall: 28.3, ivPut: 29.0 },
  { expiry: "6M",  daysToExpiry: 180, iv: 27.4, ivCall: 27.2, ivPut: 27.7 },
  { expiry: "1Y",  daysToExpiry: 365, iv: 26.9, ivCall: 26.8, ivPut: 27.1 },
];

// ── Volatility Smile ─────────────────────────────────

export interface SmilePoint {
  moneyness: number;  // delta: 0.1 ... 0.9
  strike: number;
  iv: number;
  label: string;
}

/** Generate a realistic vol smile with put skew */
export function generateVolSmile(
  spot: number = 170,
  atmIv: number = 29.5
): SmilePoint[] {
  // Typical equity skew: OTM puts are more expensive
  const deltas = [0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9];
  return deltas.map((d) => {
    // Skew: lower delta (deeper OTM put) = higher IV
    const skewAdj = (0.5 - d) * 18;  // ~9pp wing premium at 10-delta
    const iv = atmIv + skewAdj + (Math.abs(d - 0.5) ** 2) * 12;
    const strike = spot * (1 + (d - 0.5) * 0.6);
    return {
      moneyness: d,
      strike: Math.round(strike * 10) / 10,
      iv: Math.round(iv * 10) / 10,
      label: d === 0.5 ? "ATM" : d < 0.5 ? `${Math.round(d * 100)}Δ P` : `${Math.round(d * 100)}Δ C`,
    };
  });
}

// ── Volatility Heatmap ─────────────────────────────────

export interface HeatCell {
  strike: number;
  expiry: string;
  iv: number;
  oi: number;        // Open interest (thousands)
  volume: number;
}

const HEATMAP_EXPIRIES = ["1W", "2W", "1M", "2M", "3M", "6M"];
const BASE_SPOT = 170;

export function generateHeatmap(): HeatCell[] {
  const strikes = [145, 150, 155, 160, 165, 170, 175, 180, 185, 190, 195];
  const cells: HeatCell[] = [];
  for (const expiry of HEATMAP_EXPIRIES) {
    const term = IV_TERM_STRUCTURE.find((t) => t.expiry === expiry)!;
    for (const strike of strikes) {
      const moneyness = (strike - BASE_SPOT) / BASE_SPOT;
      const skew = -moneyness * 15 + Math.abs(moneyness) ** 1.5 * 30;
      const iv = Math.max(15, term.iv + skew + (Math.random() - 0.5) * 1.5);
      const oi = Math.round((80 - Math.abs(moneyness) * 300) * (Math.random() * 0.5 + 0.75));
      cells.push({
        strike,
        expiry,
        iv: Math.round(iv * 10) / 10,
        oi: Math.max(1, oi),
        volume: Math.round(oi * (Math.random() * 0.6 + 0.2)),
      });
    }
  }
  return cells;
}

// ── Greeks ─────────────────────────────────────────────

export interface GreekData {
  id: "delta" | "gamma" | "theta" | "vega";
  label: string;
  value: number;
  normalised: number;  // 0–1 for gauge fill
  unit: string;
  description: string;
  direction: "positive" | "negative" | "neutral";
  color: string;
  interpretation: string;
}

export const GREEKS_DATA: GreekData[] = [
  {
    id: "delta",
    label: "Delta",
    value: 0.52,
    normalised: 0.52,
    unit: "",
    description: "Price sensitivity per $1 move",
    direction: "positive",
    color: "#00d4ff",
    interpretation: "Moderately bullish exposure. Roughly equivalent to holding 52 shares.",
  },
  {
    id: "gamma",
    label: "Gamma",
    value: 0.034,
    normalised: 0.68,
    unit: "",
    description: "Rate of delta change per $1 move",
    direction: "positive",
    color: "#a855f7",
    interpretation: "High curvature — delta will accelerate on strong moves.",
  },
  {
    id: "theta",
    label: "Theta",
    value: -18.40,
    normalised: 0.61,
    unit: "/day",
    description: "Daily time decay (P&L per calendar day)",
    direction: "negative",
    color: "#ff4d6a",
    interpretation: "Losing $18.40 per day to time erosion.",
  },
  {
    id: "vega",
    label: "Vega",
    value: 24.80,
    normalised: 0.74,
    unit: "/1% IV",
    description: "Sensitivity to implied volatility changes",
    direction: "positive",
    color: "#00e5a0",
    interpretation: "Gains $24.80 for each 1% rise in implied volatility.",
  },
];

// ── Probability Cone ─────────────────────────────────────

export interface ConePoint {
  days: number;
  label: string;
  spot: number;
  p68Hi: number;   // 1 std dev upper
  p68Lo: number;   // 1 std dev lower
  p95Hi: number;   // 2 std dev upper
  p95Lo: number;   // 2 std dev lower
  p99Hi: number;   // 3 std dev upper
  p99Lo: number;   // 3 std dev lower
}

/**
 * Generate probability cone using lognormal assumption.
 * σ_T = σ_annual × sqrt(T/252)
 */
export function generateProbabilityCone(
  spot: number = 170,
  annualIv: number = 0.295,
  horizonDays: number = 90
): ConePoint[] {
  const steps = [0, 5, 10, 15, 21, 30, 45, 60, 75, 90];
  return steps
    .filter((d) => d <= horizonDays)
    .map((days) => {
      const t = days / 252;
      const sigma = annualIv * Math.sqrt(t);
      return {
        days,
        label: days === 0 ? "Today" : `Day ${days}`,
        spot,
        p68Hi: Math.round(spot * Math.exp(sigma) * 100) / 100,
        p68Lo: Math.round(spot * Math.exp(-sigma) * 100) / 100,
        p95Hi: Math.round(spot * Math.exp(2 * sigma) * 100) / 100,
        p95Lo: Math.round(spot * Math.exp(-2 * sigma) * 100) / 100,
        p99Hi: Math.round(spot * Math.exp(3 * sigma) * 100) / 100,
        p99Lo: Math.round(spot * Math.exp(-3 * sigma) * 100) / 100,
      };
    });
}

// ── Market Regime ─────────────────────────────────────────

export type RegimeType = "risk_on" | "risk_off" | "low_vol" | "high_vol" | "neutral";

export interface RegimeData {
  id: RegimeType;
  label: string;
  score: number;       // 0–100 confidence
  color: string;
  glowColor: string;
  description: string;
}

export const REGIME_SIGNALS: RegimeData[] = [
  { id: "risk_on",  label: "Risk-On",     score: 72, color: "#00e5a0", glowColor: "rgba(0,229,160,0.3)",   description: "Broad equity strength, credit spreads tightening" },
  { id: "low_vol",  label: "Low Vol",     score: 58, color: "#00d4ff", glowColor: "rgba(0,212,255,0.3)",   description: "VIX below 20, realised vol suppressed" },
  { id: "neutral",  label: "Neutral",     score: 41, color: "#f5a623", glowColor: "rgba(245,166,35,0.3)",  description: "Mixed signals, range-bound tape" },
  { id: "high_vol", label: "High Vol",    score: 28, color: "#ff4d6a", glowColor: "rgba(255,77,106,0.3)",  description: "Elevated IV, wider bid/ask spreads" },
  { id: "risk_off", label: "Risk-Off",    score: 18, color: "#ff4d6a", glowColor: "rgba(255,77,106,0.2)",  description: "Flight to safety, puts bid, VIX elevated" },
];

export const PRIMARY_REGIME = REGIME_SIGNALS[0]; // risk-on is dominant

// ── Asset Intelligence ────────────────────────────────────

export interface AssetData {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  iv30: number;
  hv30: number;          // Historical vol
  ivRank: number;        // 0–100 percentile
  pcRatio: number;       // Put/Call ratio
  callOi: number;
  putOi: number;
  volume: number;
  avgVolume: number;
  earningsDate: string;
  sentiment: number;     // 0–100 (0=bearish, 100=bullish)
  sparkline: number[];   // 20 days of price normalised 0-1
}

export const FEATURED_ASSETS: AssetData[] = [
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    price: 189.64,
    change: 3.21,
    changePct: 1.72,
    iv30: 28.4,
    hv30: 22.1,
    ivRank: 44,
    pcRatio: 0.72,
    callOi: 284000,
    putOi: 205000,
    volume: 62_400_000,
    avgVolume: 55_200_000,
    earningsDate: "Jul 30",
    sentiment: 68,
    sparkline: [0.42,0.44,0.41,0.45,0.47,0.43,0.48,0.50,0.52,0.49,0.54,0.56,0.53,0.58,0.60,0.57,0.62,0.65,0.63,0.68],
  },
  {
    ticker: "NVDA",
    name: "NVIDIA Corp.",
    price: 875.30,
    change: 12.4,
    changePct: 1.44,
    iv30: 52.8,
    hv30: 48.3,
    ivRank: 71,
    pcRatio: 0.58,
    callOi: 520000,
    putOi: 301000,
    volume: 41_800_000,
    avgVolume: 38_500_000,
    earningsDate: "Aug 21",
    sentiment: 82,
    sparkline: [0.30,0.34,0.31,0.38,0.40,0.37,0.43,0.45,0.50,0.47,0.55,0.58,0.54,0.62,0.65,0.60,0.70,0.72,0.68,0.75],
  },
  {
    ticker: "SPY",
    name: "S&P 500 ETF",
    price: 528.42,
    change: 2.14,
    changePct: 0.41,
    iv30: 14.6,
    hv30: 11.8,
    ivRank: 32,
    pcRatio: 1.24,
    callOi: 1_240_000,
    putOi: 1_537_000,
    volume: 98_500_000,
    avgVolume: 82_000_000,
    earningsDate: "—",
    sentiment: 55,
    sparkline: [0.50,0.51,0.49,0.52,0.53,0.51,0.54,0.55,0.53,0.56,0.57,0.55,0.58,0.59,0.58,0.60,0.61,0.60,0.62,0.63],
  },
];
