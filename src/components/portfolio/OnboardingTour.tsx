import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Check } from "lucide-react";

interface Step {
  title: string;
  description: string;
  position: "center" | "bottom-right" | "top-left" | "top-right";
}

const TOUR_STEPS: Step[] = [
  {
    title: "Welcome to OptixFlow",
    description: "Your next-generation portfolio intelligence platform. Let's take a quick tour of the features.",
    position: "center",
  },
  {
    title: "3D Volatility Surface",
    description: "Visualize the implied volatility skew in real-time. Drag to rotate, scroll to zoom.",
    position: "bottom-right",
  },
  {
    title: "Delta-Hedger",
    description: "Automatically simulate delta-neutral hedging to protect your portfolio against directional risk.",
    position: "center", // We don't have exact target refs yet, so keep it center/general
  },
  {
    title: "AI Copilot Console",
    description: "Get real-time streaming insights and trade narratives directly from our quantitative AI.",
    position: "bottom-right",
  }
];

export default function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Auto-start tour if not seen (mocked with simple state for now)
  useEffect(() => {
    const hasSeenTour = localStorage.getItem("optixflow_tour_seen");
    if (!hasSeenTour) {
      setIsOpen(true);
    }
  }, []);

  const completeTour = () => {
    setIsOpen(false);
    localStorage.setItem("optixflow_tour_seen", "true");
  };

  const nextStep = () => {
    if (currentStep === TOUR_STEPS.length - 1) {
      completeTour();
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];

  let posClasses = "m-auto inset-0";
  if (step.position === "bottom-right") posClasses = "bottom-12 right-12";
  if (step.position === "top-left") posClasses = "top-24 left-12";
  if (step.position === "top-right") posClasses = "top-24 right-12";

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <AnimatePresence mode="wait">
        {/* Backdrop (only on first center step) */}
        {step.position === "center" && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
          />
        )}

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={`absolute ${posClasses} w-full max-w-sm pointer-events-auto`}
        >
          <div className="glass rounded-xl border border-[var(--ox-border-default)] shadow-[0_8px_32px_rgba(0,212,255,0.15)] overflow-hidden">
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-[var(--ox-accent-cyan)] uppercase tracking-widest">
                  Tour {currentStep + 1} / {TOUR_STEPS.length}
                </span>
                <button 
                  onClick={completeTour}
                  className="text-[var(--ox-text-muted)] hover:text-white transition-colors"
                  aria-label="Close tour"
                >
                  <X size={14} />
                </button>
              </div>
              <h3 className="text-lg font-bold text-[var(--ox-text-primary)] mb-2">{step.title}</h3>
              <p className="text-sm text-[var(--ox-text-muted)] leading-relaxed">
                {step.description}
              </p>
            </div>
            <div className="px-5 py-3 border-t border-white/[0.06] bg-black/40 flex justify-between items-center">
              <div className="flex gap-1.5">
                {TOUR_STEPS.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentStep ? "w-4 bg-[var(--ox-accent-cyan)]" : "w-1.5 bg-white/20"
                    }`} 
                  />
                ))}
              </div>
              <button
                onClick={nextStep}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-[var(--ox-accent-cyan)]/30 bg-[var(--ox-accent-cyan)]/10 text-[var(--ox-accent-cyan)] hover:bg-[var(--ox-accent-cyan)]/20 transition-all font-mono text-[10px] uppercase tracking-wider"
              >
                {currentStep === TOUR_STEPS.length - 1 ? (
                  <>Finish <Check size={12} /></>
                ) : (
                  <>Next <ChevronRight size={12} /></>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
