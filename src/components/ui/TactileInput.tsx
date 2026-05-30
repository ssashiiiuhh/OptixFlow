"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TactileInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  onCommit?: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  colorClass?: string;
  icon?: React.ReactNode;
  validationType?: "spot" | "strike" | "iv" | "dte" | "rate" | "paths" | "steps";
  spotReference?: number;
  prefix?: string;
  suffix?: string;
}

type ValidationResult = {
  status: "ok" | "warn" | "error";
  message?: string;
};

export default function TactileInput({
  label,
  value,
  onChange,
  onCommit,
  min = 0,
  max = 10000,
  step = 1,
  colorClass = "text-white",
  icon,
  validationType,
  spotReference,
  prefix = "",
  suffix = ""
}: TactileInputProps) {
  const [localValue, setLocalValue] = useState<string>(value.toString());
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync prop -> local when not focused
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value.toString());
    }
  }, [value, isFocused]);

  // Validation Logic
  const validate = (val: number): ValidationResult => {
    if (validationType === "spot") {
      if (val <= 0) return { status: "error", message: "Spot must be > 0" };
    }
    if (validationType === "iv") {
      if (val <= 0) return { status: "error", message: "IV must be > 0%" };
      if (val > 500) return { status: "warn", message: "Meme stock territory (>500%)" };
      if (val > 1000) return { status: "error", message: "IV must be < 1000%" };
    }
    if (validationType === "dte") {
      if (val < 0) return { status: "error", message: "DTE must be >= 0" };
      if (val === 0) return { status: "warn", message: "T->0 logic active" };
    }
    if (validationType === "strike") {
      if (val <= 0) return { status: "error", message: "Strike must be > 0" };
      if (spotReference && Math.abs(val - spotReference) / spotReference > 0.5) {
        return { status: "warn", message: "Deep OTM (±50% from Spot)" };
      }
    }
    return { status: "ok" };
  };

  const parsedValue = parseFloat(localValue);
  const validation: ValidationResult = !isNaN(parsedValue) ? validate(parsedValue) : { status: "ok" };

  // Handle Commit
  const commitValue = useCallback((valStr: string) => {
    let parsed = parseFloat(valStr);
    if (isNaN(parsed)) {
      setLocalValue(value.toString());
      return;
    }
    
    // Auto-detect IV decimals (e.g., 0.25 -> 25%)
    if (validationType === "iv" && parsed <= 1 && parsed > 0 && valStr.includes(".")) {
      parsed = parsed * 100;
    }
    
    // Clamp
    parsed = Math.max(min, Math.min(max, parsed));
    setLocalValue(parsed.toString());
    onChange(parsed);
    onCommit?.(parsed);
  }, [min, max, validationType, value, onChange, onCommit]);

  const handleBlur = () => {
    setIsFocused(false);
    commitValue(localValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      inputRef.current?.blur();
      return;
    }
    
    let current = parseFloat(localValue);
    if (isNaN(current)) current = value;
    
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const delta = e.shiftKey ? step * 10 : step;
      const next = Math.min(max, current + delta);
      setLocalValue(next.toString());
      onChange(next);
      // We don't onCommit here immediately to avoid jumping, 
      // user will commit on blur or enter.
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const delta = e.shiftKey ? step * 10 : step;
      const next = Math.max(min, current - delta);
      setLocalValue(next.toString());
      onChange(next);
    }
  };

  // Draggable Scrubbing Logic
  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    let currentVal = parseFloat(localValue);
    if (isNaN(currentVal)) currentVal = value;
    
    inputRef.current?.focus();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      // Define drag sensitivity (e.g. 3 pixels = 1 step)
      const stepsMoved = Math.floor(dx / 3);
      const next = Math.max(min, Math.min(max, currentVal + stepsMoved * step));
      setLocalValue(next.toString());
      onChange(next);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      
      const dx = upEvent.clientX - startX;
      const stepsMoved = Math.floor(dx / 3);
      const next = Math.max(min, Math.min(max, currentVal + stepsMoved * step));
      
      setLocalValue(next.toString());
      onChange(next);
      onCommit?.(next);
      inputRef.current?.blur();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const borderClass = 
    validation.status === "error" ? "border-rose-500/50 focus-within:border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]" :
    validation.status === "warn" ? "border-amber-500/50 focus-within:border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.2)]" :
    "border-white/10 focus-within:border-white/40";

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between items-center relative">
        {/* Invisible Draggable Label */}
        <div 
          className="text-white/40 uppercase text-[9px] tracking-wider font-bold flex items-center gap-1.5 cursor-ew-resize hover:text-white/80 transition-colors select-none group-hover:text-white/60"
          onMouseDown={startDrag}
          title="Drag horizontally to scrub value"
        >
          {icon && <span className="opacity-80">{icon}</span>}
          <span className="border-b border-dashed border-white/20 pb-0.5">{label}</span>
        </div>
        
        {/* Input Box */}
        <div className={cn("flex items-center gap-1 bg-[#020408]/80 border rounded px-2 py-1 transition-all duration-200 group relative z-10", borderClass)}>
          {prefix && <span className="text-white/30 text-[10px] pointer-events-none select-none font-mono">{prefix}</span>}
          <input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={cn("w-14 bg-transparent text-right font-bold outline-none text-[11px] font-mono transition-colors", colorClass)}
          />
          {suffix && <span className={cn("text-[10px] pointer-events-none select-none font-mono opacity-80", colorClass)}>{suffix}</span>}
        </div>
      </div>
      
      {/* Validation Message Container (reserves space so UI doesn't jump) */}
      <div className="h-3 overflow-hidden mt-0.5">
        <div className={cn(
          "flex items-center gap-1 text-[8px] px-1 font-bold font-mono tracking-wide transition-all duration-300", 
          validation.status === "ok" ? "opacity-0 -translate-y-2" : "opacity-100 translate-y-0",
          validation.status === "error" ? "text-rose-400" : "text-amber-400"
        )}>
          {validation.status === "error" ? <AlertCircle size={9} /> : <AlertTriangle size={9} />}
          {validation.message}
        </div>
      </div>
    </div>
  );
}
