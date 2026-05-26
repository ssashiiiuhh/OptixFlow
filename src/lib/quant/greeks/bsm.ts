import { normCDF, normPDF } from "../probability/distributions";
import { GreekSet } from "./types";

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
 * Calculates analytical Greeks (Delta, Gamma, Theta, Vega, Rho) using Black-Scholes.
 */
export function bsmGreeks(
  spot: number,
  strike: number,
  t: number,
  iv: number,
  r: number = 0.05,
  type: "call" | "put"
): GreekSet {
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
      vega: 0,
      rho: 0
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

  // Rho: derivative with respect to interest rate r (scaled for 1% rate change)
  const rho = type === "call"
    ? (kClamped * t * Math.exp(-r * t) * normCDF(d2)) / 100
    : (-kClamped * t * Math.exp(-r * t) * normCDF(-d2)) / 100;

  return { delta, gamma, theta, vega, rho };
}
