import { PortfolioGreeks } from "../types/portfolioTypes";
import { DirectionalExposureProfile } from "../exposure/directionalExposure";
import { VolatilityExposureProfile } from "../exposure/volatilityExposure";
import { ConvexityRiskProfile } from "../exposure/convexityMapping";
import { VaRMetrics } from "../types/portfolioTypes";

export interface RiskWarning {
  severity: "critical" | "warning" | "info";
  message: string;
}

/**
 * Interprets portfolio risk parameters into clean, qualitative warnings for display.
 */
export function interpretPortfolioRisk(params: {
  netGreeks: PortfolioGreeks;
  dirExposure: DirectionalExposureProfile;
  volExposure: VolatilityExposureProfile;
  convMapping: ConvexityRiskProfile;
  varMetrics: VaRMetrics;
  diversificationIndex: number;
}): RiskWarning[] {
  const { netGreeks, dirExposure, volExposure, convMapping, varMetrics, diversificationIndex } = params;
  const warnings: RiskWarning[] = [];

  // 1. Extreme Tail Loss Risk (VaR / CVaR)
  if (varMetrics.cvar95 > 4000) {
    warnings.push({
      severity: "critical",
      message: `Expected Tail Loss (CVaR 95%) is high at $${varMetrics.cvar95.toLocaleString()}. Tail risk exceeds risk tolerance limits.`,
    });
  } else if (varMetrics.var95 > 2500) {
    warnings.push({
      severity: "warning",
      message: `Value at Risk (VaR 95%) is elevated at $${varMetrics.var95.toLocaleString()} over a 10-day horizon.`,
    });
  }

  // 2. Convexity (Gamma) risk
  if (convMapping.gammaVulnerabilityScore > 75) {
    warnings.push({
      severity: "critical",
      message: `High Gamma fragility (score ${convMapping.gammaVulnerabilityScore}/100) near short strikes. Rapid spot price moves will accelerate losses.`,
    });
  } else if (convMapping.gammaClass === "concave") {
    warnings.push({
      severity: "warning",
      message: "Concave (negative Gamma) profile detected. Portfolio delta is unstable under large price swings.",
    });
  }

  // 3. Volatility (Vega) mismatch
  if (netGreeks.vega < -150 && volExposure.volatilitySkewRisk === "high") {
    warnings.push({
      severity: "warning",
      message: "Front-end short Vega concentration detected. Portfolio is highly fragile under sudden VIX expansions.",
    });
  }

  // 4. Diversification
  if (diversificationIndex < 40) {
    warnings.push({
      severity: "warning",
      message: `Low diversification index (${diversificationIndex}/100). Concentrated asset weights increase idiosyncratic risk.`,
    });
  }

  // 5. Net Carry Drag (Theta)
  if (netGreeks.theta < -100) {
    warnings.push({
      severity: "info",
      message: `Time decay drag (Theta) is carrying -$${Math.abs(netGreeks.theta).toFixed(0)}/day. Review long options premium carry costs.`,
    });
  }

  return warnings;
}
