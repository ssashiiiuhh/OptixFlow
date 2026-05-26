// ============================================================================
// OPTIXFLOW — Portfolio Intelligence React Context Provider
// Manages ticking spot prices, IV, dynamic Greeks netting, and Monte Carlo VaR.
// ============================================================================

"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  PositionLeg,
  StrategyHoldingGroup,
  VaRMetrics,
  RiskSurfacePoint,
  PortfolioGreeks as QuantPortfolioGreeks,
} from "@/lib/portfolio/types/portfolioTypes";
import {
  groupPositionsIntoStrategies,
  rollupExposureByBias,
  computeDirectionalExposure,
  computeVolatilityExposure,
  computeConvexityMapping,
  generateExposureTopology,
  runDeterministicScenarios,
  runPortfolioMonteCarlo,
  generatePortfolioNarration,
} from "@/lib/portfolio";
import { RAW_LEGS, SPOT_PRICES as INITIAL_SPOT_PRICES, IVS as INITIAL_IVS } from "@/lib/portfolio-data";

// ── Types mapping to match existing dashboard expectations ──────────────────

export type StrategyType =
  | "Long Call"
  | "Long Put"
  | "Bull Call Spread"
  | "Bear Put Spread"
  | "Iron Condor"
  | "Covered Call"
  | "Protective Put"
  | "Straddle";

export type HoldingStatus = "profit" | "loss" | "flat";
export type DirectionBias = "bullish" | "bearish" | "neutral" | "volatile";

export interface StrategyHolding {
  id: string;
  ticker: string;
  strategy: StrategyType;
  expiry: string;
  daysToExpiry: number;
  quantity: number;
  costBasis: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
  status: HoldingStatus;
  bias: DirectionBias;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv: number;
  strikes: string;
  sector: string;
  riskScore: number;
  color: string;
}

export interface PortfolioGreeks {
  totalDelta: number;
  totalGamma: number;
  totalTheta: number;
  totalVega: number;
  netPnl: number;
  totalCost: number;
  winRate: number;
  avgIV: number;
  maxRisk: number;
}

export interface ExposureSegment {
  id: string;
  label: string;
  value: number;
  pct: number;
  color: string;
  glowColor: string;
  description: string;
  strategies: string[];
}

export interface PLPoint {
  date: string;
  pnl: number;
  cumulative: number;
  event?: string;
  eventType?: "earnings" | "crash" | "spike" | "recovery";
}

export interface Scenario {
  id: string;
  label: string;
  description: string;
  color: string;
  icon: string;
  assumptions: string;
  pnlImpact: number;
  ivChange: number;
  spotChange: number;
  holdingImpacts: Record<string, number>;
}

// ── Context Interface ────────────────────────────────────────────────────────

interface PortfolioContextType {
  spotPrices: Record<string, number>;
  ivs: Record<string, number>;
  isTicking: boolean;
  setIsTicking: (ticking: boolean) => void;
  holdings: StrategyHolding[];
  portfolioGreeks: PortfolioGreeks;
  greeksRadar: { axis: string; value: number; raw: number; color: string }[];
  exposureSegments: ExposureSegment[];
  plTimeline: PLPoint[];
  scenarios: Scenario[];
  varMetrics: VaRMetrics;
  meanPnl: number;
  expectedStdDev: number;
  narration: string[];
  manualTick: () => void;
  resetPortfolio: () => void;
  priceDirections: Record<string, "up" | "down" | "flat">;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

// ── Initial P&L baseline timeline ───────────────────────────────────────────
const BASELINE_PL_TIMELINE: PLPoint[] = [
  { date: "Apr 1",  pnl: 0,    cumulative: 0 },
  { date: "Apr 7",  pnl: 420,  cumulative: 420 },
  { date: "Apr 14", pnl: 380,  cumulative: 800 },
  { date: "Apr 21", pnl: -640, cumulative: 160,  event: "Fed shock",  eventType: "crash" },
  { date: "Apr 28", pnl: 290,  cumulative: 450 },
  { date: "May 5",  pnl: 820,  cumulative: 1270, event: "AAPL earnings", eventType: "earnings" },
  { date: "May 12", pnl: -310, cumulative: 960 },
  { date: "May 19", pnl: 540,  cumulative: 1500 },
  { date: "May 26", pnl: 480,  cumulative: 1980, event: "Vol spike", eventType: "spike" },
];

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [spotPrices, setSpotPrices] = useState<Record<string, number>>(INITIAL_SPOT_PRICES);
  const [ivs, setIvs] = useState<Record<string, number>>(INITIAL_IVS);
  const [isTicking, setIsTicking] = useState<boolean>(false);
  const [tickCount, setTickCount] = useState<number>(0);
  const [priceDirections, setPriceDirections] = useState<Record<string, "up" | "down" | "flat">>({});

