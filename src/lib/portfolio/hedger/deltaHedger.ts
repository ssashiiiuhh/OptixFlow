// ============================================================================
// OPTIXFLOW — Algorithmic Delta-Hedger Engine
// Monitors net portfolio delta and generates hedge recommendations.
// Mirrors professional derivatives desk delta-neutral rebalancing logic.
// ============================================================================

export type HedgeInstrument = "equity" | "put" | "call" | "etf";
export type HedgeDirection = "buy" | "sell";
export type HedgeSeverity = "neutral" | "caution" | "warning" | "critical";

export interface HedgeRecommendation {
  instrument: HedgeInstrument;
  ticker: string;
  direction: HedgeDirection;
  quantity: number;
  strike?: number;
  dte?: number;
  rationale: string;
  deltaOffset: number;   // How much delta this hedge adds/removes
  severity: HedgeSeverity;
  estimatedCost: number;
}

export interface DeltaHedgerState {
  netDelta: number;
  toleranceLow: number;   // Lower bound of neutral zone (e.g. -50)
  toleranceHigh: number;  // Upper bound of neutral zone (e.g. +50)
  severity: HedgeSeverity;
  recommendation: HedgeRecommendation | null;
  isNeutral: boolean;
  deltaExposurePct: number; // As % of total delta capacity
}

function getSeverity(netDelta: number, low: number, high: number): HedgeSeverity {
  const slack = Math.max(Math.abs(high), Math.abs(low));
  const overshoot = netDelta > high ? netDelta - high : netDelta < low ? low - netDelta : 0;
  const ratio = overshoot / slack;
  if (ratio <= 0) return "neutral";
  if (ratio < 0.5) return "caution";
  if (ratio < 1.5) return "warning";
  return "critical";
}

/**
 * Core hedge signal computer. Stateless — takes current net delta and
 * returns the recommended hedge trade to bring delta back to neutral.
 *
 * @param netDelta       Current total portfolio delta
 * @param spotPrices     Current spot price map (for SPY, AAPL, etc.)
 * @param toleranceLow   Delta tolerance lower bound (default -50)
 * @param toleranceHigh  Delta tolerance upper bound (default +50)
 */
export function computeHedgeSignal(
  netDelta: number,
  spotPrices: Record<string, number>,
  toleranceLow = -50,
  toleranceHigh = 50,
): DeltaHedgerState {
  const severity = getSeverity(netDelta, toleranceLow, toleranceHigh);
  const isNeutral = severity === "neutral";
  const spyPrice = spotPrices["SPY"] ?? 530;
  const deltaExposurePct = Math.min(
    100,
    Math.max(-100, (netDelta / Math.max(Math.abs(toleranceLow), toleranceHigh)) * 100),
  );

  if (isNeutral) {
    return { netDelta, toleranceLow, toleranceHigh, severity, recommendation: null, isNeutral, deltaExposurePct };
  }

  let recommendation: HedgeRecommendation;

  if (netDelta > toleranceHigh) {
    // Portfolio is too LONG delta → need to SHORT or BUY PUTS
    const excessDelta = netDelta - toleranceHigh;

    if (severity === "caution") {
      // Lightweight: short SPY shares
      const sharesNeeded = Math.round(excessDelta);
      recommendation = {
        instrument: "equity",
        ticker: "SPY",
        direction: "sell",
        quantity: sharesNeeded,
        rationale: `Net delta +${netDelta.toFixed(0)} breaches upper band +${toleranceHigh}. Short ${sharesNeeded} SPY @ $${spyPrice.toFixed(0)} to offset.`,
        deltaOffset: -sharesNeeded,
        severity,
        estimatedCost: sharesNeeded * spyPrice,
      };
    } else {
      // Aggressive: buy puts
      const contractsNeeded = Math.max(1, Math.round(excessDelta / 50));
      const strikeLevel = Math.round(spyPrice * 0.975 / 5) * 5;
      recommendation = {
        instrument: "put",
        ticker: "SPY",
        direction: "buy",
        quantity: contractsNeeded,
        strike: strikeLevel,
        dte: 30,
        rationale: `CRITICAL: Delta ${netDelta.toFixed(0)} far exceeds band. Buy ${contractsNeeded}× SPY ${strikeLevel}P (30d) to hedge directional exposure.`,
        deltaOffset: -50 * contractsNeeded * 0.55, // estimated put delta
        severity,
        estimatedCost: contractsNeeded * 320,
      };
    }
  } else {
    // Portfolio is too SHORT delta → need to BUY or SELL PUTS
    const deficitDelta = toleranceLow - netDelta;

    if (severity === "caution") {
      const sharesNeeded = Math.round(deficitDelta);
      recommendation = {
        instrument: "equity",
        ticker: "SPY",
        direction: "buy",
        quantity: sharesNeeded,
        rationale: `Net delta ${netDelta.toFixed(0)} breaches lower band ${toleranceLow}. Buy ${sharesNeeded} SPY @ $${spyPrice.toFixed(0)} to restore upside exposure.`,
        deltaOffset: sharesNeeded,
        severity,
        estimatedCost: sharesNeeded * spyPrice,
      };
    } else {
      const contractsNeeded = Math.max(1, Math.round(deficitDelta / 50));
      const strikeLevel = Math.round(spyPrice * 1.01 / 5) * 5;
      recommendation = {
        instrument: "call",
        ticker: "SPY",
        direction: "buy",
        quantity: contractsNeeded,
        strike: strikeLevel,
        dte: 21,
        rationale: `CRITICAL: Delta ${netDelta.toFixed(0)} severely negative. Buy ${contractsNeeded}× SPY ${strikeLevel}C (21d) to lift delta exposure.`,
        deltaOffset: 50 * contractsNeeded * 0.55,
        severity,
        estimatedCost: contractsNeeded * 280,
      };
    }
  }

  return { netDelta, toleranceLow, toleranceHigh, severity, recommendation, isNeutral, deltaExposurePct };
}
