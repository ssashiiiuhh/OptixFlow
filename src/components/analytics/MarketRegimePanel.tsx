"use client";

import { motion, useAnimationFrame } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { REGIME_SIGNALS, PRIMARY_REGIME, type RegimeData } from "@/lib/analytics-data";

// ── Animated particle field ───────────────────────────────
// Simulates a "flow field" that changes direction based on regime

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  size: number;
  life: number;
  maxLife: number;
}

function FlowField({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef(0);

  const spawnParticle = (w: number, h: number): Particle => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.8,
    vy: -(Math.random() * 0.5 + 0.2),
    opacity: Math.random() * 0.6 + 0.1,
    size: Math.random() * 2 + 0.5,
    life: 0,
    maxLife: Math.random() * 120 + 60,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Seed particles
    particlesRef.current = Array.from({ length: 40 }, () => spawnParticle(w, h));

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, w, h);

      particlesRef.current = particlesRef.current.map((p) => {
        const t = p.life / p.maxLife;
        const fade = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = color + Math.round(fade * 0.5 * 255).toString(16).padStart(2, "0");
        ctx.fill();

        // Update
        const next: Particle = {
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life + 1,
        };

        // Respawn if dead or out of bounds
        if (next.life >= next.maxLife || next.y < 0 || next.x < 0 || next.x > w) {
          return spawnParticle(w, h);
        }
        return next;
      });

      animId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animId);
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={120}
      className="absolute inset-0 w-full h-full opacity-60 pointer-events-none"
    />
  );
}

// ── Regime confidence bar ─────────────────────────────────

function RegimeBar({ regime, isActive }: { regime: RegimeData; isActive: boolean }) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="space-y-1"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            animate={isActive ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: regime.color,
              boxShadow: isActive ? `0 0 8px ${regime.color}` : "none",
            }}
          />
          <span className={`text-[11px] font-medium ${isActive ? "text-[var(--ox-text-primary)]" : "text-[var(--ox-text-secondary)]"}`}>
            {regime.label}
          </span>
        </div>
        <span className="text-[11px] font-mono" style={{ color: regime.color }}>
          {regime.score}%
        </span>
      </div>

      {/* Score bar */}
      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${regime.score}%` }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          className="h-full rounded-full"
          style={{
            background: isActive
              ? `linear-gradient(90deg, ${regime.color}80, ${regime.color})`
              : regime.color + "60",
            boxShadow: isActive ? `0 0 8px ${regime.color}60` : "none",
          }}
        />
      </div>
    </motion.div>
  );
}

// ── Sentiment Dial ────────────────────────────────────────

function SentimentDial({ score }: { score: number }) {
  // score: 0–100. <30 = bearish, 30-70 = neutral, >70 = bullish
  const angle = (score / 100) * 180 - 90; // -90° (left) to +90° (right)
  const color =
    score < 35 ? "var(--ox-accent-red)" :
    score > 65 ? "var(--ox-accent-green)" :
    "var(--ox-accent-amber)";
  const label =
    score < 35 ? "Bearish" :
    score > 65 ? "Bullish" :
    "Neutral";

  return (
    <div className="flex flex-col items-center">
      <svg width={120} height={68} className="overflow-visible">
        {/* Dial track */}
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={8}
          strokeLinecap="round"
        />
        {/* Bearish zone */}
        <path
          d="M 10 60 A 50 50 0 0 1 60 10"
          fill="none"
          stroke="rgba(255,77,106,0.3)"
          strokeWidth={8}
          strokeLinecap="round"
        />
        {/* Neutral zone */}
        <path
          d="M 60 10 A 50 50 0 0 1 110 60"
          fill="none"
          stroke="rgba(0,229,160,0.3)"
          strokeWidth={8}
          strokeLinecap="round"
        />

        {/* Needle — rotate around pivot point via style.transformOrigin */}
        <motion.line
          x1={60}
          y1={60}
          x2={60}
          y2={20}
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 4px ${color})`,
            transformOrigin: "60px 60px",
            transformBox: "fill-box",
          }}
          initial={{ rotate: -90 }}
          animate={{ rotate: angle }}
          transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
        />

        {/* Pivot dot */}
        <circle cx={60} cy={60} r={4} fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      </svg>

      <p className="text-sm font-bold -mt-1" style={{ color }}>{label}</p>
      <p className="text-[10px] text-[var(--ox-text-muted)] mt-0.5">Score: {score}/100</p>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────

export default function MarketRegimePanel() {
  const sentimentScore = 72; // Derived from regime signals

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass rounded-2xl border border-[var(--ox-border-default)] p-4 space-y-4 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-4 rounded-full"
              style={{
                backgroundColor: PRIMARY_REGIME.color,
                boxShadow: `0 0 8px ${PRIMARY_REGIME.color}80`,
              }}
            />
            <h2 className="text-sm font-semibold text-[var(--ox-text-primary)]">
              Market Regime
            </h2>
          </div>
          <p className="text-[10px] text-[var(--ox-text-muted)] mt-0.5 ml-3.5">
            Multi-factor regime detection · updated 15min
          </p>
        </div>
      </div>

      {/* Primary regime hero */}
      <div
        className="relative rounded-xl overflow-hidden p-4 border"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${PRIMARY_REGIME.color}15, transparent 70%)`,
          borderColor: PRIMARY_REGIME.color + "25",
          minHeight: 120,
        }}
      >
        <FlowField color={PRIMARY_REGIME.color} />

        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--ox-text-muted)]">
                Dominant Regime
              </p>
              <p
                className="text-2xl font-bold mt-1"
                style={{
                  color: PRIMARY_REGIME.color,
                  textShadow: `0 0 20px ${PRIMARY_REGIME.color}60`,
                }}
              >
                {PRIMARY_REGIME.label}
              </p>
              <p className="text-[11px] text-[var(--ox-text-muted)] mt-1 max-w-[200px] leading-relaxed">
                {PRIMARY_REGIME.description}
              </p>
            </div>

            <div
              className="text-4xl font-black font-mono"
              style={{ color: PRIMARY_REGIME.color, opacity: 0.15 }}
            >
              {PRIMARY_REGIME.score}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout: bars + dial */}
      <div className="grid grid-cols-2 gap-4">
        {/* Regime bars */}
        <div className="space-y-3">
          {REGIME_SIGNALS.map((regime, i) => (
            <RegimeBar
              key={regime.id}
              regime={regime}
              isActive={i === 0}
            />
          ))}
        </div>

        {/* Sentiment dial */}
        <div className="flex flex-col items-center justify-center">
          <p className="text-[10px] uppercase tracking-widest text-[var(--ox-text-muted)] mb-2">
            Market Sentiment
          </p>
          <SentimentDial score={sentimentScore} />
        </div>
      </div>
    </motion.div>
  );
}
