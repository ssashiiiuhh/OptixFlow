// ============================================
// OPTIXFLOW — Black-Scholes options pricing engine
// Professional-grade analytical greeks & payoffs
// ============================================

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
const SCENARIO_IV: Record<IVScenario, number> = {
  low: 0.15,
  normal: 0.30,
  high: 0.54,
};

// ── BSM-Inspired Mathematics ───────────────────────────────────────────────

/**
 * Probability density function (PDF) of a standard normal distribution.
 */
export function normPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Cumulative distribution function (CDF) of a standard normal distribution.
 * Uses the Abramowitz and Stegun approximation (error < 7.5e-8).
 */
export function normCDF(x: number): number {
  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const t = 1.0 / (1.0 + p * Math.abs(x));
  const pdfVal = normPDF(x);
  const sigma = 1.0 - pdfVal * (
    b1 * t +
    b2 * Math.pow(t, 2) +
    b3 * Math.pow(t, 3) +
    b4 * Math.pow(t, 4) +
    b5 * Math.pow(t, 5)
  );

  return x >= 0 ? sigma : 1.0 - sigma;
}

/**
 * Calculates standard Black-Scholes option price.
 */
export function bsmPrice(
  spot: number,
  strike: number,
  t: number,
  iv: number,
  r: number = 0.05,
  type: "call" | "put"
): number {
  const sClamped = Math.max(0.01, spot);
  const kClamped = Math.max(0.01, strike);
  const ivClamped = Math.max(0.01, iv);

  if (t <= 1e-5) {
    return type === "call" ? Math.max(0, sClamped - kClamped) : Math.max(0, kClamped - sClamped);
  }

  const d1 = (Math.log(sClamped / kClamped) + (r + 0.5 * ivClamped * ivClamped) * t) / (ivClamped * Math.sqrt(t));
  const d2 = d1 - ivClamped * Math.sqrt(t);

  if (type === "call") {
    return sClamped * normCDF(d1) - kClamped * Math.exp(-r * t) * normCDF(d2);
  } else {
    return kClamped * Math.exp(-r * t) * normCDF(-d2) - sClamped * normCDF(-d1);
  }
}

/**
 * Calculates standard analytical Greeks using Black-Scholes.
 */
export function bsmGreeks(
  spot: number,
  strike: number,
  t: number,
  iv: number,
  r: number = 0.05,
  type: "call" | "put"
) {
  const sClamped = Math.max(0.01, spot);
  const kClamped = Math.max(0.01, strike);
  const ivClamped = Math.max(0.01, iv);

  if (t <= 1e-5) {
    const isITMCall = sClamped > kClamped;
    const isITMPut = sClamped < kClamped;
    return {
      delta: type === "call" ? (isITMCall ? 1 : 0) : (isITMPut ? -1 : 0),
      gamma: 0,
      theta: 0,
      vega: 0
    };
  }

  const d1 = (Math.log(sClamped / kClamped) + (r + 0.5 * ivClamped * ivClamped) * t) / (ivClamped * Math.sqrt(t));
  const d2 = d1 - ivClamped * Math.sqrt(t);
  const sqrtT = Math.sqrt(t);
  const pdfD1 = normPDF(d1);

  const delta = type === "call" ? normCDF(d1) : normCDF(d1) - 1;
  const gamma = pdfD1 / (sClamped * ivClamped * sqrtT);
  const vega = (sClamped * sqrtT * pdfD1) / 100; // Scaled for 1% change in IV
  
  const term1 = -(sClamped * pdfD1 * ivClamped) / (2 * sqrtT);
  const term2 = r * kClamped * Math.exp(-r * t);
  const thetaYearly = type === "call"
    ? term1 - term2 * normCDF(d2)
    : term1 + term2 * normCDF(-d2);
  const theta = thetaYearly / 365; // Scaled for 1 day change

  return { delta, gamma, theta, vega };
}

// ── Leg-Based Strategy Composition ─────────────────────────────────────────

export interface OptionLeg {
  type: "call" | "put";
  side: "long" | "short";
  strike: number;
  quantity: number;
}

/**
 * Dynamically builds option legs for a given strategy.
 */
export function getStrategyLegs(
  strategyName: string,
  strike: number,
  spreadWidth: number = 5
): OptionLeg[] {
  switch (strategyName) {
    case "Long Call":
      return [{ type: "call", side: "long", strike, quantity: 1 }];
    case "Long Put":
      return [{ type: "put", side: "long", strike, quantity: 1 }];
    case "Long Straddle":
      return [
        { type: "call", side: "long", strike, quantity: 1 },
        { type: "put", side: "long", strike, quantity: 1 }
      ];
    case "Bull Call Spread":
      return [
        { type: "call", side: "long", strike, quantity: 1 },
        { type: "call", side: "short", strike: strike + spreadWidth, quantity: 1 }
      ];
    case "Bear Put Spread":
      return [
        { type: "put", side: "long", strike, quantity: 1 },
        { type: "put", side: "short", strike: strike - spreadWidth, quantity: 1 }
      ];
    case "Iron Condor":
      // Sell Put at strike - w, Buy Put at strike - 2w
      // Sell Call at strike + w, Buy Call at strike + 2w
      return [
        { type: "put", side: "long", strike: strike - 2 * spreadWidth, quantity: 1 },
        { type: "put", side: "short", strike: strike - spreadWidth, quantity: 1 },
        { type: "call", side: "short", strike: strike + spreadWidth, quantity: 1 },
        { type: "call", side: "long", strike: strike + 2 * spreadWidth, quantity: 1 }
      ];
    case "Covered Call":
      return [
        { type: "call", side: "long", strike: 0.01, quantity: 1 },
        { type: "call", side: "short", strike, quantity: 1 }
      ];
    case "Cash Secured Put":
      return [{ type: "put", side: "short", strike, quantity: 1 }];
    default:
      return [{ type: "call", side: "long", strike, quantity: 1 }];
  }
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
 * Calculates net strategy Greeks.
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

  for (const leg of legs) {
    const sign = leg.side === "long" ? 1 : -1;
    const legGreeks = bsmGreeks(spot, leg.strike, t, iv, r, leg.type);
    delta += legGreeks.delta * sign * leg.quantity;
    gamma += legGreeks.gamma * sign * leg.quantity;
    theta += legGreeks.theta * sign * leg.quantity;
    vega += legGreeks.vega * sign * leg.quantity;
  }

  // Scale Theta and Vega to standard options contracts (* 100)
  return {
    delta,
    gamma,
    theta: theta * 100,
    vega: vega * 100,
  };
}

