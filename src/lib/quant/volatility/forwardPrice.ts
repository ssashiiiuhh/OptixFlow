/**
 * Computes the forward price of an asset.
 * F = S * e^{(r-q)*T}
 *
 * @param S - Spot price
 * @param r - Risk-free rate (annualized)
 * @param q - Dividend yield (annualized)
 * @param T - Time to expiration in years
 * @returns Forward price
 */
export function computeForwardPrice(S: number, r: number, q: number, T: number): number {
  return S * Math.exp((r - q) * T);
}

/**
 * Computes the log-moneyness of a strike relative to the forward price.
 * k = ln(K / F)
 *
 * @param K - Strike price
 * @param F - Forward price
 * @returns Log-moneyness
 */
export function computeLogMoneyness(K: number, F: number): number {
  return Math.log(K / F);
}
