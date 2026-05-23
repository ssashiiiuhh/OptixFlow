// ============================================================================
// OPTIXFLOW — Regime Suitability & Strategy Diagnostics Engine
// Evaluates options structures against real-time volatility and price regimes.
// Pure functional engine mapping market state to probabilistic suitability.
// ============================================================================

import { MarketAsset } from "./MarketDataService";

export type SuitabilityRating =
  | "HIGHLY_FAVORED"
  | "FAVORED"
  | "NEUTRAL"
  | "VULNERABLE"
  | "HIGHLY_VULNERABLE";

export interface SuitabilityResult {
  strategyId: string;
  strategyName: string;
  score: number; // 0 to 100 rating
  suitability: SuitabilityRating;
  reason: string;
  greeksWarning: string;
  volatilityMatch: "align" | "neutral" | "mismatch";
  directionalMatch: "align" | "neutral" | "mismatch";
}

// Strategy characteristics definitions for matching
interface StrategySpecs {
  id: string;
  name: string;
  volBias: "long" | "short" | "neutral";
  dirBias: "bullish" | "bearish" | "neutral";
  decayType: "theta_seller" | "theta_buyer";
  riskLimit: "defined" | "undefined";
  complexity: number;
}

const STRATEGY_SPECS: Record<string, StrategySpecs> = {
  "long-call": { id: "long-call", name: "Long Call", volBias: "long", dirBias: "bullish", decayType: "theta_buyer", riskLimit: "defined", complexity: 1 },
  "long-put": { id: "long-put", name: "Long Put", volBias: "long", dirBias: "bearish", decayType: "theta_buyer", riskLimit: "defined", complexity: 1 },
  "bull-call": { id: "bull-call", name: "Bull Call Spread", volBias: "neutral", dirBias: "bullish", decayType: "theta_buyer", riskLimit: "defined", complexity: 2 },
  "bear-put": { id: "bear-put", name: "Bear Put Spread", volBias: "neutral", dirBias: "bearish", decayType: "theta_buyer", riskLimit: "defined", complexity: 2 },
  "cash-secured-put": { id: "cash-secured-put", name: "Cash Secured Put", volBias: "short", dirBias: "bullish", decayType: "theta_seller", riskLimit: "undefined", complexity: 1 },
  "credit-call": { id: "credit-call", name: "Bear Call Spread", volBias: "short", dirBias: "bearish", decayType: "theta_seller", riskLimit: "defined", complexity: 2 },
  "iron-condor": { id: "iron-condor", name: "Iron Condor", volBias: "short", dirBias: "neutral", decayType: "theta_seller", riskLimit: "defined", complexity: 3 },
  "covered-call": { id: "covered-call", name: "Covered Call", volBias: "short", dirBias: "neutral", decayType: "theta_seller", riskLimit: "undefined", complexity: 1 },
  "straddle": { id: "straddle", name: "Long Straddle", volBias: "long", dirBias: "neutral", decayType: "theta_buyer", riskLimit: "defined", complexity: 2 },
  "strangle": { id: "strangle", name: "Long Strangle", volBias: "long", dirBias: "neutral", decayType: "theta_buyer", riskLimit: "defined", complexity: 2 }
};

/**
 * Calculates option strategy suitability score (0-100) and details under active market conditions.
 */
