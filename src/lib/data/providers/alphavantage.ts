import { BaseDataProvider } from "./base";
import { LiveTickerQuote, LiveOptionChain, LiveOptionContract, LiveMacroEvent, LiveTreasuryRates } from "../types";
import { bsmPrice, bsmGreeks, calculateStrikeIv } from "../../quant";

export class AlphaVantageDataProvider extends BaseDataProvider {
  /**
   * Fetches real-time stock quote from Alpha Vantage.
   */
  async fetchQuote(ticker: string): Promise<LiveTickerQuote> {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${this.apiKey}`;
    const response = await this.fetchWithRetry(url);
    const data = await response.json();

    const q = data["Global Quote"];
    if (!q || !q["05. price"]) {
      throw new Error(`Alpha Vantage: Failed to fetch quote for ${ticker}. Response: ${JSON.stringify(data)}`);
    }

    const price = parseFloat(q["05. price"]);
    const change = parseFloat(q["09. change"] || "0");
    const changePct = parseFloat((q["10. change percent"] || "0").replace("%", ""));

    return {
      ticker,
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePct * 100) / 100,
      volume: parseInt(q["06. volume"] || "0", 10),
      high: parseFloat(q["03. high"] || price.toString()),
      low: parseFloat(q["04. low"] || price.toString()),
      timestamp: Date.now(),
    };
  }

  /**
   * Fallback Option Chain generator using Alpha Vantage's live stock quote.
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
   * Fetches CPI inflation prints and maps to macro events.
   */
  async fetchMacroEvents(): Promise<LiveMacroEvent[]> {
    const url = `https://www.alphavantage.co/query?function=CPI&interval=monthly&apikey=${this.apiKey}`;
    try {
      const response = await this.fetchWithRetry(url);
      const data = await response.json();
      
      const cpiData = data.data;
      if (!cpiData || cpiData.length === 0) return [];

      const latest = cpiData[0];
      return [{
        id: `cpi-${latest.date}`,
        title: "CPI Inflation Print",
        date: latest.date,
        impact: "high" as const,
        description: `Latest Consumer Price Index (CPI) print is at ${latest.value}%. CPI inflation changes impact Fed rate policies and market Volatility regimes.`,
      }];
    } catch (err) {
      console.warn("Alpha Vantage: failed to fetch CPI. Error:", err);
      return [];
    }
  }

  /**
   * Fetches Treasury rates.
   * Handles API limit risks by prioritizing 3-month yield and generating standard curve fallbacks.
   */
  async fetchTreasuryRates(): Promise<LiveTreasuryRates | null> {
    const url = `https://www.alphavantage.co/query?function=TREASURY_YIELD&interval=daily&maturity=3month&apikey=${this.apiKey}`;
    try {
      const response = await this.fetchWithRetry(url);
      const data = await response.json();
      
      const yieldData = data.data;
      if (!yieldData || yieldData.length === 0) {
        return this.getFallbackTreasuryRates();
      }

      const latestYield = parseFloat(yieldData[0].value);
      if (isNaN(latestYield)) return this.getFallbackTreasuryRates();

      // Return a curve built around the fetched 3M rate
      const val = latestYield / 100; // e.g. 5.35% -> 0.0535
      return {
        "1M": Math.round((val - 0.001) * 10000) / 10000,
        "3M": Math.round(val * 10000) / 10000,
        "1Y": Math.round((val - 0.0025) * 10000) / 10000,
        "10Y": Math.round((val - 0.009) * 10000) / 10000,
        timestamp: Date.now(),
      };
    } catch (err) {
      console.warn("Alpha Vantage: failed to fetch Treasury rates. Using fallback. Error:", err);
      return this.getFallbackTreasuryRates();
    }
  }

  private getFallbackTreasuryRates(): LiveTreasuryRates {
    return {
      "1M": 0.0525,
      "3M": 0.0535,
      "1Y": 0.0510,
      "10Y": 0.0445,
      timestamp: Date.now(),
    };
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
