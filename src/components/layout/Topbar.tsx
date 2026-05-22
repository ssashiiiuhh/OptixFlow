"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Activity, Bell, RefreshCw, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

// ── Live Ticker Data ─────────────────────────

interface TickerItem {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

const MOCK_TICKERS: TickerItem[] = [
  { symbol: "SPY",  price: 528.42, change: +2.14, changePercent: +0.41 },
  { symbol: "QQQ",  price: 456.88, change: -1.32, changePercent: -0.29 },
  { symbol: "AAPL", price: 189.64, change: +3.21, changePercent: +1.72 },
  { symbol: "TSLA", price: 248.16, change: -4.50, changePercent: -1.78 },
  { symbol: "NVDA", price: 875.30, change: +12.4, changePercent: +1.44 },
  { symbol: "AMZN", price: 192.40, change: +0.88, changePercent: +0.46 },
  { symbol: "MSFT", price: 412.92, change: -2.10, changePercent: -0.51 },
];

// ── Ticker component ─────────────────────────

function TickerTape() {
  const [prices, setPrices] = useState<TickerItem[]>(MOCK_TICKERS);

  // Simulate live price fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setPrices((prev) =>
        prev.map((t) => {
          const delta = (Math.random() - 0.48) * 0.5;
          const newPrice = Math.max(0.01, t.price + delta);
          const newChange = t.change + delta;
          return {
            ...t,
            price: Math.round(newPrice * 100) / 100,
            change: Math.round(newChange * 100) / 100,
            changePercent:
              Math.round((newChange / (newPrice - newChange)) * 10000) / 100,
          };
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const doubled = [...prices, ...prices]; // Duplicate for seamless loop

  return (
    <div className="overflow-hidden flex-1 max-w-xl">
      <motion.div
        animate={{ x: [0, "-50%"] }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear",
        }}
        className="flex gap-6 whitespace-nowrap"
      >
        {doubled.map((ticker, i) => (
          <div key={`${ticker.symbol}-${i}`} className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[var(--ox-text-secondary)] tracking-wide">
              {ticker.symbol}
            </span>
            <span className="text-[11px] font-mono text-[var(--ox-text-primary)]">
              ${ticker.price.toFixed(2)}
            </span>
            <span
              className={`text-[10px] font-mono ${
                ticker.change >= 0
                  ? "text-[var(--ox-accent-green)]"
                  : "text-[var(--ox-accent-red)]"
              }`}
            >
              {ticker.change >= 0 ? "+" : ""}
              {ticker.changePercent.toFixed(2)}%
            </span>
            <span className="text-[var(--ox-border-strong)] text-xs">|</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ── Live Status ──────────────────────────────

function LiveStatus() {
  const [isLive, setIsLive] = useState(true);

  return (
    <div className="flex items-center gap-1.5">
      <motion.div
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className={`w-1.5 h-1.5 rounded-full ${
          isLive ? "bg-[var(--ox-accent-green)]" : "bg-[var(--ox-accent-red)]"
        }`}
      />
      <span className="text-[10px] text-[var(--ox-text-muted)] uppercase tracking-wider font-mono">
        {isLive ? "Live" : "Delayed"}
      </span>
    </div>
  );
}

// ── Main Topbar ──────────────────────────────

export default function Topbar() {
  return (
    <header className="h-14 glass border-b border-[var(--ox-border-default)] flex items-center gap-4 px-4 shrink-0 z-10">
      {/* Live indicator */}
      <LiveStatus />

      {/* Divider */}
      <div className="h-5 w-px bg-[var(--ox-border-default)]" />

      {/* Scrolling ticker tape */}
      <TickerTape />

      {/* Right-side actions */}
      <div className="ml-auto flex items-center gap-1">
        {/* Connection status */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md">
          <Wifi size={12} className="text-[var(--ox-accent-green)]" />
          <span className="text-[10px] text-[var(--ox-text-muted)] hidden sm:block">
            Connected
          </span>
        </div>

        {/* Refresh */}
        <button className="p-2 rounded-lg text-[var(--ox-text-muted)] hover:text-[var(--ox-text-primary)] hover:bg-white/[0.04] transition-colors">
          <RefreshCw size={14} />
        </button>

        {/* Activity */}
        <button className="p-2 rounded-lg text-[var(--ox-text-muted)] hover:text-[var(--ox-text-primary)] hover:bg-white/[0.04] transition-colors">
          <Activity size={14} />
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-[var(--ox-text-muted)] hover:text-[var(--ox-text-primary)] hover:bg-white/[0.04] transition-colors">
          <Bell size={14} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[var(--ox-accent-cyan)] rounded-full animate-pulse-glow" />
        </button>

        {/* Avatar placeholder */}
        <div className="ml-1 w-7 h-7 rounded-full bg-gradient-to-br from-[var(--ox-accent-cyan)] to-[#7c3aed] flex items-center justify-center text-[10px] font-bold text-white">
          Q
        </div>
      </div>
    </header>
  );
}
