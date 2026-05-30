import { SVISlice, sviVariance } from "./svi";

/**
 * Validates the Durrleman condition (Butterfly Arbitrage) for a given SVI slice.
 * The condition is g(k) >= 0.
 *
 * g(k) = (1 - (k * w'(k)) / (2 * w(k)))^2 - (w'(k)^2 / 4) * (1 / w(k) + 1/4) + w''(k) / 2
 *
 * @param k - Log-moneyness
 * @param slice - SVI parameters
 * @returns violationMagnitude (0 if no violation, > 0 if violated)
 */
export function butterflyViolation(k: number, slice: SVISlice): number {
  const { a, b, rho, m, sigma } = slice;
  const k_minus_m = k - m;
  const sqrt_term = Math.sqrt(k_minus_m * k_minus_m + sigma * sigma);
  
  const w = a + b * (rho * k_minus_m + sqrt_term);
  if (w <= 0) return Math.abs(w) + 1; // Negative variance is a severe violation

  const w_prime = b * (rho + k_minus_m / sqrt_term);
  const w_double_prime = b * (sigma * sigma) / Math.pow(sqrt_term, 3);

  const term1 = 1 - (k * w_prime) / (2 * w);
  const term2 = (w_prime * w_prime / 4) * (1 / w + 0.25);
  const term3 = w_double_prime / 2;

  const g_k = term1 * term1 - term2 + term3;

  return g_k >= 0 ? 0 : -g_k;
}

/**
 * Validates the Calendar Arbitrage condition.
 * Total variance must be non-decreasing with time: w(k, T2) >= w(k, T1) for T2 > T1.
 *
 * @param w1 - Total variance at T1
 * @param w2 - Total variance at T2 (where T2 > T1)
 * @returns violationMagnitude (0 if no violation, > 0 if violated)
 */
export function calendarViolation(w1: number, w2: number): number {
  return w2 >= w1 ? 0 : w1 - w2;
}
