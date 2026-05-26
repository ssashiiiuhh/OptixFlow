import { useState, useEffect } from "react";
import { swrCache } from "../cache/swr";
import { PolygonDataProvider } from "../providers/polygon";
import { TradierDataProvider } from "../providers/tradier";
import { FinnhubDataProvider } from "../providers/finnhub";
import { LiveTickerQuote, LiveOptionChain } from "../types";

export function useLiveMarket(
  ticker: string,
  options?: { expiration?: string; pollInterval?: number }
) {
  const [quote, setQuote] = useState<LiveTickerQuote | null>(null);
  const [chain, setChain] = useState<LiveOptionChain | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    let timer: NodeJS.Timeout;

    // Load connection keys safely
    let keys: any = {};
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("optix_market_keys");
        if (stored) {
          keys = JSON.parse(stored);
        }
      } catch (e) {
        console.error("useLiveMarket: Failed to parse keys", e);
      }
    }

    const mode = keys.mode || "simulated";
    // Throttling intervals based on API rate limits (10s for live Sandbox keys, 30s fallback)
    const pollInterval = options?.pollInterval || (keys.polygonKey || keys.tradierToken ? 15000 : 30000);

    const fetchLive = async () => {
      if (mode !== "live") {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let provider: any = null;
        if (keys.tradierToken) {
          provider = new TradierDataProvider(keys.tradierToken);
        } else if (keys.polygonKey) {
          provider = new PolygonDataProvider(keys.polygonKey);
        } else if (keys.finnhubKey) {
          provider = new FinnhubDataProvider(keys.finnhubKey);
        }

        if (!provider) {
          throw new Error("No live API keys configured. Fallback to simulated mode.");
        }

        // 1. Fetch Quote
        const quoteKey = `quote:${ticker}`;
        const quoteData = await swrCache.get<LiveTickerQuote>(quoteKey, () => provider.fetchQuote(ticker), pollInterval);
        if (active) setQuote(quoteData);

        // 2. Fetch Option Chain (if expiration requested)
        if (options?.expiration) {
          const chainKey = `chain:${ticker}:${options.expiration}`;
          const chainData = await swrCache.get<LiveOptionChain>(
            chainKey,
            () => provider.fetchOptionChain(ticker, options.expiration!),
            pollInterval
          );
          if (active) setChain(chainData);
        }
      } catch (err: any) {
        console.warn(`useLiveMarket error for ${ticker}:`, err);
        if (active) setError(err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchLive();

    if (mode === "live") {
      timer = setInterval(fetchLive, pollInterval);
    }

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [ticker, options?.expiration, options?.pollInterval]);

  return { quote, chain, isLoading, error };
}
export type { LiveTickerQuote, LiveOptionChain };
