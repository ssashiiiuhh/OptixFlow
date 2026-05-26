// ============================================================================
// OPTIXFLOW — Portfolio Intelligence React Context Provider
// v2: Adds Delta-Hedger, Historical Playback, and AI Narration systems.
// ============================================================================

"use client";

import React, {
  createContext, useContext, useState, useEffect,
  useMemo, useCallback, useRef,
} from "react";
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
import { computeHedgeSignal, type DeltaHedgerState } from "@/lib/portfolio/hedger/deltaHedger";
import { HISTORICAL_SCENARIOS, type HistoricalScenario } from "@/lib/portfolio/playback/historicalScenarios";

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Context Interface ─────────────────────────────────────────────────────────

interface PortfolioContextType {
  // Core market state
  spotPrices: Record<string, number>;
  ivs: Record<string, number>;
  isTicking: boolean;
  setIsTicking: (ticking: boolean) => void;
  priceDirections: Record<string, "up" | "down" | "flat">;

  // Quant data
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

  // Ticking controls
  manualTick: () => void;
  resetPortfolio: () => void;

  // Delta Hedger
  hedgerState: DeltaHedgerState | null;
  autoHedgeEnabled: boolean;
  setAutoHedgeEnabled: (enabled: boolean) => void;
  simulateHedge: () => void;
  hedgeTolerance: number;
  setHedgeTolerance: (v: number) => void;

  // Historical Playback
  playbackMode: boolean;
  playbackScenarioId: string | null;
  playbackFrameIndex: number;
  playbackIsPlaying: boolean;
  setPlaybackScenario: (id: string) => void;
  stepPlayback: (delta: number) => void;
  togglePlayback: () => void;
  resetPlayback: () => void;
  exitPlayback: () => void;

  // AI Narration
  aiNarrationLines: string[];
  isNarrating: boolean;
  requestAINarration: () => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

// ── Baseline P&L Timeline ─────────────────────────────────────────────────────

const BASELINE_PL_TIMELINE: PLPoint[] = [
  { date: "Apr 1",  pnl: 0,    cumulative: 0 },
  { date: "Apr 7",  pnl: 420,  cumulative: 420 },
  { date: "Apr 14", pnl: 380,  cumulative: 800 },
  { date: "Apr 21", pnl: -640, cumulative: 160,  event: "Fed shock",     eventType: "crash" },
  { date: "Apr 28", pnl: 290,  cumulative: 450 },
  { date: "May 5",  pnl: 820,  cumulative: 1270, event: "AAPL earnings", eventType: "earnings" },
  { date: "May 12", pnl: -310, cumulative: 960 },
  { date: "May 19", pnl: 540,  cumulative: 1500 },
  { date: "May 26", pnl: 480,  cumulative: 1980, event: "Vol spike",     eventType: "spike" },
];

// ── Provider ──────────────────────────────────────────────────────────────────

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  // Core market state
  const [spotPrices, setSpotPrices] = useState<Record<string, number>>(INITIAL_SPOT_PRICES);
  const [ivs, setIvs] = useState<Record<string, number>>(INITIAL_IVS);
  const [isTicking, setIsTicking] = useState(false);
  const [tickCount, setTickCount] = useState(0);
  const [priceDirections, setPriceDirections] = useState<Record<string, "up" | "down" | "flat">>({});
  const [tickingHistory, setTickingHistory] = useState<PLPoint[]>([]);

  // Delta Hedger
  const [autoHedgeEnabled, setAutoHedgeEnabled] = useState(false);
  const [hedgeTolerance, setHedgeTolerance] = useState(50);
  const [simulatedHedgeDelta, setSimulatedHedgeDelta] = useState(0);

  // Historical Playback
  const [playbackMode, setPlaybackMode] = useState(false);
  const [playbackScenarioId, setPlaybackScenarioIdState] = useState<string | null>(null);
  const [playbackFrameIndex, setPlaybackFrameIndex] = useState(0);
  const [playbackIsPlaying, setPlaybackIsPlaying] = useState(false);
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // AI Narration
  const [aiNarrationLines, setAiNarrationLines] = useState<string[]>([]);
  const [isNarrating, setIsNarrating] = useState(false);
  const narrationTickRef = useRef(0);

  // ── Reset ────────────────────────────────────────────────────────────────

