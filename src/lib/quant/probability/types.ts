export interface ProbabilityCone {
  dte: number;
  oneStdDev: number;
  twoStdDev: number;
  upper1Sigma: number;
  lower1Sigma: number;
  upper2Sigma: number;
  lower2Sigma: number;
}

export interface DistributionParams {
  mean: number;
  stdDev: number;
}
