import { bsmPrice, bsmGreeks } from "../greeks/bsm";
import { IVSolverResult } from "./types";

const MAX_ITERATIONS = 100;
const EPSILON = 1e-12;
const VEGA_FLOOR = 1e-10;

// Bounds for Brent's Method
const MIN_VOL = 1e-5;
const MAX_VOL = 5.0; // 500%

/**
 * Solves for Implied Volatility using a hybrid Newton-Raphson / Brent's Method engine.
 */
export function solveIV(
  targetPrice: number,
  spot: number,
  strike: number,
  t: number,
  r: number = 0.05,
  type: "call" | "put",
  q: number = 0.0
): IVSolverResult {
  // 1. Edge Case: Expired
  if (t <= 1e-8) {
    return { iv: 0, converged: false, iterations: 0, method: "failed", residualError: targetPrice };
  }

  // 2. No-Arbitrage (Intrinsic Value) Check
  const discountK = strike * Math.exp(-r * t);
  const discountS = spot * Math.exp(-q * t);
  const intrinsic = type === "call" ? Math.max(0, discountS - discountK) : Math.max(0, discountK - discountS);

  if (targetPrice < intrinsic) {
    return { iv: 0, converged: false, iterations: 0, method: "failed", residualError: intrinsic - targetPrice, arbitrageViolation: true };
  }

  // 3. Corrado-Miller Initialization Seed
  let seedVol = 0.3; // Fallback
  // Convert put to call equivalent for standard Corrado-Miller
  const callPrice = type === "call" ? targetPrice : targetPrice + discountS - discountK;
  const cDiff = callPrice - (discountS - discountK) / 2.0;
  const discriminant = cDiff * cDiff - (Math.pow(discountS - discountK, 2) / Math.PI);

  if (discriminant >= 0) {
    const c = Math.sqrt(2 * Math.PI) / (discountS + discountK);
    const cmVol = (c / Math.sqrt(t)) * (cDiff + Math.sqrt(discriminant));
    if (!isNaN(cmVol) && cmVol > 0) {
      seedVol = Math.min(Math.max(cmVol, MIN_VOL), MAX_VOL);
    }
  }

  // 4. Primary Engine: Newton-Raphson
  let iv = seedVol;
  let iterations = 0;
  
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    iterations++;
    const price = bsmPrice(spot, strike, t, iv, r, type, q);
    const diff = price - targetPrice;

    if (Math.abs(diff) < EPSILON) {
      return { iv, converged: true, iterations, method: "newton", residualError: diff };
    }

    const greeks = bsmGreeks(spot, strike, t, iv, r, type, q);
    // Note: bsmGreeks returns Vega scaled by 1/100, we need the raw derivative dP/dSigma
    const vega = greeks.vega * 100.0;

    // Guardrail: Vega Collapse
    if (vega < VEGA_FLOOR) {
      break; // Fallback to Brent's method
    }

    const step = diff / vega;
    iv -= step;

    // Boundary protection for Newton steps
    if (iv < MIN_VOL) iv = MIN_VOL;
    if (iv > MAX_VOL) break; // Let Brent's handle extreme IV > 500% if needed
  }

  // 5. Fallback Engine: Brent's Method
  return brentsMethod(targetPrice, spot, strike, t, r, type, q);
}

/**
 * Brent's root-finding method. Guaranteed to converge if the root is bracketed.
 * BSM price is monotonically increasing with IV, so it's perfectly suited for Brent.
 */
function brentsMethod(
  targetPrice: number,
  spot: number,
  strike: number,
  t: number,
  r: number,
  type: "call" | "put",
  q: number
): IVSolverResult {
  let a = MIN_VOL;
  let b = MAX_VOL;
  
  const f = (v: number) => bsmPrice(spot, strike, t, v, r, type, q) - targetPrice;
  
  let fa = f(a);
  let fb = f(b);

  if (fa * fb > 0) {
    // Root is not bracketed. Either target is too low (below intrinsic handled earlier) 
    // or too high (requires IV > 500%).
    return { iv: b, converged: false, iterations: 0, method: "brent", residualError: Math.abs(fb) };
  }

  if (Math.abs(fa) < Math.abs(fb)) {
    // Swap
    let tmp = a; a = b; b = tmp;
    tmp = fa; fa = fb; fb = tmp;
  }

  let c = a;
  let fc = fa;
  let mflag = true;
  let s = 0;
  let fs = 0;
  let d = 0;

  let iterations = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    iterations++;
    
    if (Math.abs(fb) < EPSILON || Math.abs(b - a) < EPSILON) {
      return { iv: b, converged: true, iterations, method: "brent", residualError: fb };
    }

    if (fa !== fc && fb !== fc) {
      // Inverse quadratic interpolation
      s = (a * fb * fc) / ((fa - fb) * (fa - fc)) +
          (b * fa * fc) / ((fb - fa) * (fb - fc)) +
          (c * fa * fb) / ((fc - fa) * (fc - fb));
    } else {
      // Secant method
      s = b - fb * ((b - a) / (fb - fa));
    }

    // Condition to use bisection instead
    const cond1 = (s < (3 * a + b) / 4 || s > b);
    const cond2 = mflag && Math.abs(s - b) >= Math.abs(b - c) / 2;
    const cond3 = !mflag && Math.abs(s - b) >= Math.abs(c - d) / 2;
    const cond4 = mflag && Math.abs(b - c) < EPSILON;
    const cond5 = !mflag && Math.abs(c - d) < EPSILON;

    if (cond1 || cond2 || cond3 || cond4 || cond5) {
      s = (a + b) / 2; // Bisection step
      mflag = true;
    } else {
      mflag = false;
    }

    fs = f(s);
    d = c;
    c = b;
    fc = fb;

    if (fa * fs < 0) {
      b = s;
      fb = fs;
    } else {
      a = s;
      fa = fs;
    }

    if (Math.abs(fa) < Math.abs(fb)) {
      // Swap
      let tmp = a; a = b; b = tmp;
      tmp = fa; fa = fb; fb = tmp;
    }
  }

  return { iv: b, converged: false, iterations, method: "brent", residualError: fb };
}
