"use client";

import { formatPnL, formatPrice } from "@/lib/finance/payoff";

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    dataKey: string;
  }>;
  label?: number;
}

/**
 * Custom glassmorphism tooltip for the Recharts payoff graph.
 * Shows stock price and P/L at that point.
 */
export default function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || !label) return null;

  // Get the P/L value (whichever series has data — profit or loss)
  const pnlPayload = payload.find((p) => p.dataKey === "pnl");
  const pnl = pnlPayload?.value ?? 0;
  const isProfit = pnl >= 0;

  return (
    <div
      className="rounded-xl border p-3 shadow-2xl"
      style={{
        background: "rgba(7, 9, 15, 0.92)",
        backdropFilter: "blur(16px)",
        borderColor: isProfit
          ? "rgba(0, 229, 160, 0.3)"
          : "rgba(255, 77, 106, 0.3)",
        minWidth: 140,
      }}
    >
      {/* Stock price */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className="text-[10px] uppercase tracking-wider text-[var(--ox-text-muted)]">
          Stock Price
        </span>
        <span className="text-xs font-mono font-bold text-[var(--ox-text-primary)]">
          {formatPrice(label)}
        </span>
      </div>

      {/* Divider */}
      <div
        className="h-px mb-2"
        style={{
          background: isProfit
            ? "rgba(0, 229, 160, 0.15)"
            : "rgba(255, 77, 106, 0.15)",
        }}
      />

      {/* P/L value */}
      <div className="flex items-center justify-between gap-4">
        <span className="text-[10px] uppercase tracking-wider text-[var(--ox-text-muted)]">
          P&amp;L
        </span>
        <span
          className="text-sm font-mono font-bold"
          style={{
            color: isProfit ? "var(--ox-accent-green)" : "var(--ox-accent-red)",
          }}
        >
          {formatPnL(pnl)}
        </span>
      </div>

      {/* Status badge */}
      <div className="mt-2 pt-2 border-t border-white/5">
        <span
          className="inline-block text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-medium"
          style={{
            background: isProfit
              ? "rgba(0, 229, 160, 0.15)"
              : "rgba(255, 77, 106, 0.15)",
            color: isProfit ? "var(--ox-accent-green)" : "var(--ox-accent-red)",
          }}
        >
          {isProfit ? "▲ Profit Zone" : "▼ Loss Zone"}
        </span>
      </div>
    </div>
  );
}
