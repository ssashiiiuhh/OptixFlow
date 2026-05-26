import {
  LiveTickerQuote,
  LiveOptionChain,
  LiveMacroEvent,
  LiveTreasuryRates
} from "../types";

/**
 * Base class for all market data providers.
 * Provides normalized abstraction, retries, and rate limit handling.
 */
export abstract class BaseDataProvider {
  protected apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Fetches real-time or delayed stock quote.
   */
  abstract fetchQuote(ticker: string): Promise<LiveTickerQuote>;

  /**
   * Fetches options chain for a specific expiration date.
   */
  abstract fetchOptionChain(ticker: string, expiration: string): Promise<LiveOptionChain>;

  /**
   * Fetches daily historical close prices for realized volatility calculations.
   */
  async fetchHistoricalVol(ticker: string, days: number = 30): Promise<number[]> {
    return [];
  }

  /**
   * Fetches macroeconomic and earnings calendar events.
   */
  async fetchMacroEvents(): Promise<LiveMacroEvent[]> {
    return [];
  }

  /**
   * Fetches treasury yield interest rates.
   */
  async fetchTreasuryRates(): Promise<LiveTreasuryRates | null> {
    return null;
  }

  /**
   * Safe fetch with built-in retries, exponential backoff, and rate limit (429) protection.
   */
  protected async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries: number = 3,
    delayMs: number = 1000
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);

      // Handle 429 Rate Limit
      if (response.status === 429) {
        if (retries > 0) {
          console.warn(`Rate limit hit (429) for ${url}. Retrying in ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          return this.fetchWithRetry(url, options, retries - 1, delayMs * 2);
        } else {
          throw new Error("HTTP 429: Rate limit exceeded. Retries exhausted.");
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (err) {
      if (retries > 0) {
        console.warn(`Request to ${url} failed. Retrying... Attempts remaining: ${retries}. Error: ${err}`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.fetchWithRetry(url, options, retries - 1, delayMs * 2);
      }
      throw err;
    }
  }
}
