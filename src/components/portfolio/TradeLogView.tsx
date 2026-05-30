"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Clock, FileText, CheckCircle2 } from "lucide-react";
import { usePortfolioSafe } from "../portfolio/PortfolioContext";
import { useMemo } from "react";

interface Trade {
  id: string;
  ticker: string;
  strategy: string;
  action: string;
  qty: number;
  price: number;
  pnl: number;
  timestamp: string;
  active?: boolean;
}

// Mock historical trades to pad the log
const MOCK_HISTORY: Trade[] = [
  {
    id: "hist-1",
    ticker: "TSLA",
    strategy: "Iron Condor",
    action: "SELL TO CLOSE",
    qty: 10,
    price: 2.15,
    pnl: 450,
    timestamp: "2024-04-12T14:22:00Z",
  },
  {
    id: "hist-2",
    ticker: "NVDA",
    strategy: "Long Call",
    action: "SELL TO CLOSE",
    qty: 5,
    price: 18.40,
    pnl: 3200,
    timestamp: "2024-04-10T09:35:00Z",
  },
  {
    id: "hist-3",
    ticker: "SPY",
    strategy: "Short Put",
    action: "BUY TO CLOSE",
    qty: 20,
    price: 1.05,
    pnl: -800,
    timestamp: "2024-04-05T15:55:00Z",
  },
  {
    id: "hist-4",
    ticker: "AAPL",
    strategy: "Covered Call",
    action: "SELL TO OPEN",
    qty: 10,
    price: 3.20,
    pnl: 0,
    timestamp: "2024-03-28T10:15:00Z",
  }
];

export default function TradeLogView() {
  const portfolio = usePortfolioSafe();

  const tradeLog = useMemo(() => {
    if (!portfolio) return MOCK_HISTORY;
    
    // Map current active holdings into "BUY TO OPEN" trades
    const activeTrades = portfolio.holdings.map((h) => ({
      id: h.id,
      ticker: h.ticker,
      strategy: h.strategy,
      action: "BUY TO OPEN",
      qty: h.quantity,
      price: h.costBasis / h.quantity,
      pnl: h.pnl,
      timestamp: new Date().toISOString(), // Mocking recent entry
      active: true,
    }));

    return [...activeTrades, ...MOCK_HISTORY];
  }, [portfolio]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 relative z-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-[var(--ox-text-primary)] uppercase tracking-wider flex items-center gap-2">
          <FileText size={16} className="text-[var(--ox-accent-cyan)]" />
          Execution Log
        </h2>
        <span className="text-[10px] text-[var(--ox-text-muted)] font-mono">
          Last 30 Days
        </span>
      </div>

      <div className="glass border border-white/5 rounded-xl overflow-hidden shadow-2xl">
        <div className="grid grid-cols-7 gap-4 px-4 py-3 bg-black/40 border-b border-white/5 text-[10px] font-mono text-[var(--ox-text-muted)] uppercase tracking-wider">
          <div className="col-span-1">Time</div>
          <div className="col-span-1">Action</div>
          <div className="col-span-2">Instrument</div>
          <div className="col-span-1 text-right">Qty</div>
          <div className="col-span-1 text-right">Fill Price</div>
          <div className="col-span-1 text-right">Realized P&L</div>
        </div>

        <div className="divide-y divide-white/5">
          {tradeLog.map((trade, i) => {
            const isWin = trade.pnl > 0;
            const isLoss = trade.pnl < 0;
            const pnlColor = isWin ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-white/50";
            
            const date = new Date(trade.timestamp);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

            return (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`grid grid-cols-7 gap-4 px-4 py-3 items-center text-[11px] font-mono hover:bg-white/[0.02] transition-colors ${
                  trade.active ? "bg-[var(--ox-accent-cyan)]/5" : ""
                }`}
              >
                <div className="col-span-1 flex flex-col">
                  <span className="text-white/80">{timeStr}</span>
                  <span className="text-[9px] text-white/40">{dateStr}</span>
                </div>
                
                <div className="col-span-1">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase ${
                    trade.action.includes("BUY") 
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                      : "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20"
                  }`}>
                    {trade.action}
                  </span>
                </div>

                <div className="col-span-2 flex items-center gap-3">
                  <div className="font-bold text-white tracking-widest">{trade.ticker}</div>
                  <div className="text-white/50">{trade.strategy}</div>
                  {trade.active && (
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[8px] uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={8} /> Active
                    </span>
                  )}
                </div>

                <div className="col-span-1 text-right text-white/80">
                  {trade.qty}
                </div>

                <div className="col-span-1 text-right text-white/80">
                  ${trade.price.toFixed(2)}
                </div>

                <div className="col-span-1 text-right font-bold flex items-center justify-end gap-1">
                  {trade.pnl === 0 ? (
                    <span className="text-white/30">—</span>
                  ) : (
                    <>
                      {isWin ? <ArrowUpRight size={12} className="text-emerald-400" /> : <ArrowDownRight size={12} className="text-rose-400" />}
                      <span className={pnlColor}>
                        {isWin ? "+" : "-"}${Math.abs(trade.pnl).toLocaleString()}
                      </span>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
