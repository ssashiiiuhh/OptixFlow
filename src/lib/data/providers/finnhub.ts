import { BaseDataProvider } from "./base";
import { LiveTickerQuote, LiveOptionChain, LiveOptionContract, LiveMacroEvent } from "../types";
import { bsmPrice, bsmGreeks, calculateStrikeIv } from "../../quant";

export class FinnhubDataProvider extends BaseDataProvider {
  /**
   * Fetches real-time stock quote from Finnhub.
   */
  async fetchQuote(ticker: string): Promise<LiveTickerQuote> {
    const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${this.apiKey}`;
    const response = await this.fetchWithRetry(url);
    const q = await response.json();

    if (!q || q.c === 0) {
      throw new Error(`Finnhub: Failed to fetch quote for ${ticker}`);
    }

    return {
      ticker,
      price: Math.round(q.c * 100) / 100,
      change: Math.round((q.d || 0) * 100) / 100,
      changePercent: Math.round((q.dp || 0) * 100) / 100,
      volume: 0, // Finnhub quote does not provide volume directly in basic quote
      high: q.h,
      low: q.l,
      timestamp: Date.now(),
    };
  }

  /**
   * Safe fallback options chain generator since Finnhub's native option chain API is premium-only.
   * Generates a realistic chain anchored to Finnhub's live stock quote.
   */
  async fetchOptionChain(ticker: string, expiration: string): Promise<LiveOptionChain> {
    const underlier = await this.fetchQuote(ticker);

    const expDate = new Date(expiration + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dte = Math.max(1, Math.round((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const t = dte / 365;
    const r = 0.05;

    const spot = underlier.price;
    const baseIv = this.getDefaultIv30(ticker);

    // Generate strikes centered around spot
    let strikeInterval = 5;
    if (spot < 100) strikeInterval = 1;
    else if (spot < 300) strikeInterval = 2.5;
    else if (spot < 600) strikeInterval = 5;
    else strikeInterval = 10;

    const centerStrike = Math.round(spot / strikeInterval) * strikeInterval;
    const strikes: number[] = [];
    for (let i = -5; i <= 5; i++) {
      strikes.push(centerStrike + i * strikeInterval);
    }

    const contracts: LiveOptionContract[] = [];

    for (const strike of strikes) {
      for (const type of ["call", "put"] as const) {
        const iv = calculateStrikeIv(spot, strike, dte, baseIv, 0.18, -0.35, false);
        const priceVal = bsmPrice(spot, strike, t, iv, r, type);
        const greeks = bsmGreeks(spot, strike, t, iv, r, type);

        const bid = Math.max(0.01, Math.round(priceVal * 0.98 * 100) / 100);
        const ask = Math.max(0.01, Math.round(priceVal * 1.02 * 100) / 100);
        const last = Math.round(priceVal * 100) / 100;

        const dist = Math.abs(strike - spot);
        const baseVol = Math.max(10, Math.round(1500 * Math.exp(-Math.pow(dist, 2) / (spot * 2.0))));
        const seedHash = (strike * 13) % 7;
        const vol = baseVol + seedHash;
        const oi = vol * 12 + seedHash * 35;

        contracts.push({
          ticker: `O:${ticker}${expiration.replace(/-/g, "")}${type === "call" ? "C" : "P"}${String(strike * 1000).padStart(8, "0")}`,
          strike,
          type,
          expiration,
          dte,
          iv,
          bid,
          ask,
          last,
          volume: vol,
          openInterest: oi,
          delta: Math.round(greeks.delta * 100) / 100,
          gamma: Math.round(greeks.gamma * 1000) / 1000,
          theta: Math.round(greeks.theta * 100) / 100,
          vega: Math.round(greeks.vega * 100) / 100,
          rho: Math.round(greeks.rho * 100) / 100,
        });
      }
    }

    return {
      ticker,
      underlierPrice: spot,
      expiration,
      dte,
      contracts,
    };
  }

  /**
   * Fetches earnings calendar events from Finnhub.
   */
  async fetchMacroEvents(): Promise<LiveMacroEvent[]> {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + 14); // 2 weeks out

    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    const fromStr = formatDate(today);
    const toStr = formatDate(future);

    const url = `https://finnhub.io/api/v1/calendar/earnings?from=${fromStr}&to=${toStr}&token=${this.apiKey}`;
    
    try {
      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      if (!data.earningsCalendar) return [];

      const targetSymbols = new Set(["SPY", "AAPL", "NVDA", "TSLA", "IWM"]);

      return data.earningsCalendar
        .filter((e: any) => targetSymbols.has(e.symbol))
        .map((e: any) => ({
          id: `earnings-${e.symbol}-${e.date}`,
          title: `${e.symbol} Q${e.quarter || ""} Earnings`,
          date: e.date,
          impact: "high" as const,
          description: `${e.symbol} quarterly earnings report. Expected EPS: ${e.epsEstimate ?? "N/A"}, Revenue Estimate: ${e.revenueEstimate ? "$" + (e.revenueEstimate / 1e9).toFixed(2) + "B" : "N/A"}`,
        }));
    } catch (err) {
      console.warn("Finnhub: failed to fetch earnings calendar events. Error:", err);
      return [];
    }
  }

  private getDefaultIv30(ticker: string): number {
    switch (ticker.toUpperCase()) {
      case "SPY": return 14.6;
      case "AAPL": return 28.4;
      case "NVDA": return 52.8;
      case "TSLA": return 48.5;
      case "IWM": return 21.2;
      default: return 25.0;
    }
  }
}
