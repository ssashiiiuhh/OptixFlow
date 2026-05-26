import { bsmPrice, bsmGreeks } from "../greeks/bsm";
import { getStrategyLegs } from "./legs";
import { calculatePOP } from "../probability/pop";
import { OptionLeg } from "./types";

export const TOTAL_DTE = 45;       // Total days in simulation
export const STRIKE = 100;          // Normalized underlying price
export const PRICE_MIN = 70;
export const PRICE_MAX = 130;
export const PRICE_STEP = 1;

// IV multipliers per scenario for playbook backward compatibility
export const IV_MULTIPLIERS = { low: 0.5, normal: 1.0, high: 1.8 } as const;
export type IVScenario = keyof typeof IV_MULTIPLIERS;

// Normalized intensity (0=low, 0.5=normal, 1.0=high) — used for smooth visual interpolation
export const IV_INTENSITIES: Record<IVScenario, number> = { low: 0, normal: 0.5, high: 1.0 };

// Environmental descriptions per regime
export const IV_REGIME_META: Record<IVScenario, { label: string; description: string; colorHint: string }> = {
  low:    { label: "Low IV",    description: "Compressed expectations. Narrow uncertainty band.",   colorHint: "#60a5fa" },
  normal: { label: "Normal IV", description: "Balanced volatility. Standard risk/reward profile.", colorHint: "#a3e635" },
  high:   { label: "High IV",   description: "Expanded volatility. High premium, wide range.",      colorHint: "#fb923c" },
};

// Map IV scenarios to actual percentage values (ratio)
export const SCENARIO_IV: Record<IVScenario, number> = {
  low: 0.15,
  normal: 0.30,
  high: 0.54,
};

/**
 * Playbook backward compatibility API.
 */
export function timeValueFactor(dte: number): number {
  return Math.sqrt(Math.max(0, dte) / TOTAL_DTE);
}

/**
 * Calculates net strategy price.
 */
export function computeStrategyPrice(
  legs: OptionLeg[],
  spot: number,
  t: number,
  iv: number,
  r: number = 0.05
): number {
  return legs.reduce((acc, leg) => {
    const price = bsmPrice(spot, leg.strike, t, iv, r, leg.type);
    const sign = leg.side === "long" ? 1 : -1;
    return acc + price * sign * leg.quantity;
  }, 0);
}

/**
 * Calculates net strategy Greeks (Delta, Gamma, Theta, Vega, Rho).
 */
export function computeStrategyGreeks(
  legs: OptionLeg[],
  spot: number,
  t: number,
  iv: number,
  r: number = 0.05
) {
  let delta = 0;
  let gamma = 0;
  let theta = 0;
  let vega = 0;
  let rho = 0;

  for (const leg of legs) {
    const sign = leg.side === "long" ? 1 : -1;
    const legGreeks = bsmGreeks(spot, leg.strike, t, iv, r, leg.type);
    delta += legGreeks.delta * sign * leg.quantity;
    gamma += legGreeks.gamma * sign * leg.quantity;
    theta += legGreeks.theta * sign * leg.quantity;
    vega += legGreeks.vega * sign * leg.quantity;
    rho += legGreeks.rho * sign * leg.quantity;
  }

  // Scale Theta, Vega, and Rho to standard options contracts (* 100)
  return {
    delta,
    gamma,
    theta: theta * 100,
    vega: vega * 100,
    rho: rho * 100,
  };
}

/**
 * Computes theta decay payoff series.
 */
export function computeThetaPayoff(
  strategyName: string,
  dte: number,
  ivScenario: IVScenario = "normal"
): Array<{ price: number; pnl: number; intrinsic: number; timeValue: number }> {
  const iv = SCENARIO_IV[ivScenario];
  const legs = getStrategyLegs(strategyName, STRIKE, 5);
  
  // Cost basis (initial premium paid/received) at DTE = 45
  const initialValue = computeStrategyPrice(legs, STRIKE, TOTAL_DTE / 365, iv);

  const data = [];
  for (let price = PRICE_MIN; price <= PRICE_MAX; price += PRICE_STEP) {
    const currentValue = computeStrategyPrice(legs, price, dte / 365, iv);
    const intrinsicValue = computeStrategyPrice(legs, price, 0, iv);
    const pnl = currentValue - initialValue;
    const timeValue = Math.max(0, currentValue - intrinsicValue);

    data.push({
      price,
      pnl: Math.round(pnl * 100) / 100,
      intrinsic: Math.round(intrinsicValue * 100) / 100,
      timeValue: Math.round(timeValue * 100) / 100
    });
  }
  return data;
}

