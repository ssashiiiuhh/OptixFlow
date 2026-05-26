import { StrategyHoldingGroup } from "../types/portfolioTypes";

export interface FragilityZone {
  ticker: string;
  strike: number;
  gammaExposure: number; // local net negative gamma
  proximityPct: number;  // distance to spot price
  dte: number;
  riskSeverity: "extreme" | "elevated" | "low";
}

/**
 * Maps negative gamma "fragility zones" across options strikes to locate price level points
 * where delta acceleration risk is highly concentrated.
 */
export function generateFragilityMap(
  holdings: StrategyHoldingGroup[],
  spotPrices: Record<string, number>
): FragilityZone[] {
  const zones: FragilityZone[] = [];

  holdings.forEach((h) => {
    const spot = spotPrices[h.ticker] || 100.0;
    
    // Group options by strike to net out local strikes
    const strikeNetGamma: Record<number, { gamma: number; dte: number }> = {};

    h.legs.forEach((leg) => {
      if (leg.type === "call" || leg.type === "put") {
        // Individual leg gamma
        // Short option has negative gamma; long option has positive gamma
        const sign = leg.side === "long" ? 1 : -1;
        const gVal = (h.greeks.gamma / h.legs.length) * sign; // estimate proportion
        
        if (!strikeNetGamma[leg.strike]) {
          strikeNetGamma[leg.strike] = { gamma: 0, dte: leg.expiryDte };
        }
        strikeNetGamma[leg.strike].gamma += gVal;
      }
    });

    Object.entries(strikeNetGamma).forEach(([strikeStr, data]) => {
      const strike = parseFloat(strikeStr);
      
      // If Net Gamma is negative, it represents a fragility zone
      if (data.gamma < 0) {
        const proximityPct = Math.round((Math.abs(strike - spot) / spot) * 1000) / 10;
        
        let severity: "extreme" | "elevated" | "low" = "low";
        if (proximityPct <= 3.5 && data.dte <= 7) {
          severity = "extreme";
        } else if (proximityPct <= 7.0 && data.dte <= 30) {
          severity = "elevated";
        }

        zones.push({
          ticker: h.ticker,
          strike,
          gammaExposure: Math.round(data.gamma * 10000) / 10000,
          proximityPct,
          dte: data.dte,
          riskSeverity: severity,
        });
      }
    });
  });

  return zones.sort((a, b) => {
    // Sort by severity first, then proximity
    const severityWeight = { extreme: 3, elevated: 2, low: 1 };
    if (severityWeight[a.riskSeverity] !== severityWeight[b.riskSeverity]) {
      return severityWeight[b.riskSeverity] - severityWeight[a.riskSeverity];
    }
    return a.proximityPct - b.proximityPct;
  });
}