  // Capture ticking P&L walk history
  const [tickingHistory, setTickingHistory] = useState<PLPoint[]>([]);

  // Reset to initial baseline state
  const resetPortfolio = useCallback(() => {
    setSpotPrices(INITIAL_SPOT_PRICES);
    setIvs(INITIAL_IVS);
    setIsTicking(false);
    setTickCount(0);
    setTickingHistory([]);
    setPriceDirections({});
  }, []);

  // Performs a single ticking step (random walk walk)
  const manualTick = useCallback(() => {
    setSpotPrices((prevSpot) => {
      const nextSpot = { ...prevSpot };
      const nextDirs: Record<string, "up" | "down" | "flat"> = {};

      Object.keys(nextSpot).forEach((ticker) => {
        const change = 1 + (Math.random() - 0.5) * 0.005; // Small random move ±0.25%
        const prevVal = nextSpot[ticker];
        const nextVal = Math.round(prevVal * change * 100) / 100;
        nextSpot[ticker] = nextVal;

        if (nextVal > prevVal) nextDirs[ticker] = "up";
        else if (nextVal < prevVal) nextDirs[ticker] = "down";
        else nextDirs[ticker] = "flat";
      });

      setPriceDirections(nextDirs);
      return nextSpot;
    });

    setIvs((prevIvs) => {
      const nextIvs = { ...prevIvs };
      Object.keys(nextIvs).forEach((ticker) => {
        const change = 1 + (Math.random() - 0.5) * 0.015; // Fluctuate IV ±0.75%
        nextIvs[ticker] = Math.max(0.05, Math.min(1.5, Math.round(prevIvs[ticker] * change * 1000) / 1000));
      });
      return nextIvs;
    });

    setTickCount((prev) => prev + 1);
  }, []);

  // Background interval for ticking simulation
  useEffect(() => {
    if (!isTicking) return;
    const interval = setInterval(() => {
      manualTick();
    }, 1500);
    return () => clearInterval(interval);
  }, [isTicking, manualTick]);

