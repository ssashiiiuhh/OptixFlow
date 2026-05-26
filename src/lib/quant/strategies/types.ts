import type { OptionType, OptionSide } from "../greeks/types";

export interface OptionLeg {
  type: OptionType;
  side: OptionSide;
  strike: number;
  quantity: number;
}

export interface ThesisInput {
  direction: "bullish" | "bearish" | "neutral" | "volatile";
  magnitude: "small" | "moderate" | "large";
  horizon: 7 | 14 | 30 | 60;
  ivExpectation: "expansion" | "stable" | "crush";
  riskAppetite: "defined" | "moderate" | "aggressive";
}

export interface IntelGreekProfile {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface StrategyIntelResult {
  id: string;
  name: string;
  score: number; // 0 to 100
  confidence: "HIGH" | "MEDIUM" | "LOW";
  complexity: "BASIC" | "INTERMEDIATE" | "ADVANCED";
  regimeCompatibility: string;
  greekProfile: IntelGreekProfile;
  reasoning: string;
  telemetryLogs: string[];
}

export interface StrategySpec {
  id: string;
  name: string;
  complexity: "BASIC" | "INTERMEDIATE" | "ADVANCED";
  volBias: "long" | "short";
}
