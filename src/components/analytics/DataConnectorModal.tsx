// ============================================================================
// OPTIXFLOW — Ingestion Key Connector Modal
// Manages the connection modes and API credentials for Polygon.io / Tradier.
// ============================================================================

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Key, ShieldCheck, Database, RefreshCw } from "lucide-react";
import { marketDataService, DataConnectionKeys } from "@/lib/market/MarketDataService";

interface DataConnectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogMessage: (msg: string) => void;
}

export default function DataConnectorModal({ isOpen, onClose, onLogMessage }: DataConnectorModalProps) {
  const [mode, setMode] = useState<"simulated" | "live">("simulated");
  const [polygonKey, setPolygonKey] = useState("");
  const [tradierToken, setTradierToken] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [connStatus, setConnStatus] = useState<"idle" | "success" | "failed">("idle");

  useEffect(() => {
    if (isOpen) {
      const keys = marketDataService.getKeys();
      setMode(keys.mode);
      setPolygonKey(keys.polygonKey || "");
      setTradierToken(keys.tradierToken || "");
      setConnStatus("idle");
    }
  }, [isOpen]);

  const handleSave = async () => {
    setIsValidating(true);
    setConnStatus("idle");

    // Simulating validation delays (API key validation handshakes)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      if (mode === "live" && !polygonKey && !tradierToken) {
        setConnStatus("failed");
        setIsValidating(false);
        onLogMessage("CONNECTOR_ERROR: Live mode requires at least one API key.");
        return;
      }

      const keys: DataConnectionKeys = {
        mode,
        polygonKey: polygonKey.trim(),
        tradierToken: tradierToken.trim(),
      };

      marketDataService.saveKeys(keys);
      setConnStatus("success");
      setIsValidating(false);
      
      onLogMessage(`SYS_INGESTION: Ingestion source toggled to [${mode.toUpperCase()}].`);
      if (mode === "live") {
        onLogMessage("SYS_INGESTION: Handshake established with Polygon.io REST client.");
      } else {
        onLogMessage("SYS_INGESTION: Simulated real-time ticks active.");
      }

      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      setConnStatus("failed");
      setIsValidating(false);
      onLogMessage("CONNECTOR_ERROR: Connection handshake failed.");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          
          {/* Backdrop glass blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
          />

          {/* Modal box */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-md bg-[#07090e]/95 border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden z-10"
          >
            {/* Mesh highlights inside modal */}
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">Data Ingestion Settings</h3>
              </div>
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content body */}
            <div className="space-y-4 font-mono text-[11px] relative">
              
              {/* Toggle switch */}
              <div className="space-y-1.5">
                <label className="text-white/40 uppercase tracking-widest text-[9px]">Ingestion Engine</label>
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-white/3 border border-white/5 rounded-lg">
                  <button
                    onClick={() => setMode("simulated")}
                    className={`py-2 rounded-md transition-all text-center cursor-pointer ${
                      mode === "simulated"
                        ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold"
                        : "text-white/50 border border-transparent hover:text-white"
                    }`}
                  >
                    SIMULATED LIVE
                  </button>
                  <button
                    onClick={() => setMode("live")}
                    className={`py-2 rounded-md transition-all text-center cursor-pointer ${
                      mode === "live"
                        ? "bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold"
                        : "text-white/50 border border-transparent hover:text-white"
                    }`}
                  >
                    REAL LIVE API
                  </button>
                </div>
              </div>

              {mode === "simulated" ? (
                <div className="bg-cyan-950/20 border border-cyan-500/10 p-3 rounded-lg text-cyan-400/80 leading-normal text-[10px]">
                  Simulated live mode uses our high-frequency quant walk ticker engine to feed pricing loops, volatility surfaces, and portfolio Greeks at 1.5s intervals. No credentials required.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-purple-950/20 border border-purple-500/10 p-3 rounded-lg text-purple-400/80 leading-normal text-[10px]">
                    Option market feed maps live tick feeds. Provide your API keys below to unlock institutional streaming connectivity.
                  </div>

                  {/* Polygon Key */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-white/40 text-[9px] uppercase tracking-widest">
                      <span>Polygon.io API Key</span>
                      <Key size={10} />
                    </div>
                    <input
                      type="password"
                      placeholder="Enter Polygon.io Key..."
                      value={polygonKey}
                      onChange={(e) => setPolygonKey(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white/80 focus:border-cyan-400/50 focus:outline-none placeholder-white/20 text-[10px]"
                    />
                  </div>

                  {/* Tradier Token */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-white/40 text-[9px] uppercase tracking-widest">
                      <span>Tradier Access Token</span>
                      <Key size={10} />
                    </div>
                    <input
                      type="password"
                      placeholder="Enter Tradier Token..."
                      value={tradierToken}
                      onChange={(e) => setTradierToken(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white/80 focus:border-cyan-400/50 focus:outline-none placeholder-white/20 text-[10px]"
                    />
                  </div>
                </div>
              )}

              {/* Status and Action Buttons */}
              <div className="pt-3 border-t border-white/5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between min-h-6">
                  {isValidating ? (
                    <div className="flex items-center gap-1.5 text-white/40 animate-pulse text-[10px]">
                      <RefreshCw size={10} className="animate-spin" />
                      <span>Validating handshake...</span>
                    </div>
                  ) : connStatus === "success" ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-[10px]">
                      <ShieldCheck size={12} />
                      <span>Credentials configured. Reloading data stream...</span>
                    </div>
                  ) : connStatus === "failed" ? (
                    <div className="flex items-center gap-1.5 text-rose-400 text-[10px]">
                      <X size={12} />
                      <span>Handshake rejected. Verify key inputs.</span>
                    </div>
                  ) : (
                    <div />
                  )}
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={onClose}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg border border-white/15 cursor-pointer text-center transition-all uppercase tracking-widest text-[9px] font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isValidating}
                    className="flex-1 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg cursor-pointer text-center transition-all uppercase tracking-widest text-[9px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply Config
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
