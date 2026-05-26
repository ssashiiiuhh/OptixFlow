import { StrategyHoldingGroup, StressScenarioResult, PortfolioGreeks } from "../types/portfolioTypes";
import { revalueStrategyHolding } from "../stress/shockModels";
import { aggregateGreeks } from "../aggregation/positionAggregation";

/**
 * Runs pre-packaged deterministic stress scenarios across all portfolio holdings.
 * Simulates systemic market shocks (Crash, Vol Spike, Earnings crush, Time decay).
 */
export function runDeterministicScenarios(
  holdings: StrategyHoldingGroup[],
  spotPrices: Record<string, number>,
  ivs: Record<string, number>
): StressScenarioResult[] {
  
  // Define standard institutional scenarios
  const scenariosConfig = [
    {
      id: "crash",
      label: "Market Crash",
      description: "S&P −10% drawdown in 5 days",
      spotChange: -10, // percentage change
      ivChange: 35,    // percentage change
      dteShift: 5,
      skewShift: 0.20,
    },
    {
      id: "vol_spike",
      label: "Volatility Spike",
      description: "VIX jumps to 35 without large price move",
      spotChange: 0,
      ivChange: 50,
      dteShift: 0,
      skewShift: 0.15,
    },
    {
      id: "earnings",
      label: "Earnings Event",
      description: "Portfolio-wide earnings catalyst +5% rally",
      spotChange: 5,
      ivChange: -30,
      dteShift: 1,
      skewShift: -0.10,
    },
    {
      id: "sideways",
      label: "Theta Decay",
      description: "15 calendar days pass, market flat",
      spotChange: 0,
      ivChange: 0,
      dteShift: 15,
      skewShift: 0,
    },
  ];

  return scenariosConfig.map((sc) => {
    let totalPnlImpact = 0;
    const holdingImpacts: Record<string, number> = {};
    const shiftedGreeksList: PortfolioGreeks[] = [];
    const fragilityAlerts: string[] = [];

    holdings.forEach((h) => {
      const spot = spotPrices[h.ticker] || 100.0;
      const iv = ivs[h.ticker] || 0.25;

      const revalued = revalueStrategyHolding(h, spot, iv, {
        spotShiftPct: sc.spotChange / 100,
        ivShiftPct: sc.ivChange / 100,
        dteShiftDays: sc.dteShift,
        skewShift: sc.skewShift,
      });

      totalPnlImpact += revalued.pnlImpact;
      holdingImpacts[h.id] = Math.round(revalued.pnlImpact);
      shiftedGreeksList.push(revalued.shiftedGreeks);

      // Check holding specific fragility flags
      if (revalued.pnlImpact < -h.costBasis * 0.50) {
        fragilityAlerts.push(`${h.ticker} ${h.strategyName} loss exceeds 50% of cost basis.`);
      }
    });

    const netShiftedGreeks = aggregateGreeks(shiftedGreeksList);

    // Add portfolio-level fragility assertions
    if (sc.id === "crash" && totalPnlImpact < 0 && Math.abs(totalPnlImpact) > 4000) {
      fragilityAlerts.push("Portfolio shows high vulnerability to systemic asset drawdowns.");
    }
    if (sc.id === "vol_spike" && netShiftedGreeks.vega < 0) {
      fragilityAlerts.push("Short-Vega concentration leads to tail losses under IV spikes.");
    }

    return {
      id: sc.id,
      label: sc.label,
      description: sc.description,
      pnlImpact: Math.round(totalPnlImpact),
      ivChange: sc.ivChange,
      spotChange: sc.spotChange,
      holdingImpacts,
      shiftedGreeks: netShiftedGreeks,
      fragilityAlerts,
    };
  });
}
