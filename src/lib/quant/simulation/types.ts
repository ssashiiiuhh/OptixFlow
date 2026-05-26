export interface ScenarioGridConfig {
  spotMoves: number[]; // percentage shifts, e.g. [-0.10, -0.05, 0, 0.05, 0.10]
  volMoves: number[];  // percentage point shifts, e.g. [-10, -5, 0, 5, 10, 15]
}

export interface StressCell {
  spotShift: number;
  volShift: number;
  price: number;
  iv: number;
  pnl: number;
}

export interface StressRow {
  volShift: number;
  cells: StressCell[];
}

export interface StressGridResult {
  spotMoves: number[];
  volMoves: number[];
  rows: StressRow[];
}

export interface MonteCarloConfig {
  spot: number;
  iv: number;         // annual IV (e.g. 0.30)
  r?: number;         // interest rate (e.g. 0.05)
  dte: number;        // days to expiration
  pathsCount?: number;
  stepsCount?: number;
}

export interface MonteCarloResult {
  paths: number[][]; // [pathIndex][stepIndex]
  terminalPrices: number[];
  mean: number;
  stdDev: number;
  percentiles: {
    p10: number;
    p50: number;
    p90: number;
  };
}
