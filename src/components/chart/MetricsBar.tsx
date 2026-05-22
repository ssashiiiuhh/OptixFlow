"use client";

import { motion } from "framer-motion";
import { formatPnL, formatPrice } from "@/lib/finance/payoff";
import type { StrategyMetrics } from "@/types/options";
import { TrendingDown, TrendingUp, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricsBarProps {
  metrics: StrategyMetrics;
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  variant: "green" | "red" | "amber";
}

function MetricCard({ label, value, icon: Icon, variant }: MetricCardProps) {
  const variantStyles = {
    green: {
      bg: "var(--ox-accent-green-dim)",
      border: "rgba(0, 229, 160, 0.2)",
      text: "var(--ox-accent-green)",
    },
    red: {
      bg: "var(--ox-accent-red-dim)",
      border: "rgba(255, 77, 106, 0.2)",
      text: "var(--ox-accent-red)",
    },
    amber: {
      bg: "var(--ox-accent-amber-dim)",
      border: "rgba(245, 166, 35, 0.2)",
      text: "var(--ox-accent-amber)",
    },
  };

  const style = variantStyles[variant];

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="flex-1 min-w-0 rounded-xl p-3 border"
      style={{
        background: style.bg,
        borderColor: style.border,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={12} style={{ color: style.text }} />
        <span className="text-[10px] uppercase tracking-widest text-[var(--ox-text-muted)]">
          {label}
        </span>
      </div>

      <motion.p
        key={value}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="text-base font-bold font-mono"
        style={{ color: style.text }}
      >
        {value}
      </motion.p>
    </motion.div>
  );
}

export default function MetricsBar({ metrics }: MetricsBarProps) {
  const maxProfitLabel =
    metrics.maxProfit === Infinity ? "Unlimited" : formatPnL(metrics.maxProfit);

  return (
    <div className="flex gap-2">
      <MetricCard
        label="Max Profit"
        value={maxProfitLabel}
        icon={TrendingUp}
        variant="green"
      />
      <MetricCard
        label="Max Loss"
        value={formatPnL(metrics.maxLoss)}
        icon={TrendingDown}
        variant="red"
      />
      <MetricCard
        label="Breakeven"
        value={formatPrice(metrics.breakevenPrice)}
        icon={Target}
        variant="amber"
      />
    </div>
  );
}
