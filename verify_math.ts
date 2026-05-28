import { bsmPrice, bsmGreeks } from './src/lib/quant/greeks/bsm';
import { solveIV } from './src/lib/quant/volatility/ivSolver';


function runTests() {
  console.log("=== HIGH-PRECISION QUANT ENGINE VERIFICATION ===\n");

  const tests = [
    { name: "Standard ATM Option", spot: 100, strike: 100, t: 1.0, iv: 0.20, r: 0.05, q: 0.0 },
    { name: "Standard ITM Call (Dividend)", spot: 100, strike: 90, t: 0.5, iv: 0.20, r: 0.05, q: 0.02 },
    { name: "Extreme Boundary: Seconds to Expiry (T=0.00001)", spot: 100, strike: 100, t: 0.00001, iv: 0.20, r: 0.05, q: 0.0 },
    { name: "Extreme Boundary: Meme Stock Vol (IV=500%)", spot: 100, strike: 100, t: 1.0, iv: 5.0, r: 0.05, q: 0.0 },
    { name: "Extreme Boundary: Deep OTM (S << K)", spot: 10, strike: 100, t: 0.5, iv: 0.30, r: 0.05, q: 0.0 },
    { name: "Extreme Boundary: Deep ITM (S >> K)", spot: 200, strike: 100, t: 0.5, iv: 0.30, r: 0.05, q: 0.0 },
  ];

  for (const t of tests) {
    console.log(`--- ${t.name} ---`);
    const callPrice = bsmPrice(t.spot, t.strike, t.t, t.iv, t.r, "call", t.q);
    const putPrice = bsmPrice(t.spot, t.strike, t.t, t.iv, t.r, "put", t.q);
    const callGreeks = bsmGreeks(t.spot, t.strike, t.t, t.iv, t.r, "call", t.q);
    
    console.log(`Call Price: ${callPrice.toFixed(6)} | Put Price: ${putPrice.toFixed(6)}`);
    console.log(`Call Delta: ${callGreeks.delta.toFixed(6)} | Gamma: ${callGreeks.gamma.toFixed(6)} | Vega: ${callGreeks.vega.toFixed(6)}`);
    
    // Put-Call Parity Check: C - P = S*e^(-qT) - K*e^(-rT)
    const impliedParity = callPrice - putPrice;
    const theoreticalParity = t.spot * Math.exp(-t.q * t.t) - t.strike * Math.exp(-t.r * t.t);
    const parityError = Math.abs(impliedParity - theoreticalParity);
    console.log(`Put-Call Parity Error: ${parityError.toExponential(4)}\n`);
  }
  
  console.log("=== HYBRID IV SOLVER VERIFICATION ===\n");
  
  const ivTests = [
    { name: "Standard ATM Option", targetPrice: 10.450583, spot: 100, strike: 100, t: 1.0, r: 0.05, type: "call" as const, q: 0.0 },
    { name: "Deep OTM (Low Vega -> Brent's)", targetPrice: 0.01, spot: 50, strike: 100, t: 0.5, r: 0.05, type: "call" as const, q: 0.0 },
    { name: "High Volatility (Meme Stock)", targetPrice: 90.0, spot: 100, strike: 100, t: 1.0, r: 0.05, type: "call" as const, q: 0.0 },
    { name: "Arbitrage Violation (Target < Intrinsic)", targetPrice: 5.0, spot: 120, strike: 100, t: 0.5, r: 0.05, type: "call" as const, q: 0.0 },
  ];
  
  for (const t of ivTests) {
    console.log(`--- ${t.name} ---`);
    const result = solveIV(t.targetPrice, t.spot, t.strike, t.t, t.r, t.type, t.q);
    console.log(`Solver Method: ${result.method.toUpperCase()} | Iterations: ${result.iterations}`);
    
    if (result.arbitrageViolation) {
      console.log(`[ALERT] Arbitrage Violation Detected. Returned IV: 0\n`);
    } else {
      console.log(`Solved IV: ${(result.iv * 100).toFixed(6)}% | Residual Error: ${result.residualError.toExponential(4)}\n`);
    }
  }
}

runTests();

