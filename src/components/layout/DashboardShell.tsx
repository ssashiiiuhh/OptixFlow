"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * The main responsive content shell.
 * Uses CSS Grid to lay out the strategy panel + chart area.
 */
export default function DashboardShell({ children, className }: DashboardShellProps) {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "flex-1 overflow-hidden relative",
        // Grid: strategy panel (left) + chart area (right)
        "grid grid-cols-1 lg:grid-cols-[340px_1fr]",
        className
      )}
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
      <div className="absolute inset-0 bg-grid opacity-50 pointer-events-none" />

      {children}
    </motion.main>
  );
}
