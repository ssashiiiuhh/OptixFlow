import type { VolatilityRegime } from "../quant/volatility/types";

export type { VolatilityRegime };

export interface LiveTickerQuote {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  openInterest?: number;
  high?: number;
  low?: number;
  bid?: number;
  ask?: number;
  timestamp: number;
}

export interface LiveOptionContract {
  ticker: string;
  strike: number;
  type: "call" | "put";
  expiration: string; // YYYY-MM-DD
  dte: number;
  iv: number;         // decimal (e.g. 0.30)
  bid: number;
  ask: number;
  last?: number;
  volume: number;
  openInterest: number;
  // Greeks
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
}

export interface LiveOptionChain {
  ticker: string;
  underlierPrice: number;
  expiration: string; // YYYY-MM-DD
  dte: number;
  contracts: LiveOptionContract[];
}

export interface LiveVolatilitySurface {
  ticker: string;
  baseIv: number; // 30-day IV (e.g. 0.30)
  ivRank: number;
  ivPercentile: number;
  termStructure: { dte: number; iv: number }[];
  skewPoints: { strike: number; iv: number; dte: number }[];
  meshPoints: { strike: number; dte: number; iv: number }[];
}

export interface LiveMacroEvent {
  id: string;
  title: string;
  date: string;
  impact: "low" | "medium" | "high";
  description: string;
}

export interface LiveTreasuryRates {
  "1M": number;
  "3M": number;
  "1Y": number;
  "10Y": number;
  timestamp: number;
}

export interface MarketKeys {
  polygonKey?: string;
  tradierToken?: string;
  finnhubKey?: string;
  alphavantageKey?: string;
  mode: "simulated" | "live";
}
