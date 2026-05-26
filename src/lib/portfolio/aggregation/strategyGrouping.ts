import { PositionLeg, StrategyHoldingGroup, PortfolioGreeks } from "../types/portfolioTypes";
import { calculateLegGreeks, aggregateGreeks } from "./positionAggregation";
import { bsmPrice } from "../../quant/greeks/bsm";
import { calculateStrikeIv } from "../../quant/volatility/surface";

/**
 * Intelligent strategy classifier and grouper.
 * Takes a flat array of raw position legs and groups them into recognized strategies
 * like Iron Condors, Covered Calls, Spreads, or single-leg positions.
 */
export function groupPositionsIntoStrategies(
  legs: PositionLeg[],
  spotPrices: Record<string, number>,
  ivs: Record<string, number>,
  r: number = 0.05
): StrategyHoldingGroup[] {
  const groups: StrategyHoldingGroup[] = [];
  const processedLegIds = new Set<string>();

  // 1. Group legs by ticker first
  const legsByTicker: Record<string, PositionLeg[]> = {};
  legs.forEach((leg) => {
    if (!legsByTicker[leg.ticker]) {
      legsByTicker[leg.ticker] = [];
    }
    legsByTicker[leg.ticker].push(leg);
  });

  // 2. Process each ticker independently
  Object.keys(legsByTicker).forEach((ticker) => {
    const tickerLegs = legsByTicker[ticker];
    const spot = spotPrices[ticker] || 100.0;
    const baseIv = ivs[ticker] || 0.25;

    // Separate stocks/cash from options
    const stockLegs = tickerLegs.filter((l) => l.type === "stock");
    const optionLegs = tickerLegs.filter((l) => l.type === "call" || l.type === "put");

    // Group options by expiration DTE
    const optionsByExpiry: Record<number, PositionLeg[]> = {};
    optionLegs.forEach((leg) => {
      if (!optionsByExpiry[leg.expiryDte]) {
        optionsByExpiry[leg.expiryDte] = [];
      }
      optionsByExpiry[leg.expiryDte].push(leg);
    });

    // Match multi-leg options strategies first
    Object.keys(optionsByExpiry).forEach((expiryStr) => {
      const dte = parseInt(expiryStr, 10);
      const expiryLegs = optionsByExpiry[dte].filter((l) => !processedLegIds.has(l.id));

      // A. Look for Iron Condors (4 legs: 2 calls, 2 puts)
      if (expiryLegs.length >= 4) {
        const calls = expiryLegs.filter((l) => l.type === "call").sort((a, b) => a.strike - b.strike);
        const puts = expiryLegs.filter((l) => l.type === "put").sort((a, b) => a.strike - b.strike);

        if (calls.length === 2 && puts.length === 2) {
          // Typically: short puts/calls inside, long puts/calls outside
          // e.g. Long Put (lowest), Short Put, Short Call, Long Call (highest)
          const lp = puts[0];
          const sp = puts[1];
          const sc = calls[0];
          const lc = calls[1];

          if (
            lp.side === "long" &&
            sp.side === "short" &&
            sc.side === "short" &&
            lc.side === "long"
          ) {
            const condorLegs = [lp, sp, sc, lc];
            condorLegs.forEach((l) => processedLegIds.add(l.id));
            groups.push(
              createGroup({
                ticker,
                strategyName: "Iron Condor",
                legs: condorLegs,
                spot,
                baseIv,
                r,
                bias: "neutral",
                riskScore: 45,
                color: "#f5a623",
              })
            );
          }
        }
      }

      // Re-filter remaining legs
      const remainingExpiryLegs = expiryLegs.filter((l) => !processedLegIds.has(l.id));

      // B. Look for Spreads and Straddles/Strangles (2 legs)
      for (let i = 0; i < remainingExpiryLegs.length; i++) {
        for (let j = i + 1; j < remainingExpiryLegs.length; j++) {
          const leg1 = remainingExpiryLegs[i];
          const leg2 = remainingExpiryLegs[j];

          if (processedLegIds.has(leg1.id) || processedLegIds.has(leg2.id)) continue;

          // B1. Straddle: Call + Put at same strike
          if (leg1.strike === leg2.strike && leg1.type !== leg2.type) {
            const straddleLegs = [leg1, leg2];
            straddleLegs.forEach((l) => processedLegIds.add(l.id));
            groups.push(
              createGroup({
                ticker,
                strategyName: "Straddle",
                legs: straddleLegs,
                spot,
                baseIv,
                r,
                bias: leg1.side === "long" ? "volatile" : "neutral",
                riskScore: leg1.side === "long" ? 70 : 85,
                color: leg1.side === "long" ? "#a855f7" : "#00d4ff",
              })
            );
          }
          // B2. Spreads: same type, different strikes
          else if (leg1.type === leg2.type) {
            const sorted = [leg1, leg2].sort((a, b) => a.strike - b.strike);
            const low = sorted[0];
            const high = sorted[1];

            if (low.side !== high.side) {
              let strat = "";
              let bias: "bullish" | "bearish" = "bullish";
              let risk = 35;
              let color = "#00e5a0";

              if (low.type === "call") {
                // Bull Call Spread: long lower, short higher
                if (low.side === "long" && high.side === "short") {
                  strat = "Bull Call Spread";
                  bias = "bullish";
                  color = "#00e5a0";
                } else {
                  strat = "Bear Call Spread";
                  bias = "bearish";
                  color = "#ff4d6a";
                }
              } else {
                // Bear Put Spread: short lower, long higher
                if (low.side === "short" && high.side === "long") {
                  strat = "Bear Put Spread";
                  bias = "bearish";
                  color = "#ff4d6a";
                } else {
                  strat = "Bull Put Spread";
                  bias = "bullish";
                  color = "#00e5a0";
                }
              }

              const spreadLegs = [low, high];
              spreadLegs.forEach((l) => processedLegIds.add(l.id));
              groups.push(
                createGroup({
                  ticker,
                  strategyName: strat,
                  legs: spreadLegs,
                  spot,
                  baseIv,
                  r,
                  bias,
                  riskScore: risk,
                  color,
                })
              );
            }
          }
        }
      }
    });

    // C. Check Covered Calls or Protective Puts by matching remaining options with stock
    const remainingOptions = optionLegs.filter((l) => !processedLegIds.has(l.id));
    const remainingStocks = stockLegs.filter((l) => !processedLegIds.has(l.id));

    remainingStocks.forEach((stockLeg) => {
      if (processedLegIds.has(stockLeg.id)) return;

      // Covered Call: Long Stock + Short Call
      const ccMatch = remainingOptions.find(
        (o) => o.type === "call" && o.side === "short" && !processedLegIds.has(o.id)
      );
      if (ccMatch && stockLeg.side === "long") {
        const ccLegs = [stockLeg, ccMatch];
        ccLegs.forEach((l) => processedLegIds.add(l.id));
        groups.push(
          createGroup({
            ticker,
            strategyName: "Covered Call",
            legs: ccLegs,
            spot,
            baseIv,
            r,
            bias: "neutral",
            riskScore: 20,
            color: "#00d4ff",
          })
        );
        return;
      }

      // Protective Put: Long Stock + Long Put
      const ppMatch = remainingOptions.find(
        (o) => o.type === "put" && o.side === "long" && !processedLegIds.has(o.id)
      );
      if (ppMatch && stockLeg.side === "long") {
        const ppLegs = [stockLeg, ppMatch];
        ppLegs.forEach((l) => processedLegIds.add(l.id));
        groups.push(
          createGroup({
            ticker,
            strategyName: "Protective Put",
            legs: ppLegs,
            spot,
            baseIv,
            r,
            bias: "bearish",
            riskScore: 25,
            color: "#ff4d6a",
          })
        );
        return;
      }
    });

    // D. Leftovers are grouped into single-leg positions
    tickerLegs.forEach((leg) => {
      if (processedLegIds.has(leg.id)) return;
      processedLegIds.add(leg.id);

      let strat = "Long Stock";
      let bias: "bullish" | "bearish" | "neutral" | "volatile" = "bullish";
      let risk = 30;
      let color = "#00e5a0";

      if (leg.type === "stock") {
        strat = leg.side === "long" ? "Long Stock" : "Short Stock";
        bias = leg.side === "long" ? "bullish" : "bearish";
        risk = leg.side === "long" ? 25 : 65;
        color = leg.side === "long" ? "#00e5a0" : "#ff4d6a";
      } else if (leg.type === "cash") {
        strat = "Cash Account";
        bias = "neutral";
        risk = 0;
        color = "#a855f7";
      } else {
        strat = `${leg.side === "long" ? "Long" : "Short"} ${leg.type === "call" ? "Call" : "Put"}`;
        bias =
          leg.type === "call"
            ? leg.side === "long"
              ? "bullish"
              : "bearish"
            : leg.side === "long"
            ? "bearish"
            : "bullish";
        risk = leg.side === "long" ? 40 : 80;
        color = bias === "bullish" ? "#00e5a0" : "#ff4d6a";
      }

      groups.push(
        createGroup({
          ticker,
          strategyName: strat,
          legs: [leg],
          spot,
          baseIv,
          r,
          bias,
          riskScore: risk,
          color,
        })
      );
    });
  });

  return groups;
}