  // Recalculate portfolio parameters dynamically based on current spotPrices and ivs
  const quantData = useMemo(() => {
    // 1. Group positions into strategies using our quant library
    const strategyGroups = groupPositionsIntoStrategies(RAW_LEGS, spotPrices, ivs);

    // 2. Map groups to Holdings structure expected by dashboard
    const holdings: StrategyHolding[] = strategyGroups.map((g) => ({
      id: g.id,
      ticker: g.ticker,
      strategy: g.strategyName as StrategyType,
      expiry: g.daysToExpiry === 0 ? "—" : `Jun 20 '25`,
      daysToExpiry: g.daysToExpiry,
      quantity: g.quantity,
      costBasis: Math.round(g.costBasis),
      currentValue: Math.round(g.currentValue),
      pnl: Math.round(g.pnl),
      pnlPct: Math.round(g.pnlPct * 10) / 10,
      status: g.pnl > 10 ? "profit" : g.pnl < -10 ? "loss" : "flat",
      bias: g.bias as DirectionBias,
      delta: Math.round(g.greeks.delta * 100) / 100,
      gamma: Math.round(g.greeks.gamma * 1000) / 1000,
      theta: Math.round(g.greeks.theta * 10) / 10,
      vega: Math.round(g.greeks.vega * 10) / 10,
      iv: Math.round((ivs[g.ticker] || 0.25) * 1000) / 10,
      strikes: g.strikes,
      sector: g.sector,
      riskScore: g.riskScore,
      color: g.color,
    }));

    // 3. Compute net metrics
    const totalCost = strategyGroups.reduce((sum, g) => sum + Math.abs(g.costBasis), 0);
    const netPnl = strategyGroups.reduce((sum, g) => sum + g.pnl, 0);

    const totalDelta = strategyGroups.reduce((sum, g) => sum + g.greeks.delta, 0);
    const totalGamma = strategyGroups.reduce((sum, g) => sum + g.greeks.gamma, 0);
    const totalTheta = strategyGroups.reduce((sum, g) => sum + g.greeks.theta, 0);
    const totalVega = strategyGroups.reduce((sum, g) => sum + g.greeks.vega, 0);

    const activeIvs = Object.values(ivs);
    const avgIV = Math.round((activeIvs.reduce((a, b) => a + b, 0) / activeIvs.length) * 1000) / 10;

    const portfolioGreeks: PortfolioGreeks = {
      totalDelta: Math.round(totalDelta * 100) / 100,
      totalGamma: Math.round(totalGamma * 1000) / 1000,
      totalTheta: Math.round(totalTheta * 10) / 10,
      totalVega: Math.round(totalVega * 10) / 10,
      netPnl: Math.round(netPnl),
      totalCost: Math.round(totalCost),
      winRate: 0.571,
      avgIV,
      maxRisk: 8200,
    };

    // 4. Normalized Greeks Radar (relative scaling to fit within 0-100 radar domain)
    const greeksRadar = [
      { axis: "Delta", value: Math.min(100, Math.max(0, 50 + (portfolioGreeks.totalDelta / 200) * 50)), raw: portfolioGreeks.totalDelta, color: "#00d4ff" },
      { axis: "Gamma", value: Math.min(100, Math.max(0, Math.abs(portfolioGreeks.totalGamma) * 1500)), raw: portfolioGreeks.totalGamma, color: "#a855f7" },
      { axis: "Theta", value: Math.min(100, Math.max(0, (Math.abs(portfolioGreeks.totalTheta) / 300) * 100)), raw: portfolioGreeks.totalTheta, color: "#ff4d6a" },
      { axis: "Vega",  value: Math.min(100, Math.max(0, (Math.abs(portfolioGreeks.totalVega) / 400) * 100)), raw: portfolioGreeks.totalVega, color: "#00e5a0" },
      { axis: "Risk",  value: 41, raw: 41, color: "#f5a623" },
    ];

    // 5. Roll up dynamic exposure segments
    const exposureSegments: ExposureSegment[] = rollupExposureByBias(strategyGroups).map((s) => ({
      id: s.id,
      label: s.label,
      value: s.value,
      pct: s.pct,
      color: s.color,
      glowColor: s.glowColor,
      description: s.description,
      strategies: s.strategies,
    }));

    // 6. Macro scenarios pricing shocks
    const stressResults = runDeterministicScenarios(strategyGroups, spotPrices, spotPrices);
    const iconMap: Record<string, string> = { crash: "💥", vol_spike: "⚡", earnings: "📊", sideways: "→" };
    const colorMap: Record<string, string> = { crash: "#ff4d6a", vol_spike: "#a855f7", earnings: "#f5a623", sideways: "#00d4ff" };
    const assumptionsMap: Record<string, string> = {
      crash: "Spot −10%, IV +35%, correlation convergence",
      vol_spike: "Spot flat, IV +50%, skew expansion",
      earnings: "Spot +5%, IV crush −30%, smile flattening",
      sideways: "Spot flat, IV unchanged, 15d time decay",
    };

    const scenarios: Scenario[] = stressResults.map((r) => {
      const holdingImpacts: Record<string, number> = {};
      strategyGroups.forEach((g, idx) => {
        const mockHoldingId = `h${idx + 1}`;
        holdingImpacts[mockHoldingId] = r.holdingImpacts[g.id] ?? 0;
      });

      return {
        id: r.id,
        label: r.label,
        description: r.description,
        color: colorMap[r.id] || "#00d4ff",
        icon: iconMap[r.id] || "→",
        assumptions: assumptionsMap[r.id] || "",
        pnlImpact: Math.round(r.pnlImpact),
        ivChange: r.ivChange,
        spotChange: r.spotChange,
        holdingImpacts,
      };
    });

    // 7. Value at Risk Monte Carlo Simulation (using our runPortfolioMonteCarlo)
    const mcResult = runPortfolioMonteCarlo(strategyGroups, spotPrices, ivs, 10, 500); // 500 paths for fast UI updates

    // 8. Generate dynamic narration logs
    const dirExposure = computeDirectionalExposure(strategyGroups, spotPrices, totalCost);
    const volExposure = computeVolatilityExposure(strategyGroups);
    const convMapping = computeConvexityMapping(strategyGroups, spotPrices);
    const topology = generateExposureTopology(strategyGroups);

    const narration = generatePortfolioNarration({
      holdingsCount: strategyGroups.length,
      assetsCount: Object.keys(spotPrices).length,
      netGreeks: {
        delta: totalDelta,
        gamma: totalGamma,
        theta: totalTheta,
        vega: totalVega,
        rho: 0,
      },
      dirExposure,
      volExposure,
      convMapping,
      topology,
    });

    return {
      holdings,
      portfolioGreeks,
      greeksRadar,
      exposureSegments,
      scenarios,
      varMetrics: mcResult.varMetrics,
      meanPnl: mcResult.meanPnl,
      expectedStdDev: mcResult.expectedStdDev,
      narration,
    };
  }, [spotPrices, ivs]);