// ── Playbook Backward Compatibility API ─────────────────────────────────────

export function timeValueFactor(dte: number): number {
  return Math.sqrt(Math.max(0, dte) / TOTAL_DTE);
}

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

// ── Dynamic Analytics Lab Options Engine ─────────────────────────────────────

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
    const baselinePriceA = computeStrategyPrice(legsA, p, tInitial, ivInitial);
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
      const baselinePriceB = computeStrategyPrice(legsB, p, tInitial, ivInitial);
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
 * Dynamically computes analytics telemetry and metrics (including probability of profit).
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

  // Dynamic analytical Probability of Profit (POP)
  let pop = 50;
  const sigma = iv * Math.sqrt(Math.max(1e-5, t));
  const r = 0.05;

  // Probability that S_expiry is inside a profitable zone
  if (strategyName === "Long Call" || strategyName === "Cash Secured Put") {
    const breakeven = strike + initialValue; // S_expiry > K + Premium (for long call) or K - Credit (for cash secured put)
    const d2 = (Math.log(spot / breakeven) + (r - 0.5 * iv * iv) * t) / (iv * Math.sqrt(Math.max(1e-5, t)));
    pop = normCDF(d2) * 100;
  } else if (strategyName === "Long Put") {
    const breakeven = strike - initialValue; // S_expiry < K - Premium
    const d2 = (Math.log(spot / breakeven) + (r - 0.5 * iv * iv) * t) / (iv * Math.sqrt(Math.max(1e-5, t)));
    pop = (1 - normCDF(d2)) * 100;
  } else if (strategyName === "Bull Call Spread") {
    const breakeven = strike + initialValue; // Net debit is initialValue
    const d2 = (Math.log(spot / breakeven) + (r - 0.5 * iv * iv) * t) / (iv * Math.sqrt(Math.max(1e-5, t)));
    pop = normCDF(d2) * 100;
  } else if (strategyName === "Bear Put Spread") {
    const breakeven = strike - initialValue; // Net debit is initialValue
    const d2 = (Math.log(spot / breakeven) + (r - 0.5 * iv * iv) * t) / (iv * Math.sqrt(Math.max(1e-5, t)));
    pop = (1 - normCDF(d2)) * 100;
  } else if (strategyName === "Covered Call") {
    const breakeven = initialValue; // Net debit (stock - call premium)
    const d2 = (Math.log(spot / breakeven) + (r - 0.5 * iv * iv) * t) / (iv * Math.sqrt(Math.max(1e-5, t)));
    pop = normCDF(d2) * 100;
  } else if (strategyName === "Long Straddle") {
    // S_expiry > K + initialValue OR S_expiry < K - initialValue
    const beUpper = strike + initialValue;
    const beLower = strike - initialValue;
    const d2Upper = (Math.log(spot / beUpper) + (r - 0.5 * iv * iv) * t) / (iv * Math.sqrt(Math.max(1e-5, t)));
    const d2Lower = (Math.log(spot / beLower) + (r - 0.5 * iv * iv) * t) / (iv * Math.sqrt(Math.max(1e-5, t)));
    pop = (normCDF(d2Upper) + (1 - normCDF(d2Lower))) * 100;
  } else if (strategyName === "Iron Condor") {
    // S_expiry is between Short Put (K - w) - Credit and Short Call (K + w) + Credit
    // For Iron Condor, initialValue is negative (net credit received)
    const credit = -initialValue;
    const beUpper = strike + spreadWidth + credit;
    const beLower = strike - spreadWidth - credit;
    const d2Upper = (Math.log(spot / beUpper) + (r - 0.5 * iv * iv) * t) / (iv * Math.sqrt(Math.max(1e-5, t)));
    const d2Lower = (Math.log(spot / beLower) + (r - 0.5 * iv * iv) * t) / (iv * Math.sqrt(Math.max(1e-5, t)));
    // P(beLower < S_expiry < beUpper) = P(S_expiry < beUpper) - P(S_expiry < beLower)
    pop = (normCDF(d2Upper) - normCDF(d2Lower)) * 100;
  }

  pop = Math.max(5, Math.min(95, pop)); // Clamp between 5% and 95%

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
    dailyDecay: Math.round(dailyDecay * 100) / 100,
    pop: Math.round(pop),
    urgency
  };
}
