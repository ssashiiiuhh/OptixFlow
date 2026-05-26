// ============================================================================
// OPTIXFLOW — Tradier Paper Trading Bridge Panel
// Institutional-grade order entry + live order book + audit trail.
// SANDBOX MODE: safe paper trading, no real capital at risk.
// ============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, RefreshCw, AlertCircle, CheckCircle2, Clock,
  XCircle, ChevronDown, Zap, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

type OrderType = "market" | "limit";
type OrderSide = "buy_to_open" | "buy_to_close" | "sell_to_open" | "sell_to_close";
type OrderStatus = "filled" | "pending" | "submitted" | "cancelled" | "rejected";

interface OrderRecord {
  id: number;
  status: OrderStatus;
  type: string;
  symbol: string;
  side: string;
  quantity: number;
  optionSymbol?: string;
  avg_fill_price?: number | null;
  create_date: string;
}

const STATUS_CONFIG: Record<OrderStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  filled:    { icon: CheckCircle2, color: "var(--ox-accent-green)", label: "FILLED" },
  pending:   { icon: Clock,        color: "var(--ox-accent-amber)", label: "PENDING" },
  submitted: { icon: Clock,        color: "#00d4ff",                label: "SUBMITTED" },
  cancelled: { icon: XCircle,      color: "var(--ox-text-muted)",   label: "CANCELLED" },
  rejected:  { icon: AlertCircle,  color: "var(--ox-accent-red)",   label: "REJECTED" },
};

const QUICK_STRATEGIES = [
  { label: "SPY Bull Call Spread", symbol: "SPY", leg1: { side: "buy_to_open",  sym: "SPY250620C00530000", qty: 1 }, leg2: { side: "sell_to_open", sym: "SPY250620C00535000", qty: 1 } },
  { label: "SPY Iron Condor",      symbol: "SPY", leg1: { side: "sell_to_open", sym: "SPY250620P00520000", qty: 1 }, leg2: { side: "sell_to_open", sym: "SPY250620C00540000", qty: 1 } },
  { label: "AAPL Long Straddle",   symbol: "AAPL",leg1: { side: "buy_to_open",  sym: "AAPL250620C00200000",qty: 1 }, leg2: { side: "buy_to_open",  sym: "AAPL250620P00200000",qty: 1 } },
];

