// ============================================================================
// OPTIXFLOW — Static Beta Map Configuration
// For MVP, these are hardcoded 30-day trailing Betas against the SPY.
// Future: Connect to real-time rolling beta API feed.
// ============================================================================

export const MARKET_BETA_MAP: Record<string, number> = {
  "SPY": 1.00,
  "QQQ": 1.15,
  "IWM": 1.10,
  "NVDA": 1.55,
  "TSLA": 2.10,
  "AAPL": 1.12,
  "MSFT": 1.08,
  "AMZN": 1.25,
  "META": 1.35,
  "GOOGL": 1.05,
  "AMD": 1.85,
  "COIN": 3.20,
};

/**
 * Returns the Beta against SPY for a given ticker. Defaults to 1.0 if unknown.
 */
export function getBeta(ticker: string): number {
  return MARKET_BETA_MAP[ticker.toUpperCase()] ?? 1.0;
}
