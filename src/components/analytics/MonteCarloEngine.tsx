"use client";

import React, { useState, useEffect, useMemo } from "react";
import { simulatePaths } from "@/lib/quant/simulation/montecarlo";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Compass, Settings, Loader2 } from "lucide-react";
import TactileInput from "@/components/ui/TactileInput";

export default function MonteCarloEngine() {
  const [spot, setSpot] = useState<number>(100);
  const [iv, setIv] = useState<number>(20);
  const [rate, setRate] = useState<number>(5);
  const [dte, setDte] = useState<number>(30);
  const [pathsCount, setPathsCount] = useState<number>(500);
  const [stepsCount, setStepsCount] = useState<number>(30);
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Debounced execution to prevent UI freezing while sliding
  useEffect(() => {
    setIsSimulating(true);
    const timeout = setTimeout(() => {
      const start = performance.now();
      const res = simulatePaths({
        spot,
        iv: iv / 100,
        r: rate / 100,
        dte,
        pathsCount,
        stepsCount
      });
      const end = performance.now();
      
      setResult({ ...res, computeTime: end - start });
      setIsSimulating(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [spot, iv, rate, dte, pathsCount, stepsCount]);

  // Recharts needs an array of objects.
  // We will map only the first 50 paths to avoid destroying the DOM with SVGs.
  const chartData = useMemo(() => {
    if (!result) return [];
    
    const displayPaths = Math.min(50, result.paths.length);
    const data = [];
    
    for (let step = 0; step <= stepsCount; step++) {
      const stepObj: any = { step };
      for (let p = 0; p < displayPaths; p++) {
        stepObj[`path_${p}`] = result.paths[p][step];
      }
      data.push(stepObj);
    }
    return data;
  }, [result, stepsCount]);

  // Histogram data for Area Chart (terminal price distribution)
  const densityData = useMemo(() => {
    if (!result) return [];
    
    // Create 30 buckets for terminal prices
    const prices = result.terminalPrices;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const bucketCount = 30;
    const bucketSize = (max - min) / bucketCount;
    
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      priceBucket: Math.round(min + (i * bucketSize)),
      count: 0
    }));
    
    for (const p of prices) {
      const bIdx = Math.min(bucketCount - 1, Math.floor((p - min) / bucketSize));
      buckets[bIdx].count++;
    }
    
    return buckets;
  }, [result]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#04060b]/75 p-6 font-mono overflow-y-auto">
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Compass size={20} className="text-purple-400" />
          <div>
            <h2 className="text-white font-bold tracking-tight text-lg">Monte Carlo Geometric Brownian Motion Simulator</h2>
            <p className="text-white/40 text-[10px] tracking-widest uppercase mt-1">Stochastic Volatility Risk Matrix</p>
          </div>
        </div>
        {isSimulating && (
          <div className="flex items-center gap-2 text-cyan-400 text-[10px] font-bold">
            <Loader2 size={14} className="animate-spin" />
            COMPUTING MATRIX...
          </div>
        )}
      </div>

      <div className="grid grid-cols-[300px_1fr] gap-6">
        
        {/* INPUTS PANEL */}
        <div className="flex flex-col gap-4 bg-black/40 border border-white/5 rounded-xl p-5 h-fit">
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Settings size={12} className="text-white/50" />
            Simulation Parameters
          </div>

          <div className="flex flex-col gap-3">
            <TactileInput
              label="Spot Price (S)"
              value={spot}
              onChange={setSpot}
              min={10} max={5000} step={0.5}
              colorClass="text-white"
              validationType="spot"
              prefix="$"
            />
            <TactileInput
              label="Implied Volatility (σ)"
              value={iv}
              onChange={setIv}
              min={1} max={1000} step={1}
              colorClass="text-purple-500"
              validationType="iv"
              suffix="%"
            />
            <TactileInput
              label="Risk-Free Rate (r)"
              value={rate}
              onChange={setRate}
              min={0} max={25} step={0.25}
              colorClass="text-white"
              validationType="rate"
              suffix="%"
            />
            <TactileInput
              label="Simulated DTE"
              value={dte}
              onChange={setDte}
              min={1} max={365} step={1}
              colorClass="text-white"
              validationType="dte"
              suffix="d"
            />
          </div>

          <div className="h-px bg-white/5 my-2" />

          <div className="flex flex-col gap-3">
            <TactileInput
              label="Simulation Paths (N)"
              value={pathsCount}
              onChange={setPathsCount}
              min={100} max={10000} step={100}
              colorClass="text-cyan-400"
              validationType="paths"
            />
            <TactileInput
              label="Time Steps (dt)"
              value={stepsCount}
              onChange={setStepsCount}
              min={5} max={252} step={5}
              colorClass="text-cyan-400"
              validationType="steps"
            />
          </div>
        </div>

        {/* OUTPUTS PANEL */}
        <div className="flex flex-col gap-6">
          
          {/* STATS HEADER */}
          {result && (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1">Mean Final Price</div>
                <div className="text-xl font-bold text-white">${result.mean.toFixed(2)}</div>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                <div className="text-[9px] text-emerald-400/50 uppercase tracking-widest mb-1">P90 (Top 10%)</div>
                <div className="text-xl font-bold text-emerald-400">${result.percentiles.p90.toFixed(2)}</div>
              </div>
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4">
                <div className="text-[9px] text-rose-400/50 uppercase tracking-widest mb-1">P10 (Bottom 10%)</div>
                <div className="text-xl font-bold text-rose-400">${result.percentiles.p10.toFixed(2)}</div>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1">Compute Time</div>
                <div className="text-xl font-bold text-white">{result.computeTime.toFixed(1)} <span className="text-xs text-white/30">ms</span></div>
              </div>
            </div>
          )}

          {/* VISUALIZATIONS */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-0">
            
            {/* GBM PATHS */}
            <div className="bg-black/40 border border-white/5 rounded-xl p-5 flex flex-col min-h-[300px]">
              <div className="text-[10px] text-white/30 uppercase tracking-widest mb-4">Geometric Brownian Paths (Displaying 50/{pathsCount})</div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="step" stroke="rgba(255,255,255,0.1)" tick={{ fontSize: 9 }} />
                    <YAxis domain={["auto", "auto"]} stroke="rgba(255,255,255,0.1)" tick={{ fontSize: 9 }} />
                    {chartData.length > 0 && Object.keys(chartData[0]).filter(k => k.startsWith("path_")).map((key, idx) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={`hsla(${(idx * 137.5) % 360}, 70%, 60%, 0.4)`}
                        strokeWidth={1}
                        dot={false}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* DISTRIBUTION DENSITY */}
            <div className="bg-black/40 border border-white/5 rounded-xl p-5 flex flex-col min-h-[300px]">
              <div className="text-[10px] text-white/30 uppercase tracking-widest mb-4">Terminal Price Distribution (N={pathsCount})</div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={densityData} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                    <defs>
                      <linearGradient id="colorDensity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="priceBucket" stroke="rgba(255,255,255,0.1)" tick={{ fontSize: 9 }} />
                    <YAxis stroke="rgba(255,255,255,0.1)" tick={{ fontSize: 9 }} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', borderColor: 'rgba(255,255,255,0.1)', fontSize: '10px' }}
                      itemStyle={{ color: '#a855f7' }}
                    />
                    <Area type="monotone" dataKey="count" stroke="#a855f7" fillOpacity={1} fill="url(#colorDensity)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
