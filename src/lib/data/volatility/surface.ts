import { LiveOptionChain, LiveVolatilitySurface } from "../types";

/**
 * Builds a dynamic volatility surface, term structure, and skew curve from live options chain data.
 */
export function buildVolatilitySurface(
  chain: LiveOptionChain,
  historicalIvs?: number[]
): LiveVolatilitySurface {
  const ticker = chain.ticker;
  const underlierPrice = chain.underlierPrice;
  const contracts = chain.contracts;

  if (contracts.length === 0) {
    return {
      ticker,
      baseIv: 0.20,
      ivRank: 50,
      ivPercentile: 50,
      termStructure: [],
      skewPoints: [],
      meshPoints: [],
    };
  }

  // 1. Mesh Points: all strikes and expirations mapped
  const meshPoints = contracts.map((c) => ({
    strike: c.strike,
    dte: c.dte,
    iv: c.iv,
  }));

  // 2. Term Structure: Average ATM IV grouped by DTE
  const dteGroups = new Map<number, number[]>();
  contracts.forEach((c) => {
    // ATM defined as strike within 5% of underlier price
    const isAtm = Math.abs(c.strike - underlierPrice) / underlierPrice <= 0.05;
    if (isAtm) {
      if (!dteGroups.has(c.dte)) {
        dteGroups.set(c.dte, []);
      }
      dteGroups.get(c.dte)!.push(c.iv);
    }
  });

  const termStructure = Array.from(dteGroups.entries())
    .map(([dte, ivs]) => {
      const avgIv = ivs.reduce((a, b) => a + b, 0) / ivs.length;
      return { dte, iv: Math.round(avgIv * 100) / 100 };
    })
    .sort((a, b) => a.dte - b.dte);

  // 3. Base IV (30-day IV estimate)
  // Interpolate/extrapolate ATM IV to 30 days
  let baseIv = 0.20;
  if (termStructure.length > 0) {
    // find closest DTE to 30
    const closest = termStructure.reduce((prev, curr) =>
      Math.abs(curr.dte - 30) < Math.abs(prev.dte - 30) ? curr : prev
    );
    baseIv = closest.iv;
  } else {
    // Fallback to average of all contracts IV
    const sumIv = contracts.reduce((sum, c) => sum + c.iv, 0);
    baseIv = sumIv / contracts.length;
  }

  // 4. Skew Points: Select the closest expiration to 30 DTE and list strikes vs IV
  let skewPoints: { strike: number; iv: number; dte: number }[] = [];
  if (termStructure.length > 0) {
    const closestDte = termStructure.reduce((prev, curr) =>
      Math.abs(curr.dte - 30) < Math.abs(prev.dte - 30) ? curr : prev
    ).dte;

    // Filter calls for this DTE (to avoid double strike entries)
    skewPoints = contracts
      .filter((c) => c.dte === closestDte && c.type === "call")
      .map((c) => ({
        strike: c.strike,
        iv: c.iv,
        dte: c.dte,
      }))
      .sort((a, b) => a.strike - b.strike);
  }

  // 5. IV Rank & IV Percentile calculation
  let ivRank = 50;
  let ivPercentile = 50;

  const resolvedHist = historicalIvs && historicalIvs.length > 0
    ? historicalIvs
    : getFallbackHistoricalIvs(ticker, baseIv);

  if (resolvedHist.length > 0) {
    const min = Math.min(...resolvedHist);
    const max = Math.max(...resolvedHist);
    
    // Rank: percentage of current IV inside min-max range
    ivRank = max > min ? Math.round(((baseIv - min) / (max - min)) * 100) : 50;
    ivRank = Math.max(0, Math.min(100, ivRank));

    // Percentile: % of trading days in the past where IV was below current baseIv
    const belowCount = resolvedHist.filter((val) => val < baseIv).length;
    ivPercentile = Math.round((belowCount / resolvedHist.length) * 100);
    ivPercentile = Math.max(0, Math.min(100, ivPercentile));
  }

  return {
    ticker,
    baseIv: Math.round(baseIv * 100) / 100,
    ivRank,
    ivPercentile,
    termStructure,
    skewPoints,
    meshPoints,
  };
}

/**
 * Fallback generator for historical IVs if no long-term historical feed is available.
 * Generates a normal distribution around baseline volatility parameters.
 */
function getFallbackHistoricalIvs(ticker: string, currentIv: number): number[] {
  let baseline = 0.20;
  let stdDev = 0.05;

  switch (ticker.toUpperCase()) {
    case "SPY":
      baseline = 0.15;
      stdDev = 0.03;
      break;
    case "AAPL":
      baseline = 0.26;
      stdDev = 0.06;
      break;
    case "NVDA":
      baseline = 0.48;
      stdDev = 0.12;
      break;
    case "TSLA":
      baseline = 0.45;
      stdDev = 0.10;
      break;
    case "IWM":
      baseline = 0.20;
      stdDev = 0.04;
      break;
  }

  // Generate 252 simulated trading days of historical IV values
  const history: number[] = [];
  for (let i = 0; i < 252; i++) {
    // Box-Muller transform for normal distribution
    const u1 = Math.random() || 0.0001;
    const u2 = Math.random() || 0.0001;
    const randStd = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    
    // Auto-regressive component pulling towards baseline
    const iv = baseline + randStd * stdDev;
    history.push(Math.max(0.05, iv));
  }

  // Ensure current IV is part of the distribution
  history[0] = currentIv;
  return history;
}
