"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Activity, Bell, RefreshCw, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { usePortfolioSafe } from "../portfolio/PortfolioContext";

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
  const portfolio = usePortfolioSafe();
  const isLive = portfolio ? portfolio.isTicking : true;

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
  const portfolio = usePortfolioSafe();
  const isLive = portfolio ? portfolio.isTicking : true;
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastSeenNarration, setLastSeenNarration] = useState(0);

  const narrationLines = portfolio?.aiNarrationLines || [];
  const hasNewNotifications = narrationLines.length > lastSeenNarration;

  return (
    <header className="h-14 glass border-b border-[var(--ox-border-default)] flex items-center gap-4 px-4 shrink-0 z-10 relative">
      {/* Live indicator */}
      <LiveStatus />

      {/* Divider */}
      <div className="h-5 w-px bg-[var(--ox-border-default)]" />

      {/* Scrolling ticker tape */}
      <TickerTape />

      {/* Right-side actions */}
      <div className="ml-auto flex items-center gap-1">
        {/* Connection status */}
        <div 
          className="flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer hover:bg-white/[0.02]"
          onClick={() => portfolio?.setIsTicking(!isLive)}
        >
          <Wifi size={12} className={isLive ? "text-[var(--ox-accent-green)]" : "text-[var(--ox-text-muted)]"} />
          <span className="text-[10px] text-[var(--ox-text-muted)] hidden sm:block">
            {isLive ? "Connected" : "Disconnected"}
          </span>
        </div>

        {/* Refresh */}
        <button 
          onClick={() => portfolio?.manualTick()}
          className="p-2 rounded-lg text-[var(--ox-text-muted)] hover:text-[var(--ox-text-primary)] hover:bg-white/[0.04] transition-colors"
          title="Force Tick"
        >
          <RefreshCw size={14} className={isLive ? "" : "opacity-50"} />
        </button>

        {/* Activity */}
        <button 
          onClick={() => portfolio?.setIsTicking(!isLive)}
          className={`p-2 rounded-lg transition-colors ${
            isLive 
              ? "text-[var(--ox-accent-cyan)] hover:bg-white/[0.04]" 
              : "text-[var(--ox-text-muted)] hover:text-[var(--ox-text-primary)] hover:bg-white/[0.04]"
          }`}
          title={isLive ? "Pause Engine" : "Start Engine"}
        >
          <Activity size={14} />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) setLastSeenNarration(narrationLines.length);
            }}
            className="relative p-2 rounded-lg text-[var(--ox-text-muted)] hover:text-[var(--ox-text-primary)] hover:bg-white/[0.04] transition-colors"
          >
            <Bell size={14} />
            {hasNewNotifications && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[var(--ox-accent-cyan)] rounded-full animate-pulse-glow" />
            )}
          </button>

          {/* Notification Popover */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-12 w-64 glass border border-[var(--ox-border-default)] rounded-xl p-3 shadow-2xl z-50 flex flex-col gap-2 bg-black/90 backdrop-blur-xl"
              >
                <div className="text-[10px] font-mono text-[var(--ox-text-muted)] uppercase tracking-wider mb-1">
                  Recent Alerts
                </div>
                {narrationLines.length === 0 ? (
                  <div className="text-[11px] text-[var(--ox-text-muted)]">No active notifications.</div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {narrationLines.slice(-5).reverse().map((line, i) => (
                      <div key={i} className="text-[11px] text-[var(--ox-text-primary)] leading-tight border-l-2 border-[var(--ox-accent-cyan)] pl-2">
                        {line.replace('__STREAMING__', '')}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar placeholder */}
        <button 
          className="ml-1 w-7 h-7 rounded-full bg-gradient-to-br from-[var(--ox-accent-cyan)] to-[#7c3aed] flex items-center justify-center text-[10px] font-bold text-white hover:scale-105 transition-transform"
          title="Account Settings"
        >
          Q
        </button>
      </div>
    </header>
  );
}
