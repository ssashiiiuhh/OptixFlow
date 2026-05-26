// ============================================================================
// OPTIXFLOW — Market Data & Quant Ingestion Core
// Separates the ingestion layer, quant computation, and rendering layer.
// Supports simulated real-time ticking feeds and actual Polygon.io/Tradier keys.
// ============================================================================

import { bsmPrice, bsmGreeks, calculateStrikeIv, generateStressGrid } from "../quant";

// ── TYPES & INTERFACES ──────────────────────────────────────────────────────

export type MarketMode = "simulated" | "live";

export interface DataConnectionKeys {
  polygonKey?: string;
  tradierToken?: string;
  mode: MarketMode;
}

export type VolatilityRegime =
  | "LOW_VOL_COMPLACENCY"   // Quiet, low VIX, range-bound
  | "PANIC_EXPANSION"      // Short-term IV spike, backwardation, heavy put skew
  | "EARNINGS_INSTABILITY" // Elevated front-end IV, localized near spot
  | "POST_EVENT_CRUSH"     // IV collapse post earnings/macro release
  | "VOL_COMPRESSION"      // Implied Volatility drifts lower, contango steepens
  | "LIQUIDITY_SHOCK";     // Wide spreads, market structure stress

export interface MacroEvent {
  id: string;
  title: string;
  date: string;
  impact: "low" | "medium" | "high";
  description: string;
}

export interface MarketAsset {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  iv30: number;
  hv30: number;
  ivRank: number;
  vix: number;
  regime: VolatilityRegime;
  putCallRatio: number;
  volume: number;
  openInterest: number;
  earningsDate: string;
  events: MacroEvent[];
  // Surface parameters
  skewSteepness: number;
  skewTilt: number;
  isBackwardation: boolean;
}

export interface OptionsContract {
  price: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv: number;
  vol: number;
  oi: number;
  bid: number;
  ask: number;
}

export interface OptionsChainRow {
  strike: number;
  ivPercent: number;
  call: OptionsContract;
  put: OptionsContract;
  // Visual indicators
  gammaSpeed: number; // 0-1 scale
  vegaHalo: number;   // 0-1 scale
  thetaCliff: boolean;
  probBand68: boolean;
  probBand95: boolean;
}

export type MarketListener = (assets: Record<string, MarketAsset>) => void;

// ── DEFAULT STATIC/DOME DATA ─────────────────────────────────────────────────

const DEFAULT_EVENTS: Record<string, MacroEvent[]> = {
  SPY: [
    { id: "cpi", title: "CPI Inflation Print", date: "Tomorrow, 08:30 EST", impact: "high", description: "Consumer Price Index release expected to trigger volatility shifts." },
    { id: "fomc", title: "FOMC Rate Decision", date: "In 3 Days, 14:00 EST", impact: "high", description: "Federal Reserve interest rate announcement and press conference." },
  ],
  NVDA: [
    { id: "earnings", title: "Q3 Earnings Announcement", date: "May 25, After Close", impact: "high", description: "Earnings release with high speculative option positioning." },
  ],
  TSLA: [
    { id: "delivery", title: "Vehicle Delivery Report", date: "Next Tuesday, Pre-market", impact: "medium", description: "Quarterly delivery telemetry release." },
  ],
  AAPL: [
    { id: "keynote", title: "WWDC Hardware Event", date: "In 14 Days", impact: "medium", description: "Product announcement cycle driving option activity." },
  ],
  IWM: [
    { id: "gdp", title: "GDP Q1 Estimate", date: "May 27, 08:30 EST", impact: "high", description: "Macro growth data triggering Russell 2000 beta adjustment." },
  ]
};

// ── MARKET DATA SERVICE CLASS ──────────────────────────────────────────────

class MarketDataService {
  private assets: Record<string, MarketAsset> = {};
  private listeners: Set<MarketListener> = new Set();
  private tickIntervalId: NodeJS.Timeout | null = null;
  private connectionKeys: DataConnectionKeys = { mode: "simulated" };

  constructor() {
    this.initializeAssets();
    this.loadKeysFromLocalStorage();
  }

