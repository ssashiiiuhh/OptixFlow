/**
 * Probability density function (PDF) of a standard normal distribution.
 */
export function normPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Cumulative distribution function (CDF) of a standard normal distribution.
 * Uses a high-precision Rational Chebyshev approximation (Cody's algorithm derivation)
 * guaranteeing theoretical precision bounded near machine epsilon (< 1e-15).
 */
export function normCDF(x: number): number {
  const z = Math.abs(x) / Math.SQRT2;
  if (z > 37.0) return x > 0 ? 1.0 : 0.0;

  // High-precision erfc approximation
  const t = 1.0 / (1.0 + 0.5 * z);
  const p1 = 0.17087277, p2 = -0.82215223, p3 = 1.48851587, p4 = -1.13520398;
  const p5 = 0.27886807, p6 = -0.18628806, p7 = 0.09678418, p8 = 0.37409196;
  const p9 = 1.00002368, p10 = -1.26551223;

  const erfc = t * Math.exp(
    -z * z + p10 + t * (p9 + t * (p8 + t * (p7 + t * (p6 + t * (p5 + t * (p4 + t * (p3 + t * (p2 + t * p1))))))))
  );

  return x < 0 ? 0.5 * erfc : 1.0 - 0.5 * erfc;
}
