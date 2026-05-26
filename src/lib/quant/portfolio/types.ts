import { GreekSet } from "../greeks/types";

export interface PortfolioPosition {
  id: string;
  ticker: string;
  type: "call" | "put" | "stock";
  side: "long" | "short";
  strike: number;
  quantity: number;
  entryPrice: number;
  expiryDte: number;
  initialSpot: number;
  initialIv: number;
}

export interface PortfolioGreeksSummary extends GreekSet {
  netDelta: number;
  netGamma: number;
  netTheta: number;
  netVega: number;
  netRho: number;
}

export interface PortfolioRiskMetrics {
  totalPremium: number;
  netExposure: number; // Delta-adjusted exposure
  greeks: PortfolioGreeksSummary;
  volatilitySensitivity: number; // portfolio vega
  thetaYield: number; // portfolio daily decay
}
