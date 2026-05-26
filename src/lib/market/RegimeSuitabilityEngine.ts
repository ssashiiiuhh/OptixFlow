import { evaluateStrategySuitability as evaluateSuitability } from "../quant/regime/suitability";
import { MarketAsset } from "./MarketDataService";
import { SuitabilityResult, SuitabilityRating } from "../quant/regime/types";

export type { SuitabilityRating, SuitabilityResult };

/**
 * Compatibility wrapper routing to the centralized pure RegimeEngine.
 */
export function evaluateStrategySuitability(
  strategyId: string,
  asset: MarketAsset
): SuitabilityResult {
  return evaluateSuitability(strategyId, asset.regime, asset.changePct);
}
