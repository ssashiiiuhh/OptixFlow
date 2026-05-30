export type OptionType = "call" | "put";
export type OptionSide = "long" | "short";

export interface GreekSet {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  vanna: number;
  volga: number;
}

export interface OptionParams {
  spot: number;
  strike: number;
  timeToExpiry: number; // in years
  iv: number;           // decimal (e.g. 0.30)
  riskFreeRate?: number; // decimal (e.g. 0.05)
  type: OptionType;
}