  const resetPortfolio = useCallback(() => {
    setSpotPrices(INITIAL_SPOT_PRICES);
    setIvs(INITIAL_IVS);
    setIsTicking(false);
    setTickCount(0);
    setTickingHistory([]);
    setPriceDirections({});
    setSimulatedHedgeDelta(0);
  }, []);

  // ── Ticking Engine ───────────────────────────────────────────────────────

  const manualTick = useCallback(() => {
    if (playbackMode) return; // Don't tick during playback
    setSpotPrices((prev) => {
      const next = { ...prev };
      const dirs: Record<string, "up" | "down" | "flat"> = {};
      Object.keys(next).forEach((t) => {
        const change = 1 + (Math.random() - 0.5) * 0.005;
        const prev2 = next[t];
        const val = Math.round(prev2 * change * 100) / 100;
        next[t] = val;
        dirs[t] = val > prev2 ? "up" : val < prev2 ? "down" : "flat";
      });
      setPriceDirections(dirs);
      return next;
    });
    setIvs((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((t) => {
        const change = 1 + (Math.random() - 0.5) * 0.015;
        next[t] = Math.max(0.05, Math.min(1.5, Math.round(prev[t] * change * 1000) / 1000));
      });
      return next;
    });
    setTickCount((c) => c + 1);
  }, [playbackMode]);

  useEffect(() => {
    if (!isTicking || playbackMode) return;
    const id = setInterval(manualTick, 1500);
    return () => clearInterval(id);
  }, [isTicking, manualTick, playbackMode]);

  // ── Historical Playback ──────────────────────────────────────────────────

  const applyPlaybackFrame = useCallback((scenario: HistoricalScenario, idx: number) => {
    const frame = scenario.frames[idx];
    if (!frame) return;
    setSpotPrices({ ...frame.spotPrices });
    setIvs({ ...frame.ivs });
    setPriceDirections({});
    setTickCount((c) => c + 1);
  }, []);

  const setPlaybackScenario = useCallback((id: string) => {
    const scenario = HISTORICAL_SCENARIOS.find((s) => s.id === id);
    if (!scenario) return;
    setPlaybackScenarioIdState(id);
    setPlaybackFrameIndex(0);
    setPlaybackMode(true);
    setPlaybackIsPlaying(false);
    setIsTicking(false);
    applyPlaybackFrame(scenario, 0);
  }, [applyPlaybackFrame]);

  const stepPlayback = useCallback((delta: number) => {
    const scenario = HISTORICAL_SCENARIOS.find((s) => s.id === playbackScenarioId);
    if (!scenario) return;
    setPlaybackFrameIndex((prev) => {
      const next = Math.max(0, Math.min(scenario.frames.length - 1, prev + delta));
      applyPlaybackFrame(scenario, next);
      return next;
    });
  }, [playbackScenarioId, applyPlaybackFrame]);

  const togglePlayback = useCallback(() => {
    setPlaybackIsPlaying((prev) => !prev);
  }, []);

  const resetPlayback = useCallback(() => {
    const scenario = HISTORICAL_SCENARIOS.find((s) => s.id === playbackScenarioId);
    if (!scenario) return;
    setPlaybackFrameIndex(0);
    setPlaybackIsPlaying(false);
    applyPlaybackFrame(scenario, 0);
  }, [playbackScenarioId, applyPlaybackFrame]);

  const exitPlayback = useCallback(() => {
    setPlaybackMode(false);
    setPlaybackIsPlaying(false);
    setPlaybackScenarioIdState(null);
    setPlaybackFrameIndex(0);
    resetPortfolio();
  }, [resetPortfolio]);