export default function TradierBridge() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ ok: boolean; message: string; orderId?: number } | null>(null);
  const [isSimulated, setIsSimulated] = useState(true);
  const [auditLog, setAuditLog] = useState<string[]>([]);

  // Order form state
  const [symbol, setSymbol] = useState("SPY");
  const [optionSymbol, setOptionSymbol] = useState("SPY250620C00530000");
  const [side, setSide] = useState<OrderSide>("buy_to_open");
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [limitPrice, setLimitPrice] = useState("2.50");

  const addAudit = (msg: string) => {
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
    setAuditLog(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 20));
  };

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/trade?accountId=demo");
      const data = await res.json();
      setIsSimulated(data.simulated);
      setOrders(data.orders?.order ?? []);
      addAudit("Order book refreshed.");
    } catch {
      addAudit("ERROR: Failed to fetch order book.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const submitOrder = async () => {
    setIsSubmitting(true);
    setLastResult(null);
    addAudit(`SUBMIT: ${side.toUpperCase()} ${quantity}× ${optionSymbol} @ ${orderType === "market" ? "MKT" : `$${limitPrice}`}`);

    try {
      const body = {
        accountId: "demo",
        class: "option",
        symbol,
        optionSymbol,
        side,
        quantity,
        type: orderType,
        duration: "day",
        price: orderType === "limit" ? parseFloat(limitPrice) : undefined,
      };

      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.order || data.simulated) {
        const id = data.order?.id ?? Math.random();
        setLastResult({ ok: true, message: data.message ?? `Order #${id} submitted`, orderId: id });
        addAudit(`ACK: Order #${id} → PENDING → SUBMITTED`);
        // Simulate fill after 1.5s
        setTimeout(() => {
          addAudit(`FILL: Order #${id} → FILLED @ $${limitPrice}`);
          fetchOrders();
        }, 1500);
      } else {
        setLastResult({ ok: false, message: data.error ?? "Submission failed" });
        addAudit(`REJECTED: ${data.error ?? "Unknown error"}`);
      }
    } catch (e) {
      setLastResult({ ok: false, message: String(e) });
      addAudit(`ERROR: ${e}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyQuickStrategy = (s: typeof QUICK_STRATEGIES[0]) => {
    setSymbol(s.symbol);
    setOptionSymbol(s.leg1.sym);
    setSide(s.leg1.side as OrderSide);
    addAudit(`LOADED: ${s.label} template`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-2xl border border-[var(--ox-border-default)] overflow-hidden"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] cursor-pointer"
        onClick={() => setIsExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <Zap size={13} className="text-[var(--ox-accent-amber)]" style={{ filter: "drop-shadow(0 0 5px rgba(245,166,35,0.5))" }} />
          <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--ox-text-primary)]">Broker Execution Bridge</span>
          <span className={cn(
            "text-[8px] font-mono px-1.5 py-0.5 rounded-full border font-bold tracking-widest",
            isSimulated
              ? "border-[var(--ox-accent-amber)]/30 bg-[var(--ox-accent-amber)]/10 text-[var(--ox-accent-amber)]"
              : "border-[var(--ox-accent-green)]/30 bg-[var(--ox-accent-green)]/10 text-[var(--ox-accent-green)]"
          )}>
            {isSimulated ? "PAPER TRADING" : "LIVE — TRADIER"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Shield size={11} className="text-[var(--ox-accent-amber)]/60" />
          <span className="text-[8px] font-mono text-[var(--ox-text-muted)]">Sandbox Mode</span>
          <ChevronDown size={13} className={cn("text-[var(--ox-text-muted)] transition-transform duration-200", isExpanded && "rotate-180")} />
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-4 space-y-4">
              {/* Quick strategy templates */}
              <div>
                <p className="text-[8px] font-mono text-[var(--ox-text-muted)] uppercase tracking-widest mb-2">Quick Templates</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_STRATEGIES.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => applyQuickStrategy(s)}
                      className="text-[8px] font-mono px-2 py-1 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[var(--ox-text-muted)] hover:text-[var(--ox-text-secondary)] hover:border-white/[0.12] transition-all"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order form */}
              <div className="grid grid-cols-2 gap-3">
                {/* Symbol */}
                <div>
                  <label className="text-[8px] font-mono text-[var(--ox-text-muted)] uppercase block mb-1">Underlying</label>
                  <select
                    value={symbol}
                    onChange={e => setSymbol(e.target.value)}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-2 py-1.5 text-[10px] font-mono text-[var(--ox-text-primary)] focus:outline-none focus:border-[var(--ox-accent-cyan)]/40"
                  >
                    {["SPY", "AAPL", "NVDA", "QQQ"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                {/* Side */}
                <div>
                  <label className="text-[8px] font-mono text-[var(--ox-text-muted)] uppercase block mb-1">Side</label>
                  <select
                    value={side}
                    onChange={e => setSide(e.target.value as OrderSide)}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-2 py-1.5 text-[10px] font-mono text-[var(--ox-text-primary)] focus:outline-none focus:border-[var(--ox-accent-cyan)]/40"
                  >
                    {(["buy_to_open","sell_to_open","buy_to_close","sell_to_close"] as OrderSide[]).map(s => (
                      <option key={s} value={s}>{s.replace(/_/g," ").toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Option Symbol */}
                <div className="col-span-2">
                  <label className="text-[8px] font-mono text-[var(--ox-text-muted)] uppercase block mb-1">Option Symbol (OCC Format)</label>
                  <input
                    value={optionSymbol}
                    onChange={e => setOptionSymbol(e.target.value)}
                    placeholder="SPY250620C00530000"
                    className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-2 py-1.5 text-[10px] font-mono text-[var(--ox-text-primary)] focus:outline-none focus:border-[var(--ox-accent-cyan)]/40 placeholder:text-white/20"
                  />
                </div>

                {/* Qty + type */}
                <div>
                  <label className="text-[8px] font-mono text-[var(--ox-text-muted)] uppercase block mb-1">Qty (contracts)</label>
                  <input
                    type="number" min={1} max={100}
                    value={quantity}
                    onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-2 py-1.5 text-[10px] font-mono text-[var(--ox-text-primary)] focus:outline-none focus:border-[var(--ox-accent-cyan)]/40"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-mono text-[var(--ox-text-muted)] uppercase block mb-1">Order Type</label>
                  <select
                    value={orderType}
                    onChange={e => setOrderType(e.target.value as OrderType)}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-2 py-1.5 text-[10px] font-mono text-[var(--ox-text-primary)] focus:outline-none focus:border-[var(--ox-accent-cyan)]/40"
                  >
                    <option value="limit">Limit</option>
                    <option value="market">Market</option>
                  </select>
                </div>

                {/* Limit price */}
                {orderType === "limit" && (
                  <div className="col-span-2">
                    <label className="text-[8px] font-mono text-[var(--ox-text-muted)] uppercase block mb-1">Limit Price ($)</label>
                    <input
                      type="number" step={0.01} min={0.01}
                      value={limitPrice}
                      onChange={e => setLimitPrice(e.target.value)}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-2 py-1.5 text-[10px] font-mono text-[var(--ox-text-primary)] focus:outline-none focus:border-[var(--ox-accent-cyan)]/40"
                    />
                  </div>
                )}
              </div>

              {/* Submit + feedback */}
              <div className="space-y-2">
                <button
                  onClick={submitOrder}
                  disabled={isSubmitting}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[10px] font-mono font-bold uppercase tracking-wider transition-all duration-200",
                    isSubmitting
                      ? "border-white/10 bg-white/5 text-white/30 cursor-wait"
                      : "border-[var(--ox-accent-amber)]/40 bg-[var(--ox-accent-amber)]/10 text-[var(--ox-accent-amber)] hover:bg-[var(--ox-accent-amber)]/20 hover:shadow-[0_0_16px_rgba(245,166,35,0.15)]"
                  )}
                >
                  {isSubmitting ? (
                    <><RefreshCw size={11} className="animate-spin" /> Submitting...</>
                  ) : (
                    <><Send size={11} /> Submit Paper Order</>
                  )}
                </button>

                <AnimatePresence>
                  {lastResult && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        "flex items-center gap-2 text-[9px] font-mono px-3 py-2 rounded-xl border",
                        lastResult.ok
                          ? "border-[var(--ox-accent-green)]/20 bg-[var(--ox-accent-green)]/5 text-[var(--ox-accent-green)]"
                          : "border-[var(--ox-accent-red)]/20 bg-[var(--ox-accent-red)]/5 text-[var(--ox-accent-red)]"
                      )}
                    >
                      {lastResult.ok ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                      {lastResult.message}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Order book */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[8px] font-mono text-[var(--ox-text-muted)] uppercase tracking-widest">Order Book</p>
                  <button onClick={fetchOrders} disabled={isLoading} className="text-[var(--ox-text-muted)] hover:text-[var(--ox-accent-cyan)] transition-colors p-0.5">
                    <RefreshCw size={10} className={isLoading ? "animate-spin" : ""} />
                  </button>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                  {orders.map((order) => {
                    const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
                    const Icon = cfg.icon;
                    return (
                      <div key={order.id} className="flex items-center justify-between bg-black/20 border border-white/[0.04] rounded-lg px-2.5 py-1.5">
                        <div className="flex items-center gap-2">
                          <Icon size={9} style={{ color: cfg.color }} />
                          <div>
                            <p className="text-[9px] font-mono text-[var(--ox-text-primary)] font-bold">
                              {order.side?.replace(/_/g," ").toUpperCase()} {order.quantity}× {order.symbol}
                            </p>
                            <p className="text-[7px] font-mono text-[var(--ox-text-muted)] truncate max-w-[180px]">
                              {order.optionSymbol ?? "Equity"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-mono font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
                          <p className="text-[7px] font-mono text-[var(--ox-text-muted)]">
                            {order.avg_fill_price ? `$${order.avg_fill_price}` : "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Audit log */}
              <div>
                <p className="text-[8px] font-mono text-[var(--ox-text-muted)] uppercase tracking-widest mb-1.5">Execution Audit Trail</p>
                <div className="bg-black/40 border border-white/[0.04] rounded-xl p-2.5 max-h-24 overflow-y-auto space-y-0.5 font-mono text-[8px]" style={{ scrollbarWidth: "thin" }}>
                  {auditLog.length === 0 ? (
                    <span className="text-[var(--ox-text-muted)] italic">No activity yet.</span>
                  ) : auditLog.map((line, i) => (
                    <div key={i} className={cn(
                      "border-l-2 pl-1.5",
                      line.includes("FILL") ? "border-[var(--ox-accent-green)] text-[var(--ox-accent-green)]/80" :
                      line.includes("REJECTED") || line.includes("ERROR") ? "border-[var(--ox-accent-red)] text-[var(--ox-accent-red)]/80" :
                      line.includes("SUBMIT") || line.includes("ACK") ? "border-[var(--ox-accent-cyan)] text-[var(--ox-accent-cyan)]/80" :
                      "border-white/10 text-[var(--ox-text-muted)]"
                    )}>{line}</div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
