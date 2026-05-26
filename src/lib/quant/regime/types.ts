import type { VolatilityRegime } from "../volatility/types";

export type { VolatilityRegime };

export type SuitabilityRating =
  | "HIGHLY_FAVORED"
  | "FAVORED"
  | "NEUTRAL"
  | "VULNERABLE"
  | "HIGHLY_VULNERABLE";

export interface SuitabilityResult {
  strategyId: string;
  strategyName: string;
  score: number; // 0 to 100 rating
  suitability: SuitabilityRating;
  reason: string;
  greeksWarning: string;
  volatilityMatch: "align" | "neutral" | "mismatch";
  directionalMatch: "align" | "neutral" | "mismatch";
}

export interface RegimeCharacteristics {
  regime: VolatilityRegime;
  label: string;
  description: string;
  vixRange: string;
  suitabilityFocus: string;
}
