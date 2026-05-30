export interface SVISlice {
  T: number;      // Time to expiration in years
  a: number;      // Level
  b: number;      // Slope
  rho: number;    // Correlation (-1 to 1)
  m: number;      // Translation
  sigma: number;  // Curvature (> 0)
}

/**
 * Computes the Raw SVI total variance for a given log-moneyness.
 * w(k) = a + b * (rho * (k - m) + sqrt((k - m)^2 + sigma^2))
 *
 * @param k - Log moneyness: ln(K/F)
 * @param slice - SVI parameters for a specific expiration
 * @returns Total variance (w)
 */
export function sviVariance(k: number, slice: SVISlice): number {
  const { a, b, rho, m, sigma } = slice;
  const k_minus_m = k - m;
  const sqrt_term = Math.sqrt(k_minus_m * k_minus_m + sigma * sigma);
  return a + b * (rho * k_minus_m + sqrt_term);
}

/**
 * Converts total variance to annualized Implied Volatility.
 * IV = sqrt(w / T)
 *
 * @param w - Total variance
 * @param T - Time to expiration in years
 * @returns Implied Volatility (annualized)
 */
export function varianceToIV(w: number, T: number): number {
  if (w <= 0 || T <= 0) return 0;
  return Math.sqrt(w / T);
}