/**
 * Computes theta decay metrics.
 */
export function computeThetaMetrics(
  strategyName: string,
  dte: number,
  ivScenario: IVScenario = "normal"
) {
  const iv = SCENARIO_IV[ivScenario];
  const legs = getStrategyLegs(strategyName, STRIKE, 5);
  
  const initialValue = computeStrategyPrice(legs, STRIKE, TOTAL_DTE / 365, iv);
  const currentValue = computeStrategyPrice(legs, STRIKE, dte / 365, iv);
  
  const valueYesterday = computeStrategyPrice(legs, STRIKE, Math.min(TOTAL_DTE, dte + 1) / 365, iv);
  const dailyDecay = valueYesterday - currentValue;

  // Extrinsic value remaining (time value)
  const intrinsicValue = computeStrategyPrice(legs, STRIKE, 0, iv);
  const extrinsicValue = Math.max(0, currentValue - intrinsicValue);
  const initialExtrinsic = Math.max(0.01, initialValue - intrinsicValue);
  const extrinsicPct = (extrinsicValue / initialExtrinsic) * 100;

  // Greeks for UI representation
  const greeks = computeStrategyGreeks(legs, STRIKE, dte / 365, iv);

  // Rough probability of profit: decreases as time value decays
  const pop = Math.max(10, 42 * timeValueFactor(dte));
  const urgency: "safe" | "caution" | "critical" =
    dte > 21 ? "safe" : dte > 7 ? "caution" : "critical";

  return {
    extrinsicValue: Math.round(extrinsicValue * 100) / 100,
    extrinsicPct: Math.max(0, Math.min(100, Math.round(extrinsicPct))),
    theta: Math.round(greeks.theta * 100) / 100,
    dailyDecay: Math.round(dailyDecay * 100) / 100,
    dte,
    pop: Math.round(pop),
    urgency,
  };
}

/**
 * Calculates volatility bands around strategy payoffs.
 */
export function computeVolatilityBand(
  strategyName: string,
  dte: number,
  ivScenario: IVScenario
): Array<{ price: number; upper: number; lower: number }> {
  const iv = SCENARIO_IV[ivScenario];
  const t = dte / 365;
  const bandHalfWidth = STRIKE * iv * Math.sqrt(t) * 0.75; // 1-std-dev volatility range approx

  const payoffData = computeThetaPayoff(strategyName, dte, ivScenario);
  return payoffData.map(d => ({
    price: d.price,
    upper: Math.round((d.pnl + bandHalfWidth) * 100) / 100,
    lower: Math.round((d.pnl - bandHalfWidth) * 100) / 100,
  }));
}

export type MultiChartPoint = {
  price: number;
  baseline: number;
  current: number;
  upper: number;
  lower: number;
  [key: string]: number;
};

/**
 * Builds multi-payoff snapshot.
 */
