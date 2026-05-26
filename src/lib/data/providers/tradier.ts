import { BaseDataProvider } from "./base";
import { LiveTickerQuote, LiveOptionChain, LiveOptionContract } from "../types";
import { bsmPrice, bsmGreeks, calculateStrikeIv } from "../../quant";

export class TradierDataProvider extends BaseDataProvider {
  private getBaseUrl(): string {
    // If the token starts with "sandbox" or is generic, use the sandbox URL, otherwise use prod.
    if (this.apiKey.startsWith("sandbox") || this.apiKey.length < 30) {
      return "https://sandbox.tradier.com/v1";
    }
    return "https://api.tradier.com/v1";
  }

  /**
   * Fetches real-time stock quote from Tradier.
   */
  async fetchQuote(ticker: string): Promise<LiveTickerQuote> {
    const url = `${this.getBaseUrl()}/markets/quotes?symbols=${ticker}`;
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    };

    const response = await this.fetchWithRetry(url, { headers });
    const data = await response.json();

    const quoteObj = data.quotes?.quote;
    if (!quoteObj) {
      throw new Error(`Tradier: No quote found for symbol ${ticker}`);
    }

    const q = Array.isArray(quoteObj) ? quoteObj[0] : quoteObj;

    return {
      ticker: q.symbol,
      price: Math.round((q.last || q.close || 100) * 100) / 100,
      change: Math.round((q.change || 0) * 100) / 100,
      changePercent: Math.round((q.change_percentage || 0) * 100) / 100,
      volume: q.volume || 0,
      high: q.high || q.last,
      low: q.low || q.last,
      bid: q.bid,
      ask: q.ask,
      timestamp: Date.now(), // Tradier timestamps can be erratic, local time is robust
    };
  }

  /**
   * Fetches option chain from Tradier.
   */
  async fetchOptionChain(ticker: string, expiration: string): Promise<LiveOptionChain> {
    const underlier = await this.fetchQuote(ticker);
    const url = `${this.getBaseUrl()}/markets/options/chains?symbol=${ticker}&expiration=${expiration}&greeks=true`;
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    };

    const response = await this.fetchWithRetry(url, { headers });
    const data = await response.json();

    const optionObj = data.options?.option;
    if (!optionObj) {
      throw new Error(`Tradier: No options chain returned for ${ticker} and expiration ${expiration}`);
    }

    const optionList = Array.isArray(optionObj) ? optionObj : [optionObj];

    // DTE Calculation
    const expDate = new Date(expiration + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dte = Math.max(1, Math.round((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const t = dte / 365;
    const r = 0.05;

    const baseIv = this.getDefaultIv30(ticker);

    const contracts: LiveOptionContract[] = optionList.map((opt: any) => {
      const strike = opt.strike;
      const type = opt.option_type as "call" | "put";
      
      // Parse or fallback IV
      let iv = opt.greeks?.mid_iv || opt.greeks?.bid_iv || opt.greeks?.ask_iv || opt.greeks?.smash_iv;
      if (iv === undefined || iv <= 0) {
        iv = calculateStrikeIv(
          underlier.price,
          strike,
          dte,
          baseIv,
          0.18,
          -0.35,
          false
        );
      }

      // Values using Black-Scholes if bid/ask are missing or zero
      const bidVal = opt.bid || Math.max(0.01, Math.round(bsmPrice(underlier.price, strike, t, iv, r, type) * 0.98 * 100) / 100);
      const askVal = opt.ask || Math.max(0.01, Math.round(bsmPrice(underlier.price, strike, t, iv, r, type) * 1.02 * 100) / 100);
      const lastVal = opt.last || Math.round(((bidVal + askVal) / 2) * 100) / 100;

      // Extract Greeks or fallback to analytical calculation
      let delta = opt.greeks?.delta;
      let gamma = opt.greeks?.gamma;
      let theta = opt.greeks?.theta;
      let vega = opt.greeks?.vega;
      let rho = opt.greeks?.rho;

      if (delta === undefined || delta === 0) {
        const computed = bsmGreeks(underlier.price, strike, t, iv, r, type);
        delta = computed.delta;
        gamma = computed.gamma;
        theta = computed.theta;
        vega = computed.vega;
        rho = computed.rho;
      }

      return {
        ticker: opt.symbol,
        strike,
        type,
        expiration,
        dte,
        iv,
        bid: Math.round(bidVal * 100) / 100,
        ask: Math.round(askVal * 100) / 100,
        last: Math.round(lastVal * 100) / 100,
        volume: opt.volume || 0,
        openInterest: opt.open_interest || 0,
        delta: Math.round(delta * 100) / 100,
        gamma: Math.round(gamma * 1000) / 1000,
        theta: Math.round(theta * 100) / 100,
        vega: Math.round(vega * 100) / 100,
        rho: Math.round(rho * 100) / 100,
      };
    });

    // Sort contracts by strike, calls first
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