/**
 * Helper to construct a StrategyHoldingGroup, netting leg prices and Greeks.
 */
function createGroup(params: {
  ticker: string;
  strategyName: string;
  legs: PositionLeg[];
  spot: number;
  baseIv: number;
  r: number;
  bias: "bullish" | "bearish" | "neutral" | "volatile";
  riskScore: number;
  color: string;
}): StrategyHoldingGroup {
  const { ticker, strategyName, legs, spot, baseIv, r, bias, riskScore, color } = params;

  // Aggregate Greeks
  const legGreeks = legs.map((leg) => {
    // calculate strike specific IV
    const strikeIv = calculateStrikeIv(
      spot,
      leg.strike,
      leg.expiryDte,
      baseIv * 100,
      0.18,
      -0.35,
      false
    );
    return calculateLegGreeks(leg, spot, strikeIv, r);
  });
  const greeks = aggregateGreeks(legGreeks);

  // Compute Cost Basis and Current Value
  let costBasis = 0;
  let currentValue = 0;

  legs.forEach((leg) => {
    const qty = leg.quantity;
    const sign = leg.side === "long" ? 1 : -1;

    if (leg.type === "stock") {
      // Stock cost is raw entry price times shares
      costBasis += leg.entryPrice * qty * sign;
      currentValue += spot * qty * sign;
    } else {
      // Option cost is premium per contract times 100
      costBasis += leg.entryPrice * qty * sign * 100;
      
      const strikeIv = calculateStrikeIv(
        spot,
        leg.strike,
        leg.expiryDte,
        baseIv * 100,
        0.18,
        -0.35,
        false
      );
      
      const price = bsmPrice(spot, leg.strike, leg.expiryDte / 365, strikeIv, r, leg.type as "call" | "put");
      currentValue += price * qty * sign * 100;
    }
  });

  const pnl = currentValue - costBasis;
  const pnlPct = costBasis !== 0 ? (pnl / Math.abs(costBasis)) * 100 : 0;
  const status = pnl > 1 ? "profit" : pnl < -1 ? "loss" : "flat";

  // Build Strikes Display String
  let strikes = "";
  if (strategyName === "Iron Condor" && legs.length === 4) {
    strikes = `${legs[0].strike}/${legs[1].strike}/${legs[2].strike}/${legs[3].strike}`;
  } else if (legs.length === 2) {
    strikes = legs[0].strike === legs[1].strike ? `${legs[0].strike} ATM` : `${legs[0].strike}/${legs[1].strike}`;
  } else if (legs[0].type !== "stock") {
    strikes = `${legs[0].strike} ${legs[0].type === "call" ? "Call" : "Put"}`;
  } else {
    strikes = "Equity Spot";
  }

  // Group properties
  const sectorMap: Record<string, string> = {
    SPY: "Index",
    QQQ: "Index",
    AAPL: "Technology",
    MSFT: "Technology",
    NVDA: "Technology",
    TSLA: "EV/Auto",
    GLD: "Commodities",
  };
  const sector = sectorMap[ticker] || "Diversified";

  const daysToExpiry = Math.max(...legs.map((l) => l.expiryDte));

  return {
    id: `g-${ticker}-${strategyName.toLowerCase().replace(/ /g, "-")}-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    ticker,
    strategyName,
    legs,
    quantity: Math.max(...legs.map((l) => l.quantity)),
    costBasis: Math.round(costBasis * 100) / 100,
    currentValue: Math.round(currentValue * 100) / 100,
    pnl: Math.round(pnl * 100) / 100,
    pnlPct: Math.round(pnlPct * 10) / 10,
    status,
    bias,
    greeks,
    strikes,
    daysToExpiry,
    sector,
    riskScore,
    color,
  };
}
