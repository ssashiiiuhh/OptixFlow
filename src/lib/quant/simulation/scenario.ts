import { bsmPrice } from "../greeks/bsm";
import { calculateStrikeIv } from "../volatility/surface";
import { OptionLeg } from "../strategies/types";
import { StressGridResult } from "./types";

/**
 * Pure function: Generates a 2D Risk Profile Stress Grid (What-If matrix).
 * Shows P&L response and Greeks under Spot move (-10% to +10%) vs IV move (-10% to +15%).
 */
export function generateStressGrid(params: {
  spot: number;
  baseIv: number; // e.g. 30 for 30%
  legs: OptionLeg[];
  dte: number;
  qty?: number;
  skewSteepness: number;
  skewTilt: number;
  isBackwardation: boolean;
  r?: number;
}): StressGridResult {
  const {
    spot,
    baseIv,
    legs,
    dte,
    qty = 1,
    skewSteepness,
    skewTilt,
    isBackwardation,
    r = 0.05
  } = params;

  const t = dte / 365;

  // Grid coordinates
  const spotMoves = [-0.10, -0.05, -0.02, 0, 0.02, 0.05, 0.10];
  const volMoves = [-10, -5, 0, 5, 10, 15]; // IV percentage point changes

  // Calculate baseline strategy price
  const baselineValue = legs.reduce((acc, leg) => {
    const strikeIv = calculateStrikeIv(spot, leg.strike, dte, baseIv, skewSteepness, skewTilt, isBackwardation);
    const sign = leg.side === "long" ? 1 : -1;
    return acc + bsmPrice(spot, leg.strike, t, strikeIv, r, leg.type) * sign * leg.quantity;
  }, 0);

  const rows = volMoves.map((volShift) => {
    const cells = spotMoves.map((spotShift) => {
      const stressedSpot = spot * (1 + spotShift);
      const stressedIvBase = Math.max(5.0, baseIv + volShift);
      
      // Price under stress
      const stressedValue = legs.reduce((acc, leg) => {
        const strikeIv = calculateStrikeIv(stressedSpot, leg.strike, dte, stressedIvBase, skewSteepness, skewTilt, isBackwardation);
        const sign = leg.side === "long" ? 1 : -1;
        return acc + bsmPrice(stressedSpot, leg.strike, t, strikeIv, r, leg.type) * sign * leg.quantity;
      }, 0);

      const pnl = (stressedValue - baselineValue) * qty * 100; // scale for 100 contracts

      return {
        spotShift,
        volShift,
        price: Math.round(stressedSpot * 100) / 100,
        iv: Math.round(stressedIvBase * 10) / 10,
        pnl: Math.round(pnl),
      };
    });

    return {
      volShift,
      cells,
    };
  });

  return {
    spotMoves,
    volMoves,
    rows,
  };
}