export function buildMultiChartSnapshot(
  strategyName: string,
  dte: number,
  ivScenario: IVScenario,
  pinnedDtes: number[]
): MultiChartPoint[] {
  const iv = SCENARIO_IV[ivScenario];
  const t = dte / 365;
  const bandHalfWidth = STRIKE * iv * Math.sqrt(t) * 0.75;

  const baselineData = computeThetaPayoff(strategyName, TOTAL_DTE, ivScenario);
  const currentData  = computeThetaPayoff(strategyName, dte, ivScenario);

  const pinnedPayoffs = pinnedDtes.map(pd => {
    const data = computeThetaPayoff(strategyName, pd, ivScenario);
    const pdHalfWidth = STRIKE * iv * Math.sqrt(pd / 365) * 0.75;
    return { dte: pd, data, halfWidth: pdHalfWidth };
  });

  return baselineData.map((b, i) => {
    const c = currentData[i]?.pnl ?? 0;
    const pt: MultiChartPoint = {
      price:    b.price,
      baseline: b.pnl,
      current:  c,
      upper:    Math.round((c + bandHalfWidth) * 100) / 100,
      lower:    Math.round((c - bandHalfWidth) * 100) / 100,
    };

    pinnedPayoffs.forEach(p => {
      const pVal = p.data[i]?.pnl ?? 0;
      pt[`pnl_${p.dte}`] = pVal;
      pt[`upper_${p.dte}`] = Math.round((pVal + p.halfWidth) * 100) / 100;
      pt[`lower_${p.dte}`] = Math.round((pVal - p.halfWidth) * 100) / 100;
    });

    return pt;
  });
}

export interface ComparisonChartPoint {
  price: number;
  baselineA: number;
  currentA: number;
  upperA: number;
  lowerA: number;
  baselineB: number;
  currentB: number;
  upperB: number;
  lowerB: number;
}

/**
 * Builds comparison payoff snapshot.
 */
export function buildComparisonChartSnapshot(
  strategyA: string,
  strategyB: string,
  dte: number,
  ivScenario: IVScenario
): ComparisonChartPoint[] {
  const iv = SCENARIO_IV[ivScenario];
  const t = dte / 365;
  const bandHalfWidth = STRIKE * iv * Math.sqrt(t) * 0.75;

  const baselineDataA = computeThetaPayoff(strategyA, TOTAL_DTE, ivScenario);
  const currentDataA  = computeThetaPayoff(strategyA, dte, ivScenario);
  const baselineDataB = computeThetaPayoff(strategyB, TOTAL_DTE, ivScenario);
  const currentDataB  = computeThetaPayoff(strategyB, dte, ivScenario);

  return baselineDataA.map((bA, i) => {
    const cA = currentDataA[i]?.pnl ?? 0;
    const cB = currentDataB[i]?.pnl ?? 0;
    const bB = baselineDataB[i]?.pnl ?? 0;

    return {
      price:     bA.price,
      baselineA: bA.pnl,
      currentA:  cA,
      upperA:    Math.round((cA + bandHalfWidth) * 100) / 100,
      lowerA:    Math.round((cA - bandHalfWidth) * 100) / 100,
      baselineB: bB,
      currentB:  cB,
      upperB:    Math.round((cB + bandHalfWidth) * 100) / 100,
      lowerB:    Math.round((cB - bandHalfWidth) * 100) / 100,
    };
  });
}

export interface DynamicChartPoint {
  price: number;
  baselineA: number;
  currentA: number;
  upperA: number;
  lowerA: number;
  baselineB?: number;
  currentB?: number;
  upperB?: number;
  lowerB?: number;
}

/**
 * Builds dynamic coordinates for the Analytics Lab payoff viewport.
 */