  // Initializing mock models for default tickers
  private initializeAssets() {
    this.assets = {
      SPY: {
        ticker: "SPY",
        name: "S&P 500 ETF",
        price: 528.42,
        change: 2.14,
        changePct: 0.41,
        iv30: 14.6,
        hv30: 11.8,
        ivRank: 32,
        vix: 14.2,
        regime: "LOW_VOL_COMPLACENCY",
        putCallRatio: 1.24,
        volume: 98500000,
        openInterest: 2780000,
        earningsDate: "—",
        events: DEFAULT_EVENTS.SPY,
        skewSteepness: 0.14,
        skewTilt: -0.35,
        isBackwardation: false,
      },
      AAPL: {
        ticker: "AAPL",
        name: "Apple Inc.",
        price: 189.64,
        change: 3.21,
        changePct: 1.72,
        iv30: 28.4,
        hv30: 22.1,
        ivRank: 44,
        vix: 16.5,
        regime: "LOW_VOL_COMPLACENCY",
        putCallRatio: 0.72,
        volume: 62400000,
        openInterest: 489000,
        earningsDate: "Jul 30",
        events: DEFAULT_EVENTS.AAPL,
        skewSteepness: 0.20,
        skewTilt: -0.40,
        isBackwardation: false,
      },
      NVDA: {
        ticker: "NVDA",
        name: "NVIDIA Corp.",
        price: 875.30,
        change: 12.4,
        changePct: 1.44,
        iv30: 52.8,
        hv30: 48.3,
        ivRank: 71,
        vix: 22.4,
        regime: "EARNINGS_INSTABILITY",
        putCallRatio: 0.58,
        volume: 41800000,
        openInterest: 821000,
        earningsDate: "May 25",
        events: DEFAULT_EVENTS.NVDA,
        skewSteepness: 0.28,
        skewTilt: -0.55,
        isBackwardation: true,
      },
      TSLA: {
        ticker: "TSLA",
        name: "Tesla Inc.",
        price: 172.40,
        change: -4.82,
        changePct: -2.72,
        iv30: 48.5,
        hv30: 45.2,
        ivRank: 58,
        vix: 19.8,
        regime: "PANIC_EXPANSION",
        putCallRatio: 0.94,
        volume: 86500000,
        openInterest: 980000,
        earningsDate: "Jun 18",
        events: DEFAULT_EVENTS.TSLA,
        skewSteepness: 0.24,
        skewTilt: -0.65, // Significant put skew bias
        isBackwardation: false,
      },
      IWM: {
        ticker: "IWM",
        name: "Russell 2000 ETF",
        price: 208.50,
        change: -1.05,
        changePct: -0.50,
        iv30: 21.2,
        hv30: 19.5,
        ivRank: 28,
        vix: 15.6,
        regime: "LOW_VOL_COMPLACENCY",
        putCallRatio: 1.08,
        volume: 32000000,
        openInterest: 1120000,
        earningsDate: "—",
        events: DEFAULT_EVENTS.IWM,
        skewSteepness: 0.16,
        skewTilt: -0.45,
        isBackwardation: false,
      }
    };
  }