  // Playback auto-advance interval
  useEffect(() => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    if (!playbackIsPlaying || !playbackScenarioId) return;
    const scenario = HISTORICAL_SCENARIOS.find((s) => s.id === playbackScenarioId);
    if (!scenario) return;

    playbackIntervalRef.current = setInterval(() => {
      setPlaybackFrameIndex((prev) => {
        const next = prev + 1;
        if (next >= scenario.frames.length) {
          setPlaybackIsPlaying(false);
          return prev;
        }
        applyPlaybackFrame(scenario, next);
        return next;
      });
    }, 1200);

    return () => {
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
    };
  }, [playbackIsPlaying, playbackScenarioId, applyPlaybackFrame]);

  // ── Quant Calculations ───────────────────────────────────────────────────

  const quantData = useMemo(() => {
    const strategyGroups = groupPositionsIntoStrategies(RAW_LEGS, spotPrices, ivs);

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

    const totalCost = strategyGroups.reduce((s, g) => s + Math.abs(g.costBasis), 0);
    const netPnl = strategyGroups.reduce((s, g) => s + g.pnl, 0);
    const totalDelta = strategyGroups.reduce((s, g) => s + g.greeks.delta, 0) + simulatedHedgeDelta;
    const totalGamma = strategyGroups.reduce((s, g) => s + g.greeks.gamma, 0);
    const totalTheta = strategyGroups.reduce((s, g) => s + g.greeks.theta, 0);
    const totalVega = strategyGroups.reduce((s, g) => s + g.greeks.vega, 0);
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

    const greeksRadar = [
      { axis: "Delta", value: Math.min(100, Math.max(0, 50 + (portfolioGreeks.totalDelta / 200) * 50)), raw: portfolioGreeks.totalDelta, color: "#00d4ff" },
      { axis: "Gamma", value: Math.min(100, Math.max(0, Math.abs(portfolioGreeks.totalGamma) * 1500)),  raw: portfolioGreeks.totalGamma, color: "#a855f7" },
      { axis: "Theta", value: Math.min(100, Math.max(0, (Math.abs(portfolioGreeks.totalTheta) / 300) * 100)), raw: portfolioGreeks.totalTheta, color: "#ff4d6a" },
      { axis: "Vega",  value: Math.min(100, Math.max(0, (Math.abs(portfolioGreeks.totalVega) / 400) * 100)),  raw: portfolioGreeks.totalVega, color: "#00e5a0" },
      { axis: "Risk",  value: 41, raw: 41, color: "#f5a623" },
    ];

    const exposureSegments: ExposureSegment[] = rollupExposureByBias(strategyGroups).map((s) => ({
      id: s.id, label: s.label, value: s.value, pct: s.pct,
      color: s.color, glowColor: s.glowColor, description: s.description, strategies: s.strategies,
    }));

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
        holdingImpacts[`h${idx + 1}`] = r.holdingImpacts[g.id] ?? 0;
      });
      return {
        id: r.id, label: r.label, description: r.description,
        color: colorMap[r.id] || "#00d4ff", icon: iconMap[r.id] || "→",
        assumptions: assumptionsMap[r.id] || "",
        pnlImpact: Math.round(r.pnlImpact),
        ivChange: r.ivChange, spotChange: r.spotChange, holdingImpacts,
      };
    });

    const mcResult = runPortfolioMonteCarlo(strategyGroups, spotPrices, ivs, 10, 500);

    const dirExposure = computeDirectionalExposure(strategyGroups, spotPrices, totalCost);
    const volExposure = computeVolatilityExposure(strategyGroups);
    const convMapping = computeConvexityMapping(strategyGroups, spotPrices);
    const topology = generateExposureTopology(strategyGroups);

    const narration = generatePortfolioNarration({
      holdingsCount: strategyGroups.length,
      assetsCount: Object.keys(spotPrices).length,
      netGreeks: { delta: totalDelta, gamma: totalGamma, theta: totalTheta, vega: totalVega, rho: 0 },
      dirExposure, volExposure, convMapping, topology,
    });

    return { holdings, portfolioGreeks, greeksRadar, exposureSegments, scenarios, varMetrics: mcResult.varMetrics, meanPnl: mcResult.meanPnl, expectedStdDev: mcResult.expectedStdDev, narration };
  }, [spotPrices, ivs, simulatedHedgeDelta]);

  // ── Delta Hedger ─────────────────────────────────────────────────────────

  const hedgerState = useMemo<DeltaHedgerState>(() =>
    computeHedgeSignal(
      quantData.portfolioGreeks.totalDelta,
      spotPrices,
      -hedgeTolerance,
      hedgeTolerance,
    ),
    [quantData.portfolioGreeks.totalDelta, spotPrices, hedgeTolerance]
  );

  const simulateHedge = useCallback(() => {
    if (!hedgerState.recommendation) return;
    setSimulatedHedgeDelta((prev) => prev + hedgerState.recommendation!.deltaOffset);
  }, [hedgerState]);

  // Auto-hedge: apply when enabled and ticking
  useEffect(() => {
    if (!autoHedgeEnabled || !hedgerState.recommendation || !isTicking) return;
    if (hedgerState.severity === "critical" || hedgerState.severity === "warning") {
      setSimulatedHedgeDelta((prev) => prev + hedgerState.recommendation!.deltaOffset * 0.5);
    }
  }, [tickCount, autoHedgeEnabled, hedgerState, isTicking]);

  // ── P&L Timeline ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (tickCount === 0) { setTickingHistory([]); return; }
    setTickingHistory((prev) => {
      const next = [...prev];
      if (next.length >= 15) next.shift();
      const lastVal = next[next.length - 1]?.cumulative ?? BASELINE_PL_TIMELINE[BASELINE_PL_TIMELINE.length - 1].cumulative;
      next.push({
        date: `T+${tickCount}`,
        pnl: Math.round(quantData.portfolioGreeks.netPnl - lastVal),
        cumulative: Math.round(quantData.portfolioGreeks.netPnl),
      });
      return next;
    });
  }, [tickCount, quantData.portfolioGreeks.netPnl]);

  const plTimeline = useMemo(() =>
    [...BASELINE_PL_TIMELINE, ...tickingHistory],
    [tickingHistory]
  );

  // ── AI Narration ─────────────────────────────────────────────────────────

  const requestAINarration = useCallback(async () => {
    if (isNarrating) return;
    setIsNarrating(true);
    try {
      const activeScenario = HISTORICAL_SCENARIOS.find((s) => s.id === playbackScenarioId);
      const payload = {
        totalDelta: quantData.portfolioGreeks.totalDelta,
        totalGamma: quantData.portfolioGreeks.totalGamma,
        totalTheta: quantData.portfolioGreeks.totalTheta,
        totalVega: quantData.portfolioGreeks.totalVega,
        netPnl: quantData.portfolioGreeks.netPnl,
        avgIV: quantData.portfolioGreeks.avgIV,
        var95: quantData.varMetrics.var95,
        var99: quantData.varMetrics.var99,
        cvar: quantData.varMetrics.cvar99,
        isTicking,
        playbackMode,
        scenarioName: activeScenario?.name,
      };
      const res = await fetch("/api/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.body) throw new Error("No stream body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      // Seed a streaming placeholder line
      setAiNarrationLines((prev) => [...prev, "__STREAMING__"].slice(-40));
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // Update the last __STREAMING__ line with accumulated text
        setAiNarrationLines((prev) => {
          const next = [...prev];
          const lastIdx = next.length - 1;
          if (lastIdx >= 0 && next[lastIdx].startsWith("__STREAMING__")) {
            next[lastIdx] = `__STREAMING__${buffer}`;
          }
          return next;
        });
      }
      // Finalize — strip the marker from the last line
      setAiNarrationLines((prev) => {
        const next = [...prev];
        const lastIdx = next.length - 1;
        if (lastIdx >= 0 && next[lastIdx].startsWith("__STREAMING__")) {
          next[lastIdx] = buffer.trim();
        }
        return next.slice(-40);
      });
    } catch {
      setAiNarrationLines((prev) => [...prev, "[AI] Connection error — narration engine offline."]);
    } finally {
      setIsNarrating(false);
    }
  }, [isNarrating, quantData, isTicking, playbackMode, playbackScenarioId]);

  // Auto-narrate every 10 ticks while ticking
  useEffect(() => {
    narrationTickRef.current += 1;
    if (narrationTickRef.current % 10 === 0 && isTicking) {
      requestAINarration();
    }
  }, [tickCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Context Value ─────────────────────────────────────────────────────────

  return (
    <PortfolioContext.Provider
      value={{
        spotPrices, ivs, isTicking, setIsTicking, priceDirections,
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
        manualTick, resetPortfolio,
        hedgerState, autoHedgeEnabled, setAutoHedgeEnabled,
        simulateHedge, hedgeTolerance, setHedgeTolerance,
        playbackMode, playbackScenarioId, playbackFrameIndex,
        playbackIsPlaying, setPlaybackScenario, stepPlayback,
        togglePlayback, resetPlayback, exitPlayback,
        aiNarrationLines, isNarrating, requestAINarration,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) throw new Error("usePortfolio must be used within a PortfolioProvider");
  return context;
}