export function buildDynamicChartSnapshot(
  strategyA: string,
  spot: number,
  strike: number,
  dte: number,
  ivPercent: number, // e.g. 30 for 30%
  initialSpot: number,
  initialIvPercent: number,
  spreadWidth: number = 5,
  strategyB?: string
): DynamicChartPoint[] {
  const iv = ivPercent / 100;
  const ivInitial = initialIvPercent / 100;
  const t = dte / 365;
  const tInitial = TOTAL_DTE / 365;

  const legsA = getStrategyLegs(strategyA, strike, spreadWidth);
  const initialValueA = computeStrategyPrice(legsA, initialSpot, tInitial, ivInitial);

  let legsB: OptionLeg[] | null = null;
  let initialValueB = 0;
  if (strategyB) {
    legsB = getStrategyLegs(strategyB, strike, spreadWidth);
    initialValueB = computeStrategyPrice(legsB, initialSpot, tInitial, ivInitial);
  }

  // Generate around the strike
  const minP = Math.max(10, strike - 30);
  const maxP = strike + 30;
  const step = 1;
  const data: DynamicChartPoint[] = [];

  const bandHalfWidthA = strike * iv * Math.sqrt(t) * 0.75 * (strategyA.includes("Spread") || strategyA === "Iron Condor" ? 0.35 : 1.0);
  const bandHalfWidthB = strategyB ? strike * iv * Math.sqrt(t) * 0.75 * (strategyB.includes("Spread") || strategyB === "Iron Condor" ? 0.35 : 1.0) : 0;

  for (let p = minP; p <= maxP; p += step) {
    // Strategy A
    const currentPriceA = computeStrategyPrice(legsA, p, t, iv);
    const pnlA = currentPriceA - initialValueA;

    const pt: DynamicChartPoint = {
      price: p,
      baselineA: Math.round(pnlA * 100) / 100,
      currentA: Math.round(pnlA * 100) / 100,
      upperA: Math.round((pnlA + bandHalfWidthA) * 100) / 100,
      lowerA: Math.round((pnlA - bandHalfWidthA) * 100) / 100,
    };

    // Strategy B
    if (strategyB && legsB) {
      const currentPriceB = computeStrategyPrice(legsB, p, t, iv);
      const pnlB = currentPriceB - initialValueB;

      pt.baselineB = Math.round(pnlB * 100) / 100;
      pt.currentB = Math.round(pnlB * 100) / 100;
      pt.upperB = Math.round((pnlB + bandHalfWidthB) * 100) / 100;
      pt.lowerB = Math.round((pnlB - bandHalfWidthB) * 100) / 100;
    }

    data.push(pt);
  }

  return data;
}

/**
 * Dynamically computes analytics telemetry and metrics.
 */
export function computeDynamicMetrics(
  strategyName: string,
  spot: number,
  strike: number,
  dte: number,
  ivPercent: number,
  initialSpot: number,
  initialIvPercent: number,
  spreadWidth: number = 5
) {
  const iv = ivPercent / 100;
  const ivInitial = initialIvPercent / 100;
  const t = dte / 365;
  const tInitial = TOTAL_DTE / 365;

  const legs = getStrategyLegs(strategyName, strike, spreadWidth);
  const initialValue = computeStrategyPrice(legs, initialSpot, tInitial, ivInitial);
  const currentValue = computeStrategyPrice(legs, spot, t, iv);
  
  const valueYesterday = computeStrategyPrice(legs, spot, Math.min(TOTAL_DTE, dte + 1) / 365, iv);
  const dailyDecay = valueYesterday - currentValue;

  // Extrinsic value calculation
  const intrinsicValue = computeStrategyPrice(legs, spot, 0, iv);
  const extrinsicValue = Math.max(0, currentValue - intrinsicValue);
  const initialExtrinsic = Math.max(0.01, initialValue - intrinsicValue);
  const extrinsicPct = (extrinsicValue / initialExtrinsic) * 100;

  // Greeks calculation
  const greeks = computeStrategyGreeks(legs, spot, t, iv);

  // Dynamic analytical Probability of Profit (POP) using the centralized probability sub-engine
  const pop = calculatePOP(strategyName, spot, strike, t, iv, 0.05, initialValue, spreadWidth);

  const urgency: "safe" | "caution" | "critical" =
    dte > 21 ? "safe" : dte > 7 ? "caution" : "critical";

  return {
    pnl: currentValue - initialValue,
    extrinsicValue: Math.round(extrinsicValue * 100) / 100,
    extrinsicPct: Math.max(0, Math.min(100, Math.round(extrinsicPct))),
    theta: Math.round(greeks.theta * 100) / 100,
    delta: Math.round(greeks.delta * 100) / 100,
    gamma: Math.round(greeks.gamma * 1000) / 1000,
    vega: Math.round(greeks.vega * 100) / 100,
    rho: Math.round(greeks.rho * 100) / 100,
    dailyDecay: Math.round(dailyDecay * 100) / 100,
    pop: Math.round(pop),
    urgency
  };
}