export function evaluateStrategySuitability(
  strategyId: string,
  asset: MarketAsset
): SuitabilityResult {
  const specs = STRATEGY_SPECS[strategyId];
  if (!specs) {
    return {
      strategyId,
      strategyName: strategyId,
      score: 50,
      suitability: "NEUTRAL",
      reason: "Calibration in progress.",
      greeksWarning: "No active Greek exposure anomalies.",
      volatilityMatch: "neutral",
      directionalMatch: "neutral"
    };
  }

  let score = 50; // baseline
  let reason = "Neutral alignment. Exposure values match statistical expectations.";
  let greeksWarning = "Standard Greek exposure levels; no structural instability.";

  // 1. VOLATILITY COMPATIBILITY MATCHING
  let volMatch: "align" | "neutral" | "mismatch" = "neutral";
  
  if (asset.regime === "LOW_VOL_COMPLACENCY" || asset.regime === "VOL_COMPRESSION") {
    if (specs.volBias === "short") {
      score += 25;
      volMatch = "align";
    } else if (specs.volBias === "long") {
      score -= 30;
      volMatch = "mismatch";
    }
  } else if (asset.regime === "PANIC_EXPANSION" || asset.regime === "LIQUIDITY_SHOCK") {
    if (specs.volBias === "long") {
      score += 25;
      volMatch = "align";
    } else if (specs.volBias === "short") {
      score -= 35;
      volMatch = "mismatch";
    }
  } else if (asset.regime === "POST_EVENT_CRUSH") {
    if (specs.volBias === "short") {
      score += 35; // heavily favored
      volMatch = "align";
    } else if (specs.volBias === "long") {
      score -= 40;
      volMatch = "mismatch";
    }
  } else if (asset.regime === "EARNINGS_INSTABILITY") {
    // Defined risk spreads are preferred over naked structures
    if (specs.riskLimit === "defined" && specs.volBias === "neutral") {
      score += 15;
      volMatch = "align";
    } else if (specs.volBias === "long") {
      score += 10; // volatility expectation is rising
      volMatch = "align";
    } else if (specs.volBias === "short" && specs.riskLimit === "undefined") {
      score -= 20; // naked shorts are dangerous
      volMatch = "mismatch";
    }
  }

  // 2. DIRECTIONAL MOMENTUM MATCHING
  let dirMatch: "align" | "neutral" | "mismatch" = "neutral";
  const momentum = asset.changePct;

  if (momentum > 0.4) { // Bullish trend
    if (specs.dirBias === "bullish") {
      score += 15;
      dirMatch = "align";
    } else if (specs.dirBias === "bearish") {
      score -= 25;
      dirMatch = "mismatch";
    }
  } else if (momentum < -0.4) { // Bearish trend
    if (specs.dirBias === "bearish") {
      score += 15;
      dirMatch = "align";
    } else if (specs.dirBias === "bullish") {
      score -= 25;
      dirMatch = "mismatch";
    }
  } else { // Range-bound / neutral trend
    if (specs.dirBias === "neutral") {
      score += 10;
      dirMatch = "align";
    } else {
      score -= 5;
      dirMatch = "neutral";
    }
  }

  // 3. SPECIAL REGIME ADJUSTMENTS & TELEMETRY GENERATION
  switch (asset.regime) {
    case "PANIC_EXPANSION":
      if (specs.id === "long-put") {
        score += 15;
        reason = "Highly favored bearish geometry. Long Vega acts as a tail hedge against expanding panic.";
        greeksWarning = "Positive delta and vega synergy offset front-end theta decay.";
      } else if (specs.id === "straddle" || specs.id === "strangle") {
        score += 10;
        reason = "Favored direction-agnostic long-volatility setup. Beneficiary of rapid uncertainty migration.";
        greeksWarning = "High positive vega exposure; monitor sudden volatility contract pullbacks.";
      } else if (specs.id === "iron-condor") {
        score -= 10;
        reason = "Vulnerable. Capped credit range prone to breach from aggressive directional momentum.";
        greeksWarning = "CRITICAL: Negative gamma concentration near strike bounds; high tail exposure.";
      } else if (specs.decayType === "theta_seller" && specs.riskLimit === "undefined") {
        score -= 15;
        reason = "Hostile regime. Uncapped short volatility is exposed to tail liquidation stress.";
        greeksWarning = "DANGER: Net short gamma is highly unstable under downward spot acceleration.";
      } else {
        reason = "Exposure under stress. Implied volatility expansion increasing extrinsic option value.";
      }
      break;

    case "LOW_VOL_COMPLACENCY":
      if (specs.id === "covered-call" || specs.id === "cash-secured-put") {
        score += 10;
        reason = "Favored yield geometry. Stable spot levels maximize probability of full extrinsic capture.";
        greeksWarning = "Theta capture active; minimal downside hedge required under low vol.";
      } else if (specs.id === "iron-condor") {
        score += 15;
        reason = "Favored range-bound defined-risk strategy. Steady theta erosion inside boundaries.";
        greeksWarning = "Stable gamma footprint. Range boundaries secure under current VIX parameters.";
      } else if (specs.volBias === "long") {
        score -= 10;
        reason = "Unfavorable long-vol. Extrinsic values under quiet decay pressure; tail risk underpriced.";
        greeksWarning = "Theta erosion dragging position P&L; long vega is severely drag-penalized.";
      } else {
        reason = "Normal range alignment. Volatility index indicates quiet pricing activity.";
      }
      break;

    case "POST_EVENT_CRUSH":
      if (specs.decayType === "theta_seller") {
        score += 15;
        reason = "Highly resilient. Strategy captures rapid post-announcement extrinsic value collapse.";
        greeksWarning = "Premium decay accelerated. Short-theta capture rate at maximum efficiency.";
      } else if (specs.decayType === "theta_buyer") {
        score -= 20;
        reason = "Vulnerable. Outflow of implied volatility results in immediate capital erosion (IV Crush).";
        greeksWarning = "DANGER: Vega exposure drags pricing down; theta decay is steep near expiration.";
      }
      break;

    case "VOL_COMPRESSION":
      if (specs.id === "iron-condor" || specs.id === "credit-call") {
        score += 15;
        reason = "Favored premium selling geometry. Volatility compression speeds up options decay rate.";
        greeksWarning = "Positive theta capture active; gamma risk compression is stable.";
      } else if (specs.id === "straddle" || specs.id === "strangle") {
        score -= 15;
        reason = "Highly vulnerable. Direction-agnostic long-volatility assets are suffering from decay compression.";
        greeksWarning = "Unfavorable vega-decay. Daily theta capture draining debit value.";
      } else {
        reason = "Compression regime. Defined-risk range selling strategies favored.";
      }
      break;

    case "EARNINGS_INSTABILITY":
      if (specs.id === "bull-call" || specs.id === "bear-put") {
        score += 10;
        reason = "Favored directional spreads. Defined risk limits exposure to volatility collapse post-release.";
        greeksWarning = "Spread structure mitigates vega exposure; directional delta is dominant.";
      } else if (specs.id === "straddle") {
        score += 15;
        reason = "Aggressive long volatility. Position will profit on a large catalyst gap size.";
        greeksWarning = "High vega sensitivity. Monitor post-release implied volatility crush.";
      } else if (specs.riskLimit === "undefined" && specs.volBias === "short") {
        score -= 20;
        reason = "Critical risk. Naked short options exposed to large gap-opening tail movements.";
        greeksWarning = "DANGER: High short gamma footprint; gap exposure poses unlimited risk.";
      } else {
        reason = "Catalyst regime. Options premium inflated; defined-risk plays recommended.";
      }
      break;

    case "LIQUIDITY_SHOCK":
      if (specs.riskLimit === "defined") {
        score += 5;
        reason = "Defined risk structures preferred to isolate capital exposure under liquidity stress.";
        greeksWarning = "Capped spreads prevent unbounded gap risk losses.";
      } else {
        score -= 20;
        reason = "Hostile regime. Wide bid/ask spreads increase cost of slippage and execution.";
        greeksWarning = "Gamma instability is elevated; lack of range protection poses extreme risk.";
      }
      break;
  }

  // Clamp score
  score = Math.max(5, Math.min(95, score));

  // Determine suitability category
  let suitability: SuitabilityRating = "NEUTRAL";
  if (score >= 80) suitability = "HIGHLY_FAVORED";
  else if (score >= 65) suitability = "FAVORED";
  else if (score >= 40) suitability = "NEUTRAL";
  else if (score >= 25) suitability = "VULNERABLE";
  else suitability = "HIGHLY_VULNERABLE";

  return {
    strategyId,
    strategyName: specs.name,
    score,
    suitability,
    reason,
    greeksWarning,
    volatilityMatch: volMatch,
    directionalMatch: dirMatch
  };
}
