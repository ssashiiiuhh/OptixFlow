import { ThesisInput, StrategyIntelResult } from "./types";

const STRATEGY_SPECS = [
  { id: "long_call", name: "Long Call", complexity: "BASIC", volBias: "long" },
  { id: "long_put", name: "Long Put", complexity: "BASIC", volBias: "long" },
  { id: "bull_call_spread", name: "Bull Call Spread", complexity: "INTERMEDIATE", volBias: "long" },
  { id: "bear_put_spread", name: "Bear Put Spread", complexity: "INTERMEDIATE", volBias: "long" },
  { id: "iron_condor", name: "Iron Condor", complexity: "ADVANCED", volBias: "short" },
  { id: "long_straddle", name: "Long Straddle", complexity: "INTERMEDIATE", volBias: "long" },
  { id: "covered_call", name: "Covered Call", complexity: "BASIC", volBias: "short" },
  { id: "cash_secured_put", name: "Cash Secured Put", complexity: "BASIC", volBias: "short" }
] as const;

/**
 * Evaluates strategy fit scores and telemetry based on a user thesis.
 */
export function evaluateThesisIntel(thesis: ThesisInput, spotPrice: number = 100): StrategyIntelResult[] {
  return STRATEGY_SPECS.map((spec) => {
    let score = 50; // baseline
    const logs: string[] = [];
    
    // Greeks simulation model (relative to $100 contracts)
    let delta = 0;
    let gamma = 0;
    let theta = 0;
    let vega = 0;

    // 1. DIRECTIONAL MATCHING
    if (thesis.direction === "bullish") {
      if (spec.id === "long_call") {
        score += 25;
        delta = 0.55; gamma = 0.035; theta = -3.5; vega = 12.0;
        logs.push("DIR_ALIGN: Long delta provides clean upside equity participation.");
      } else if (spec.id === "bull_call_spread") {
        score += 30;
        delta = 0.38; gamma = 0.015; theta = -1.2; vega = 4.5;
        logs.push("DIR_ALIGN: Debit spread cap mitigates premium decay pressure.");
      } else if (spec.id === "cash_secured_put") {
        score += 15;
        delta = 0.32; gamma = -0.018; theta = 2.4; vega = -8.0;
        logs.push("DIR_ALIGN: Short put matches neutral-bullish accumulation thesis.");
      } else if (spec.id === "covered_call") {
        score += 10;
        delta = 0.40; gamma = -0.012; theta = 1.8; vega = -6.0;
        logs.push("DIR_ALIGN: Covered call provides modest bullish growth yield.");
      } else if (spec.id === "long_put" || spec.id === "bear_put_spread") {
        score -= 40;
        logs.push("DIR_MISMATCH: Bearish structure directly violates bullish outlook.");
      } else {
        score -= 15;
        logs.push("DIR_NEUTRAL: Neutral structure limits capture on positive directional breakout.");
      }
    } else if (thesis.direction === "bearish") {
      if (spec.id === "long_put") {
        score += 25;
        delta = -0.52; gamma = 0.032; theta = -3.2; vega = 11.5;
        logs.push("DIR_ALIGN: Long put delta gains from downward spot acceleration.");
      } else if (spec.id === "bear_put_spread") {
        score += 30;
        delta = -0.35; gamma = 0.012; theta = -1.0; vega = 4.0;
        logs.push("DIR_ALIGN: Bear spread limits risk while expressing negative outlook.");
      } else if (spec.id === "long_call" || spec.id === "bull_call_spread" || spec.id === "cash_secured_put") {
        score -= 40;
        logs.push("DIR_MISMATCH: Bullish structure directly penalised under bearish outlook.");
      } else {
        score -= 15;
        logs.push("DIR_NEUTRAL: Neutral bounds vulnerable to downward pressure.");
      }
    } else if (thesis.direction === "neutral") {
      if (spec.id === "iron_condor") {
        score += 35;
        delta = 0.02; gamma = -0.025; theta = 4.8; vega = -15.0;
        logs.push("DIR_ALIGN: Range trade structure matches low directional expectations.");
      } else if (spec.id === "covered_call") {
        score += 20;
        delta = 0.42; gamma = -0.010; theta = 1.9; vega = -5.0;
        logs.push("DIR_ALIGN: Covered call generates yield during range-bound tape.");
      } else if (spec.id === "cash_secured_put") {
        score += 15;
        delta = 0.30; gamma = -0.015; theta = 2.2; vega = -7.5;
        logs.push("DIR_ALIGN: Premium income active under quiet support conditions.");
      } else {
        score -= 25;
        logs.push("DIR_MISMATCH: Directional positioning is penalised in range-bound environments.");
      }
    } else if (thesis.direction === "volatile") {
      if (spec.id === "long_straddle") {
        score += 35;
        delta = 0.05; gamma = 0.065; theta = -7.2; vega = 24.0;
        logs.push("DIR_ALIGN: Straddle benefits from breakout magnitude regardless of vector.");
      } else if (spec.id === "long_call" || spec.id === "long_put") {
        score += 12;
        logs.push("DIR_PARTIAL: Long option benefits from extreme breakout, but is vector-dependent.");
      } else {
        score -= 40;
        logs.push("DIR_MISMATCH: Range-bound premium selling faces high breach probability under vol.");
      }
    }

    // 2. MAGNITUDE FIT
    if (thesis.magnitude === "large") {
      if (spec.id === "long_straddle") {
        score += 15;
        logs.push("MAG_ALIGN: High convexity captures uncapped breakout profit.");
      } else if (spec.id === "long_call" || spec.id === "long_put") {
        score += 10;
        logs.push("MAG_ALIGN: Linear leverage fits massive expected move.");
      } else if (spec.id === "covered_call" || spec.id === "cash_secured_put") {
        score -= 20;
        logs.push("MAG_MISMATCH: Capped upside limits growth capture under large moves.");
      }
    } else if (thesis.magnitude === "small") {
      if (spec.id === "iron_condor") {
        score += 15;
        logs.push("MAG_ALIGN: Small expected range preserves option boundary safety.");
      } else if (spec.id === "long_straddle") {
        score -= 25;
        logs.push("MAG_MISMATCH: Straddle will decay to loss without significant spot shift.");
      }
    }

    // 3. IV OUTLOOK FIT
    if (thesis.ivExpectation === "expansion") {
      if (spec.volBias === "long") {
        score += 20;
        logs.push("VOL_ALIGN: Long vega exposure matches expanding implied volatility.");
      } else if (spec.volBias === "short") {
        score -= 30;
        logs.push("VOL_MISMATCH: Short premium penalised under volatility expansion.");
      }
    } else if (thesis.ivExpectation === "crush") {
      if (spec.id === "iron_condor" || spec.id === "covered_call" || spec.id === "cash_secured_put") {
        score += 25;
        logs.push("VOL_ALIGN: Premium crash speeds up option value erosion in your favor.");
      } else if (spec.id === "long_straddle" || spec.id === "long_call" || spec.id === "long_put") {
        score -= 35;
        logs.push("VOL_MISMATCH: Long premium structures highly vulnerable to IV Crush post-event.");
      }
    }

    // 4. HORIZON & DTE EFFECTIVITY
    if (thesis.horizon === 7 || thesis.horizon === 14) {
      if (spec.id === "iron_condor" || spec.id === "covered_call" || spec.id === "cash_secured_put") {
        score += 15;
        logs.push("DTE_ALIGN: Short-term horizon captures rapid theta decay acceleration.");
      } else if (spec.id === "long_call" || spec.id === "long_put" || spec.id === "long_straddle") {
        score -= 15;
        logs.push("DTE_MISMATCH: Long options penalised near expiry due to steep theta cliff.");
      }
    } else if (thesis.horizon === 60) {
      if (spec.id === "long_call" || spec.id === "long_put" || spec.id === "bull_call_spread" || spec.id === "bear_put_spread") {
        score += 12;
        logs.push("DTE_ALIGN: Extended DTE preserves option optionality and slows decay.");
      }
    }

    // 5. RISK APPETITE MATCHING
    if (thesis.riskAppetite === "defined") {
      if (spec.id === "bull_call_spread" || spec.id === "bear_put_spread" || spec.id === "iron_condor") {
        score += 15;
        logs.push("RISK_ALIGN: Spread structure caps absolute losses to defined thresholds.");
      } else if (spec.id === "cash_secured_put" || spec.id === "covered_call") {
        score -= 10;
        logs.push("RISK_WARNING: Collateral assignment risk present in short options.");
      }
    } else if (thesis.riskAppetite === "aggressive") {
      if (spec.id === "long_straddle" || spec.id === "long_call" || spec.id === "long_put") {
        score += 15;
        logs.push("RISK_ALIGN: Uncapped leverage fits aggressive risk tolerance profile.");
      }
    }

    // Clamp score
    score = Math.max(5, Math.min(95, score));

    // Determine confidence
    let confidence: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
    if (score >= 80) confidence = "HIGH";
    else if (score < 40) confidence = "LOW";

    // Dynamic reasoning statement
    let reasoning = "";
    if (score >= 75) {
      reasoning = `Highly optimized. Matches directional vector (${thesis.direction}) and leverages ${thesis.ivExpectation === "expansion" ? "long vega" : "short theta"} characteristics.`;
    } else if (score >= 50) {
      reasoning = "Moderate alignment. Structure matches primary thesis but is exposed to moderate decay or range drag.";
    } else {
      reasoning = `Hostile alignment. Risk factors (such as ${spec.id.includes("long") ? "theta decay" : "unlimited tail exposure"}) conflict with outlook parameters.`;
    }

    // Dynamic regime compatibility remarks
    let regimeCompatibility = "Neutral footprint.";
    if (thesis.ivExpectation === "expansion" && spec.id.includes("long")) {
      regimeCompatibility = "Resilient under uncertainty expansion.";
    } else if (thesis.ivExpectation === "crush" && !spec.id.includes("long")) {
      regimeCompatibility = "Favored under post-event compression.";
    } else if (thesis.direction === "neutral" && spec.id === "iron_condor") {
      regimeCompatibility = "Optimized for complacency regimes.";
    }

    return {
      id: spec.id,
      name: spec.name,
      score,
      confidence,
      complexity: spec.complexity as any,
      regimeCompatibility,
      greekProfile: {
        delta: Number(delta.toFixed(3)),
        gamma: Number(gamma.toFixed(4)),
        theta: Number(theta.toFixed(2)),
        vega: Number(vega.toFixed(2))
      },
      reasoning,
      telemetryLogs: logs
    };
  });
}
