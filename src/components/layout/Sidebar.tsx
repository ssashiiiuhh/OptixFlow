"use client";

import { motion } from "framer-motion";
import {
  BarChart2,
  BookOpen,
  ChevronRight,
  Cpu,
  Layers,
  Settings,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

// ── Nav Item definitions ─────────────────────

const NAV_ITEMS = [
  { icon: TrendingUp, label: "Strategy Lab", href: "/strategy" },
  { icon: BarChart2,  label: "Analytics",    href: "/analytics" },
  { icon: Cpu,        label: "Trade Intel",  href: "/trade-intel" },
  { icon: BookOpen,   label: "Playbook",     href: "/playbook" },
];

const BOTTOM_ITEMS = [
  { icon: Settings, label: "Settings", href: "/settings" },
];

// ── Nav Item ─────────────────────────────────

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  active: boolean;
  collapsed: boolean;
}

function SidebarItem({ icon: Icon, label, href, active, collapsed }: SidebarItemProps) {
  return (
    <Link href={href} prefetch>
      <motion.div
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.97 }}
        className={cn(
          "relative flex items-center gap-3 w-full px-3 py-2.5 rounded-lg",
          "transition-colors duration-150 cursor-pointer",
          active
            ? "bg-[var(--ox-accent-cyan-dim)] text-[var(--ox-accent-cyan)]"
            : "text-[var(--ox-text-secondary)] hover:text-[var(--ox-text-primary)] hover:bg-white/[0.04]"
        )}
      >
        {/* Active indicator bar */}
        {active && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[var(--ox-accent-cyan)] rounded-full glow-cyan"
          />
        )}

        <Icon
          size={16}
          className={cn(
            "shrink-0 transition-colors",
            active ? "text-[var(--ox-accent-cyan)]" : "text-current"
          )}
        />

        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm font-medium whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}

        {!collapsed && active && (
          <ChevronRight size={12} className="ml-auto opacity-50" />
        )}
      </motion.div>
    </Link>
  );
}

// ── Main Sidebar ─────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 60 : 220 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-full glass border-r border-[var(--ox-border-default)] shrink-0 overflow-hidden z-20"
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-[var(--ox-border-subtle)] shrink-0">
        <div className="shrink-0 w-7 h-7 rounded-md bg-[var(--ox-accent-cyan-dim)] border border-[var(--ox-accent-cyan)]/30 flex items-center justify-center glow-cyan">
          <Zap size={14} className="text-[var(--ox-accent-cyan)]" />
        </div>

        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
          >
            <span className="text-sm font-bold tracking-tight text-[var(--ox-text-primary)]">
              Optix<span className="text-[var(--ox-accent-cyan)]">Flow</span>
            </span>
            <p className="text-[10px] text-[var(--ox-text-muted)] leading-none mt-0.5">
              Options Lab v1.0
            </p>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] uppercase tracking-widest text-[var(--ox-text-muted)] px-3 mb-2">
            Platform
          </p>
        )}

        {NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            active={pathname === item.href}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-4 border-t border-[var(--ox-border-subtle)] pt-3 space-y-0.5">
        {BOTTOM_ITEMS.map((item) => (
          <SidebarItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            active={pathname === item.href}
            collapsed={collapsed}
          />
        ))}

        {/* Collapse toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setCollapsed(!collapsed)}
          className="w-full mt-2 p-2 rounded-lg text-[var(--ox-text-muted)] hover:text-[var(--ox-text-secondary)] hover:bg-white/[0.04] transition-colors flex items-center justify-center"
        >
          <motion.div
            animate={{ rotate: collapsed ? 0 : 180 }}
            transition={{ duration: 0.25 }}
          >
            <ChevronRight size={14} />
          </motion.div>
        </motion.button>
      </div>
    </motion.aside>
  );
}