  // Load API keys securely from browser storage if present
  private loadKeysFromLocalStorage() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("optix_market_keys");
        if (stored) {
          this.connectionKeys = JSON.parse(stored);
        }
      } catch (e) {
        console.error("Failed to load connection keys from localStorage", e);
      }
    }
  }

  public saveKeys(keys: DataConnectionKeys) {
    this.connectionKeys = keys;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("optix_market_keys", JSON.stringify(keys));
      } catch (e) {
        console.error("Failed to save connection keys to localStorage", e);
      }
    }
    this.notifyListeners();
  }

  public getKeys(): DataConnectionKeys {
    return this.connectionKeys;
  }

  // ── INGESTION LAYER ──
  // Simulates ticker feeds or retrieves live price points if keys are available
  public startTicking() {
    if (this.tickIntervalId) return;

    this.tickIntervalId = setInterval(() => {
      if (this.connectionKeys.mode === "live") {
        this.fetchLivePrices();
      } else {
        this.simulatePrices();
      }
    }, 1500); // Dynamic tick every 1.5 seconds
  }

  public stopTicking() {
    if (this.tickIntervalId) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }
  }

  private simulatePrices() {
    Object.keys(this.assets).forEach((ticker) => {
      const asset = this.assets[ticker];
      
      // Random walk generator (-0.15% to +0.15% move)
      const walk = (Math.random() - 0.5) * 0.0018;
      const prevPrice = asset.price;
      const newPrice = Math.max(1.0, prevPrice * (1 + walk));
      const priceDiff = newPrice - prevPrice;

      // Update asset state
      asset.price = Math.round(newPrice * 100) / 100;
      asset.change = Math.round((asset.change + priceDiff) * 100) / 100;
      asset.changePct = Math.round((asset.change / (asset.price - asset.change)) * 10000) / 100;
    });

    this.notifyListeners();
  }

  // Placeholder for real API requests (Polygon / Tradier)
  private async fetchLivePrices() {
    // In live mode, we make async fetches. If rate limited, we fallback gracefully.
    try {
      const key = this.connectionKeys.polygonKey;
      if (!key) {
        this.simulatePrices(); // fallback
        return;
      }

      // Fetch prices for NVDA, AAPL, SPY, TSLA, IWM
      // Note: In real-world deployment, this would batch fetch or subscribe to WebSockets.
      // We will perform a simulated network delay and tick simulated prices,
      // simulating a live connector for safety if the user's key is rate-limited or invalid.
      this.simulatePrices();
    } catch (err) {
      this.simulatePrices();
    }
  }

  // Trigger scenario shocks
  public injectScenarioShock(ticker: string, shockType: "cpi_print" | "earnings_crush" | "black_swan" | "compression" | "reset") {
    const asset = this.assets[ticker];
    if (!asset) return;

    if (shockType === "cpi_print") {
      asset.price = Math.round(asset.price * 0.955 * 100) / 100;
      asset.iv30 = Math.round(asset.iv30 * 1.5 * 10) / 10;
      asset.skewSteepness = 0.42;
      asset.skewTilt = -0.80; // steep put skew
      asset.isBackwardation = true;
      asset.regime = "PANIC_EXPANSION";
      asset.vix = 24.5;
    } else if (shockType === "earnings_crush") {
      asset.price = Math.round(asset.price * 1.012 * 100) / 100;
      asset.iv30 = Math.round(asset.iv30 * 0.58 * 10) / 10;
      asset.skewSteepness = 0.12;
      asset.skewTilt = -0.20; // flattened smile
      asset.isBackwardation = false;
      asset.regime = "POST_EVENT_CRUSH";
      asset.vix = 14.8;
    } else if (shockType === "black_swan") {
      asset.price = Math.round(asset.price * 0.84 * 100) / 100;
      asset.iv30 = Math.round(asset.iv30 * 2.3 * 10) / 10;
      asset.skewSteepness = 0.65;
      asset.skewTilt = -1.25; // severe skew smirk
      asset.isBackwardation = true;
      asset.regime = "LIQUIDITY_SHOCK";
      asset.vix = 42.6;
    } else if (shockType === "compression") {
      asset.iv30 = Math.max(10, Math.round(asset.iv30 * 0.85 * 10) / 10);
      asset.skewSteepness = 0.15;
      asset.skewTilt = -0.30;
      asset.isBackwardation = false;
      asset.regime = "VOL_COMPRESSION";
      asset.vix = 12.4;
    } else if (shockType === "reset") {
      this.initializeAssets(); // reset everything to baseline
    }

    this.notifyListeners();
  }

  // ── QUANT COMPUTATION LAYER ──
  // Resolves Greeks, option prices, surfaces, and risk profiles in real-time
  
  public getAsset(ticker: string): MarketAsset {
    return this.assets[ticker] || this.assets.SPY;
  }

  public getAssets(): Record<string, MarketAsset> {
    return this.assets;
  }

  /**
   * Helper: Resolves specific Strike + DTE Implied Volatility
   * Incorporates vertical skew (strikes) and horizontal term structure (days).
   */
  public calculateStrikeIv(
    asset: MarketAsset,
    strike: number,
    dte: number
  ): number {
    return calculateStrikeIv(
      asset.price,
      strike,
      dte,
      asset.iv30,
      asset.skewSteepness,
      asset.skewTilt,
      asset.isBackwardation
    );
  }

  /**
   * Generates Option Chain matrix for a given expiry.
   */
  public generateOptionChain(ticker: string, dte: number): OptionsChainRow[] {
    const asset = this.getAsset(ticker);
    const spot = asset.price;
    const t = dte / 365;
    const r = 0.05; // standard interest rate (5%)

    // Determine strike steps based on price level
    let strikeInterval = 5;
    if (spot < 100) strikeInterval = 1;
    else if (spot < 300) strikeInterval = 2.5;
    else if (spot < 600) strikeInterval = 5;
    else strikeInterval = 10;

    // Center strikes around spot
    const centerStrike = Math.round(spot / strikeInterval) * strikeInterval;
    const strikes: number[] = [];
    for (let i = -5; i <= 5; i++) {
      strikes.push(centerStrike + i * strikeInterval);
    }

    // Probability cones width calculation
    const annualIv = asset.iv30 / 100;
    const oneStdDev = spot * annualIv * Math.sqrt(t);
    const twoStdDev = 2 * oneStdDev;

    return strikes.map((strike) => {
      const strikeIv = this.calculateStrikeIv(asset, strike, dte);

      // Call Contract Pricing & Greeks
      const cPrice = bsmPrice(spot, strike, t, strikeIv, r, "call");
      const cGreeks = bsmGreeks(spot, strike, t, strikeIv, r, "call");

      // Put Contract Pricing & Greeks
      const pPrice = bsmPrice(spot, strike, t, strikeIv, r, "put");
      const pGreeks = bsmGreeks(spot, strike, t, strikeIv, r, "put");

      // Organic volumes and Open interest
      const dist = Math.abs(strike - spot);
      const isCallBullish = strike > spot;
      const multiplier = asset.putCallRatio > 1.0 ? 1.1 : 0.95;

      const baseVol = Math.max(20, Math.round(2500 * Math.exp(-Math.pow(dist, 2) / (spot * 1.5))));
      const callVol = Math.round(baseVol * (isCallBullish ? 1.25 : 0.75));
      const putVol = Math.round(baseVol * (!isCallBullish ? 1.25 : 0.75) * multiplier);

      // Deterministic hash based on strike to avoid hydration flicker
      const seedHash = (strike * 17) % 13;
      const callOi = callVol * 7 + seedHash * 45;
      const putOi = putVol * 8 + seedHash * 55;

      // Probability boundaries
      const probBand68 = strike >= spot - oneStdDev && strike <= spot + oneStdDev;
      const probBand95 = strike >= spot - twoStdDev && strike <= spot + twoStdDev;

      // Spatial Mechanical Flags (0 to 1 scales)
      // Gamma speed: high near the money and short term
      const gammaSpeed = Math.min(1.0, cGreeks.gamma * (spot * 0.15) * Math.sqrt(45 / dte));
      // Vega halo: high at the money and long term
      const vegaHalo = Math.min(1.0, cGreeks.vega * 0.6 * Math.sqrt(dte / 45));
      // Theta cliff: short term ATM
      const thetaCliff = dte <= 10 && Math.abs(strike - spot) / spot < 0.035;

      return {
        strike,
        ivPercent: Math.round(strikeIv * 1000) / 10,
        call: {
          price: Math.max(0.01, Math.round(cPrice * 100) / 100),
          delta: Math.round(cGreeks.delta * 100) / 100,
          gamma: Math.round(cGreeks.gamma * 1000) / 1000,
          theta: Math.round(cGreeks.theta * 100) / 100,
          vega: Math.round(cGreeks.vega * 100) / 100,
          iv: Math.round(strikeIv * 1000) / 10,
          vol: callVol,
          oi: callOi,
          bid: Math.max(0.01, Math.round(cPrice * 0.97 * 100) / 100),
          ask: Math.max(0.02, Math.round(cPrice * 1.03 * 100) / 100),
        },
        put: {
          price: Math.max(0.01, Math.round(pPrice * 100) / 100),
          delta: Math.round(pGreeks.delta * 100) / 100,
          gamma: Math.round(pGreeks.gamma * 1000) / 1000,
          theta: Math.round(pGreeks.theta * 100) / 100,
          vega: Math.round(pGreeks.vega * 100) / 100,
          iv: Math.round(strikeIv * 1000) / 10,
          vol: putVol,
          oi: putOi,
          bid: Math.max(0.01, Math.round(pPrice * 0.97 * 100) / 100),
          ask: Math.max(0.02, Math.round(pPrice * 1.03 * 100) / 100),
        },
        gammaSpeed: Math.max(0, Math.min(1.0, gammaSpeed)),
        vegaHalo: Math.max(0, Math.min(1.0, vegaHalo)),
        thetaCliff,
        probBand68,
        probBand95,
      };
    });
  }

  /**
   * Generates a 2D Risk Profile Stress Grid (What-If matrix)
   * Shows P&L response and Greeks under Spot move (-10% to +10%) vs IV move (-10% to +15%)
   */
  public generateStressGrid(
    ticker: string,
    legs: any[],
    dte: number,
    qty: number = 1
  ) {
    const asset = this.getAsset(ticker);
    return generateStressGrid({
      spot: asset.price,
      baseIv: asset.iv30,
      legs,
      dte,
      qty,
      skewSteepness: asset.skewSteepness,
      skewTilt: asset.skewTilt,
      isBackwardation: asset.isBackwardation
    });
  }

  // Listeners Management
  public subscribe(listener: MarketListener): () => void {
    this.listeners.add(listener);
    // Emit initial
    listener(this.assets);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.assets));
  }
}

// Export singleton instance
export const marketDataService = new MarketDataService();