  // Keep historical ticking timeline updated
  useEffect(() => {
    if (tickCount === 0) {
      setTickingHistory([]);
      return;
    }

    setTickingHistory((prev) => {
      // Limit walk list to the last 15 ticks to avoid cluttering charts
      const next = [...prev];
      if (next.length >= 15) {
        next.shift();
      }
      
      const lastVal = next[next.length - 1]?.cumulative ?? BASELINE_PL_TIMELINE[BASELINE_PL_TIMELINE.length - 1].cumulative;
      const netPnl = quantData.portfolioGreeks.netPnl;
      const tickLabel = `T+${tickCount}`;

      next.push({
        date: tickLabel,
        pnl: Math.round(netPnl - lastVal),
        cumulative: Math.round(netPnl),
      });

      return next;
    });
  }, [tickCount, quantData.portfolioGreeks.netPnl]);

  // Merge baseline timeline with live ticking walk
  const plTimeline = useMemo(() => {
    return [...BASELINE_PL_TIMELINE, ...tickingHistory];
  }, [tickingHistory]);

  return (
    <PortfolioContext.Provider
      value={{
        spotPrices,
        ivs,
        isTicking,
        setIsTicking,
        holdings: quantData.holdings,
        portfolioGreeks: quantData.portfolioGreeks,
        greeksRadar: quantData.greeksRadar,
        exposureSegments: quantData.exposureSegments,
        plTimeline,
        scenarios: quantData.scenarios,
        varMetrics: quantData.varMetrics,
        meanPnl: quantData.meanPnl,
        expectedStdDev: quantData.expectedStdDev,
        narration: quantData.narration,
        manualTick,
        resetPortfolio,
        priceDirections,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error("usePortfolio must be used within a PortfolioProvider");
  }
  return context;
}
