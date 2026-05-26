/**
 * Probability density function (PDF) of a standard normal distribution.
 */
export function normPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Cumulative distribution function (CDF) of a standard normal distribution.
 * Uses the Abramowitz and Stegun approximation (error < 7.5e-8).
 */
export function normCDF(x: number): number {
  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const t = 1.0 / (1.0 + p * Math.abs(x));
  const pdfVal = normPDF(x);
  const sigma = 1.0 - pdfVal * (
    b1 * t +
    b2 * Math.pow(t, 2) +
    b3 * Math.pow(t, 3) +
    b4 * Math.pow(t, 4) +
    b5 * Math.pow(t, 5)
  );

  return x >= 0 ? sigma : 1.0 - sigma;
}
