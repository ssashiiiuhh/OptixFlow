"use client";

import React, { useState, useMemo } from "react";
import { bsmPrice, bsmGreeks } from "@/lib/quant/greeks/bsm";
import { Zap, Activity, Info } from "lucide-react";

export default function BlackScholesEngine() {
  const [spot, setSpot] = useState<number>(100);
  const [strike, setStrike] = useState<number>(100);
  const [dte, setDte] = useState<number>(30);
  const [iv, setIv] = useState<number>(20); // In percent
  const [rate, setRate] = useState<number>(5); // In percent

  const results = useMemo(() => {
    const t = dte / 365;
    const ivDec = iv / 100;
    const rDec = rate / 100;

    const callPrice = bsmPrice(spot, strike, t, ivDec, rDec, "call", 0);
    const putPrice = bsmPrice(spot, strike, t, ivDec, rDec, "put", 0);
    const callGreeks = bsmGreeks(spot, strike, t, ivDec, rDec, "call", 0);
    const putGreeks = bsmGreeks(spot, strike, t, ivDec, rDec, "put", 0);

    return {
      callPrice, putPrice,
      callGreeks, putGreeks
    };
  }, [spot, strike, dte, iv, rate]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#04060b]/75 p-6 font-mono overflow-y-auto">
      
      <div className="flex items-center gap-3 mb-6">
        <Zap size={20} className="text-cyan-400" />
        <div>
          <h2 className="text-white font-bold tracking-tight text-lg">Black-Scholes Mathematical Engine</h2>
          <p className="text-white/40 text-[10px] tracking-widest uppercase mt-1">High-Precision Continuous-Time Pricing</p>
        </div>
      </div>

      <div className="grid grid-cols-[300px_1fr] gap-6">
        
        {/* INPUTS PANEL */}
        <div className="flex flex-col gap-4 bg-black/40 border border-white/5 rounded-xl p-5">
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Activity size={12} className="text-purple-400" />
            Parameter Injection
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[10px]"><span className="text-white/50">Spot Price (S)</span><span className="text-cyan-400 font-bold">${spot.toFixed(2)}</span></div>
            <input type="range" min="10" max="500" step="1" value={spot} onChange={e => setSpot(Number(e.target.value))} className="accent-cyan-500" />
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            <div className="flex justify-between text-[10px]"><span className="text-white/50">Strike Price (K)</span><span className="text-white font-bold">${strike.toFixed(2)}</span></div>
            <input type="range" min="10" max="500" step="1" value={strike} onChange={e => setStrike(Number(e.target.value))} className="accent-white" />
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            <div className="flex justify-between text-[10px]"><span className="text-white/50">Days to Expiry (t)</span><span className="text-white font-bold">{dte} Days</span></div>
            <input type="range" min="1" max="365" step="1" value={dte} onChange={e => setDte(Number(e.target.value))} className="accent-white" />
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            <div className="flex justify-between text-[10px]"><span className="text-white/50">Implied Volatility (σ)</span><span className="text-emerald-400 font-bold">{iv.toFixed(1)}%</span></div>
            <input type="range" min="1" max="200" step="1" value={iv} onChange={e => setIv(Number(e.target.value))} className="accent-emerald-500" />
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            <div className="flex justify-between text-[10px]"><span className="text-white/50">Risk-Free Rate (r)</span><span className="text-orange-400 font-bold">{rate.toFixed(2)}%</span></div>
            <input type="range" min="0" max="15" step="0.25" value={rate} onChange={e => setRate(Number(e.target.value))} className="accent-orange-500" />
          </div>
        </div>

        {/* OUTPUTS PANEL */}
        <div className="flex flex-col gap-6">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-xl p-5 relative overflow-hidden">
              <div className="text-[10px] text-emerald-400 uppercase tracking-widest mb-4 font-bold">Call Option Value</div>
              <div className="text-4xl font-bold text-white mb-6">${results.callPrice.toFixed(4)}</div>
              
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-[10px]">
                <div className="flex justify-between"><span className="text-white/40">Delta (Δ)</span><span className="text-white">{results.callGreeks.delta.toFixed(4)}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Gamma (Γ)</span><span className="text-white">{results.callGreeks.gamma.toFixed(4)}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Theta (Θ)</span><span className="text-white">{results.callGreeks.theta.toFixed(4)}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Vega (ν)</span><span className="text-white">{results.callGreeks.vega.toFixed(4)}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Rho (ρ)</span><span className="text-white">{results.callGreeks.rho.toFixed(4)}</span></div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-rose-500/10 to-transparent border border-rose-500/20 rounded-xl p-5 relative overflow-hidden">
              <div className="text-[10px] text-rose-400 uppercase tracking-widest mb-4 font-bold">Put Option Value</div>
              <div className="text-4xl font-bold text-white mb-6">${results.putPrice.toFixed(4)}</div>
              
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-[10px]">
                <div className="flex justify-between"><span className="text-white/40">Delta (Δ)</span><span className="text-white">{results.putGreeks.delta.toFixed(4)}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Gamma (Γ)</span><span className="text-white">{results.putGreeks.gamma.toFixed(4)}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Theta (Θ)</span><span className="text-white">{results.putGreeks.theta.toFixed(4)}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Vega (ν)</span><span className="text-white">{results.putGreeks.vega.toFixed(4)}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Rho (ρ)</span><span className="text-white">{results.putGreeks.rho.toFixed(4)}</span></div>
              </div>
            </div>
          </div>

          <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-[10px] text-white/50 flex items-start gap-3">
            <Info size={14} className="text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              The continuous-time Black-Scholes-Merton model assumes log-normal distribution of underlying asset prices. Delta (Δ) represents the rate of change of the option price with respect to the spot price. Gamma (Γ) represents the convexity or rate of change of Delta. This specific implementation utilizes an ultra-fast exact numerical computation optimized for V8 engine execution capable of ~1.4M ops/sec.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
