import { normCDF } from "./distributions";
import { ProbabilityCone } from "./types";

/**
 * Calculates standard analytical Probability of Profit (POP).
 */
export function calculatePOP(
  strategyName: string,
  spot: number,
  strike: number,
  t: number,
  iv: number,
  r: number = 0.05,
  initialValue: number,
  spreadWidth: number = 5
): number {
  let pop = 50;
  const time = Math.max(1e-5, t);

  if (strategyName === "Long Call" || strategyName === "Cash Secured Put") {
    const breakeven = strike + initialValue;
    const d2 = (Math.log(spot / breakeven) + (r - 0.5 * iv * iv) * time) / (iv * Math.sqrt(time));
    pop = normCDF(d2) * 100;
  } else if (strategyName === "Long Put") {
    const breakeven = strike - initialValue;
    const d2 = (Math.log(spot / breakeven) + (r - 0.5 * iv * iv) * time) / (iv * Math.sqrt(time));
    pop = (1 - normCDF(d2)) * 100;
  } else if (strategyName === "Bull Call Spread") {
    const breakeven = strike + initialValue;
    const d2 = (Math.log(spot / breakeven) + (r - 0.5 * iv * iv) * time) / (iv * Math.sqrt(time));
    pop = normCDF(d2) * 100;
  } else if (strategyName === "Bear Put Spread") {
    const breakeven = strike - initialValue;
    const d2 = (Math.log(spot / breakeven) + (r - 0.5 * iv * iv) * time) / (iv * Math.sqrt(time));
    pop = (1 - normCDF(d2)) * 100;
  } else if (strategyName === "Covered Call") {
    const breakeven = initialValue;
    const d2 = (Math.log(spot / breakeven) + (r - 0.5 * iv * iv) * time) / (iv * Math.sqrt(time));
    pop = normCDF(d2) * 100;
  } else if (strategyName === "Long Straddle") {
    const beUpper = strike + initialValue;
    const beLower = strike - initialValue;
    const d2Upper = (Math.log(spot / beUpper) + (r - 0.5 * iv * iv) * time) / (iv * Math.sqrt(time));
    const d2Lower = (Math.log(spot / beLower) + (r - 0.5 * iv * iv) * time) / (iv * Math.sqrt(time));
    pop = (normCDF(d2Upper) + (1 - normCDF(d2Lower))) * 100;
  } else if (strategyName === "Iron Condor") {
    const credit = -initialValue;
    const beUpper = strike + spreadWidth + credit;
    const beLower = strike - spreadWidth - credit;
    const d2Upper = (Math.log(spot / beUpper) + (r - 0.5 * iv * iv) * time) / (iv * Math.sqrt(time));
    const d2Lower = (Math.log(spot / beLower) + (r - 0.5 * iv * iv) * time) / (iv * Math.sqrt(time));
    pop = (normCDF(d2Upper) - normCDF(d2Lower)) * 100;
  }

  return Math.max(5, Math.min(95, pop));
}

/**
 * Generates statistical standard deviation price bands (probability cones) over time.
 */
export function generateProbabilityCone(
  spot: number,
  iv: number,
  dte: number,
  stepsCount: number = 10
): ProbabilityCone[] {
  const cones: ProbabilityCone[] = [];
  const totalDays = dte;

  for (let i = 1; i <= stepsCount; i++) {
    const currentDte = (totalDays / stepsCount) * i;
    const t = currentDte / 365;
    const oneStdDev = spot * iv * Math.sqrt(t);
    const twoStdDev = 2 * oneStdDev;

    cones.push({
      dte: Math.round(currentDte * 10) / 10,
      oneStdDev: Math.round(oneStdDev * 100) / 100,
      twoStdDev: Math.round(twoStdDev * 100) / 100,
      upper1Sigma: Math.round((spot + oneStdDev) * 100) / 100,
      lower1Sigma: Math.round((spot - oneStdDev) * 100) / 100,
      upper2Sigma: Math.round((spot + twoStdDev) * 100) / 100,
      lower2Sigma: Math.round((spot - twoStdDev) * 100) / 100,
    });
  }

  return cones;
}
