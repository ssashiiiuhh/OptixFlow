"use client";

import * as Slider from "@radix-ui/react-slider";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ParameterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  onChange: (value: number) => void;
  color?: "cyan" | "green" | "red" | "amber";
  description?: string;
}

const COLOR_MAP = {
  cyan:  { track: "#00d4ff", bg: "var(--ox-accent-cyan-dim)",  glow: "var(--ox-glow-cyan)" },
  green: { track: "#00e5a0", bg: "var(--ox-accent-green-dim)", glow: "var(--ox-glow-green)" },
  red:   { track: "#ff4d6a", bg: "var(--ox-accent-red-dim)",   glow: "var(--ox-glow-red)" },
  amber: { track: "#f5a623", bg: "var(--ox-accent-amber-dim)", glow: "" },
};

export default function ParameterSlider({
  label,
  value,
  min,
  max,
  step = 1,
  prefix = "",
  suffix = "",
  onChange,
  color = "cyan",
  description,
}: ParameterSliderProps) {
  const colors = COLOR_MAP[color];
  const percentage = ((value - min) / (max - min)) * 100;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed)) {
      onChange(Math.min(max, Math.max(min, parsed)));
    }
  };

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-[var(--ox-text-secondary)] uppercase tracking-wide">
            {label}
          </span>
          {description && (
            <p className="text-[10px] text-[var(--ox-text-muted)] mt-0.5">{description}</p>
          )}
        </div>

        {/* Value input */}
        <div
          className="flex items-center gap-0.5 rounded-md px-2 py-1 border border-[var(--ox-border-default)] bg-[var(--ox-bg-surface)]"
          style={{ minWidth: 72 }}
        >
          {prefix && (
            <span className="text-xs text-[var(--ox-text-muted)] font-mono">{prefix}</span>
          )}
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={handleInputChange}
            className="w-14 text-xs text-right font-mono text-[var(--ox-text-primary)] bg-transparent outline-none"
          />
          {suffix && (
            <span className="text-xs text-[var(--ox-text-muted)] font-mono">{suffix}</span>
          )}
        </div>
      </div>

      {/* Slider */}
      <Slider.Root
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        className="relative flex items-center select-none touch-none w-full h-5"
      >
        {/* Track background */}
        <Slider.Track className="relative grow rounded-full h-[3px] bg-[var(--ox-border-strong)] overflow-hidden">
          {/* Filled portion */}
          <Slider.Range
            className="absolute h-full rounded-full"
            style={{ background: colors.track }}
          />
        </Slider.Track>

        {/* Thumb */}
        <Slider.Thumb asChild>
          <motion.div
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 1.1 }}
            className="block w-4 h-4 rounded-full cursor-grab active:cursor-grabbing outline-none border-2"
            style={{
              backgroundColor: colors.track,
              borderColor: "var(--ox-bg-void)",
              boxShadow: `0 0 10px ${colors.track}80`,
            }}
          />
        </Slider.Thumb>
      </Slider.Root>

      {/* Min/Max hints */}
      <div className="flex justify-between">
        <span className="text-[10px] text-[var(--ox-text-muted)] font-mono">
          {prefix}{min}{suffix}
        </span>
        <span className="text-[10px] text-[var(--ox-text-muted)] font-mono">
          {prefix}{max}{suffix}
        </span>
      </div>
    </div>
  );
}
