import { BaseDataProvider } from "./base";
import { LiveTickerQuote, LiveOptionChain, LiveOptionContract } from "../types";
import { bsmPrice, bsmGreeks, calculateStrikeIv } from "../../quant";

export class PolygonDataProvider extends BaseDataProvider {
  /**
   * Fetches the real-time/last trade and previous day close quote.
   */
  async fetchQuote(ticker: string): Promise<LiveTickerQuote> {
    const prevUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${this.apiKey}`;
    const lastUrl = `https://api.polygon.io/v2/last/trade/${ticker}?apiKey=${this.apiKey}`;

    const [prevRes, lastRes] = await Promise.allSettled([
      this.fetchWithRetry(prevUrl).then((r) => r.json()),
      this.fetchWithRetry(lastUrl).then((r) => r.json()),
    ]);

    let prevClose = 0;
    let volume = 0;
    let high = 0;
    let low = 0;
    let open = 0;

    if (prevRes.status === "fulfilled" && prevRes.value.results && prevRes.value.results[0]) {
      const r = prevRes.value.results[0];
      prevClose = r.c || 0;
      volume = r.v || 0;
      high = r.h || 0;
      low = r.l || 0;
      open = r.o || 0;
    }

    let price = prevClose || 100.0; // Fallback
    let timestamp = Date.now();

    if (lastRes.status === "fulfilled" && lastRes.value.results) {
      const r = lastRes.value.results;
      price = r.p || price;
      timestamp = r.t ? Math.round(r.t / 1000000) : timestamp;
    }

    const change = price - prevClose;
    const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

    return {
      ticker,
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume,
      high: high || price,
      low: low || price,
      timestamp,
    };
  }

  /**
   * Fetches contracts list for expiration, and builds chain with pricing/Greeks.
   */
  async fetchOptionChain(ticker: string, expiration: string): Promise<LiveOptionChain> {
    const underlier = await this.fetchQuote(ticker);
    const url = `https://api.polygon.io/v3/reference/options/contracts?underlying_ticker=${ticker}&expiration_date=${expiration}&limit=1000&apiKey=${this.apiKey}`;
    
    const response = await this.fetchWithRetry(url);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error(`No option contracts found for underlying ${ticker} expiring on ${expiration}`);
    }

    // DTE Calculation
    const expDate = new Date(expiration + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dte = Math.max(1, Math.round((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const t = dte / 365;
    const r = 0.05; // Risk-free rate baseline

    const baseIv = this.getDefaultIv30(ticker);

    const contracts: LiveOptionContract[] = data.results.map((c: any) => {
      const strike = c.strike_price;
      const type = c.contract_type as "call" | "put";
      
      // Calculate strike specific IV using quant skew model
      const iv = calculateStrikeIv(
        underlier.price,
        strike,
        dte,
        baseIv,
        0.18, // Skew steepness
        -0.35, // Skew tilt
        false // Backwardation flag
      );

      // Value using Black-Scholes
      const priceVal = bsmPrice(underlier.price, strike, t, iv, r, type);
      const greeks = bsmGreeks(underlier.price, strike, t, iv, r, type);

      const bid = Math.max(0.01, Math.round(priceVal * 0.98 * 100) / 100);
      const ask = Math.max(0.01, Math.round(priceVal * 1.02 * 100) / 100);
      const last = Math.round(priceVal * 100) / 100;

      // Simulate realistic volume / open interest based on distance to spot
      const dist = Math.abs(strike - underlier.price);
      const baseVol = Math.max(10, Math.round(1500 * Math.exp(-Math.pow(dist, 2) / (underlier.price * 2.0))));
      const seedHash = (strike * 13) % 7;
      const vol = baseVol + seedHash;
      const oi = vol * 12 + seedHash * 35;

      return {
        ticker: c.ticker,
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
      };
    });

    // Sort contracts by strike asc, then calls first
    contracts.sort((a, b) => {
      if (a.strike !== b.strike) {
        return a.strike - b.strike;
      }
      return a.type === "call" ? -1 : 1;
    });

    return {
      ticker,
      underlierPrice: underlier.price,
      expiration,
      dte,
      contracts,
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
