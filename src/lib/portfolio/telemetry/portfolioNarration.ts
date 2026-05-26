import { PortfolioGreeks } from "../types/portfolioTypes";
import { DirectionalExposureProfile } from "../exposure/directionalExposure";
import { VolatilityExposureProfile } from "../exposure/volatilityExposure";
import { ConvexityRiskProfile } from "../exposure/convexityMapping";
import { ExposureMatrix } from "../topology/exposureTopology";

/**
 * Generates an institutional-grade, analytical, and restrained risk narrative log.
 * Translates quantitative portfolio Greeks and profiles into high-level probabilistic commentary.
 */
export function generatePortfolioNarration(params: {
  holdingsCount: number;
  assetsCount: number;
  netGreeks: PortfolioGreeks;
  dirExposure: DirectionalExposureProfile;
  volExposure: VolatilityExposureProfile;
  convMapping: ConvexityRiskProfile;
  topology: ExposureMatrix;
}): string[] {
  const { holdingsCount, assetsCount, netGreeks, dirExposure, volExposure, convMapping, topology } = params;
  const logs: string[] = [];

  const timestamp = new Date().toISOString().split("T")[1].slice(0, 8);
  const prefix = `[${timestamp}] COG_ENGINE:`;

  logs.push(`${prefix} Ingestion completed. Active portfolio contains ${holdingsCount} strategy groups across ${assetsCount} assets.`);

  // 1. Directional Bias Commentary
  const betaDeltaShares = Math.abs(dirExposure.netBetaDelta);
  if (dirExposure.netBetaDelta > 10) {
    logs.push(`${prefix} Directional bias is net bullish. Beta-weighted Delta equivalent to +${betaDeltaShares} SPY shares.`);
  } else if (dirExposure.netBetaDelta < -10) {
    logs.push(`${prefix} Directional bias is net bearish. Beta-weighted Delta equivalent to -${betaDeltaShares} SPY shares (systemic hedge).`);
  } else {
    logs.push(`${prefix} Directional bias is delta-neutral. High protection against index-level direction swings.`);
  }

  // 2. Convexity (Gamma) Commentary
  if (convMapping.gammaClass === "concave") {
    logs.push(`${prefix} Portfolio convexity is CONCAVE (net negative Gamma of ${netGreeks.gamma}). Price acceleration near strikes will drive rapid Delta shifts.`);
    if (convMapping.pinRiskTicker) {
      logs.push(`${prefix} Near-term strike pin risk concentrated in [${convMapping.pinRiskTicker}]. Risk of gamma-squeeze expansion.`);
    }
  } else if (convMapping.gammaClass === "convex") {
    logs.push(`${prefix} Portfolio convexity is CONVEX (net positive Gamma of ${netGreeks.gamma}). Delta shifts in favor of direction moves.`);
  } else {
    logs.push(`${prefix} Convexity profile is neutral. Low sensitivity to rapid price acceleration.`);
  }

  // 3. Volatility (Vega) and Time Decay (Theta) Commentary
  const thetaDay = Math.abs(netGreeks.theta);
  if (netGreeks.vega < 0) {
    logs.push(`${prefix} Net short Vega exposure (${netGreeks.vega} contracts). Volatility expansion represents severe tail risk.`);
    if (volExposure.volatilitySkewRisk === "high") {
      logs.push(`${prefix} WARNING: Vega concentration clustered in front-month expirations. Skew sensitivity amplified.`);
    }
    if (netGreeks.theta > 0) {
      logs.push(`${prefix} Time decay (Theta) yields +$${thetaDay.toFixed(0)}/day, acting as positive carry offset to short Vega.`);
    }
  } else {
    logs.push(`${prefix} Net long Vega exposure (${netGreeks.vega} contracts). Portfolio benefits from volatility spikes.`);
    if (netGreeks.theta < 0) {
      logs.push(`${prefix} Time decay drag: -$${thetaDay.toFixed(0)}/day decay loss. Long volatility positions are carrying premium decay costs.`);
    }
  }

  // 4. Diversification Commentary
  if (topology.concentratedAsset) {
    logs.push(`${prefix} Systemic concentration hazard: [${topology.concentratedAsset}] exceeds 40% of total portfolio capital.`);
  } else {
    logs.push(`${prefix} Asset allocation is diversified. HHI Diversification Index: ${topology.diversificationIndex}/100.`);
  }

  return logs;
}
