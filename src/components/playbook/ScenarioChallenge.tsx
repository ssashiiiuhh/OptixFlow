"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { SCENARIO_CHALLENGES } from "@/lib/playbook-data";
import { CheckCircle2, XCircle } from "lucide-react";

export default function ScenarioChallenge() {
  const [activeQuiz, setActiveQuiz] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const quiz = SCENARIO_CHALLENGES[activeQuiz];

  const handleSelect = (idx: number) => {
    if (selectedAnswer !== null) return; // Prevent changing answer
    setSelectedAnswer(idx);
  };

  const nextQuiz = () => {
    setSelectedAnswer(null);
    setActiveQuiz((prev) => (prev + 1) % SCENARIO_CHALLENGES.length);
  };

  return (
    <div className="glass rounded-2xl border border-[var(--ox-border-default)] p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full bg-[#ff4d6a]" style={{ boxShadow: "0 0 8px rgba(255,77,106,0.5)" }} />
          <h2 className="text-sm font-semibold text-[var(--ox-text-primary)]">Scenario Challenges</h2>
        </div>
        <span className="text-[9px] font-mono text-[var(--ox-text-muted)]">
          {activeQuiz + 1} / {SCENARIO_CHALLENGES.length}
        </span>
      </div>

      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div 
            key={quiz.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1"
          >
            <h3 className="text-[12px] font-bold text-[var(--ox-text-primary)] mb-2">{quiz.title}</h3>
            <p className="text-[11px] text-[var(--ox-text-secondary)] mb-4 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5">
              {quiz.setup}
            </p>

            <div className="space-y-2">
              {quiz.options.map((opt, idx) => {
                const isSelected = selectedAnswer === idx;
                const showResult = selectedAnswer !== null;
                
                let borderColor = "var(--ox-border-default)";
                let bgColor = "rgba(11,14,22,0.4)";
                
                if (showResult) {
                  if (opt.correct) {
                    borderColor = "var(--ox-accent-green)";
                    bgColor = "rgba(0,229,160,0.1)";
                  } else if (isSelected) {
                    borderColor = "var(--ox-accent-red)";
                    bgColor = "rgba(255,77,106,0.1)";
                  }
                }

                return (
                  <motion.button
                    key={idx}
                    whileHover={showResult ? {} : { scale: 1.01, backgroundColor: "rgba(255,255,255,0.05)" }}
                    whileTap={showResult ? {} : { scale: 0.99 }}
                    onClick={() => handleSelect(idx)}
                    disabled={showResult}
                    className="w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-2"
                    style={{ borderColor, background: bgColor }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-medium text-[var(--ox-text-primary)]">{opt.label}</span>
                      {showResult && opt.correct && <CheckCircle2 size={14} className="text-[var(--ox-accent-green)]" />}
                      {showResult && isSelected && !opt.correct && <XCircle size={14} className="text-[var(--ox-accent-red)]" />}
                    </div>
                    {showResult && (isSelected || opt.correct) && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: "auto" }}
                        className="text-[9px] text-[var(--ox-text-muted)]"
                      >
                        {opt.explanation}
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {selectedAnswer !== null && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={nextQuiz}
            className="mt-4 w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[var(--ox-accent-cyan)] text-black hover:bg-opacity-90 transition-colors"
          >
            Next Scenario
          </motion.button>
        )}
      </div>
    </div>
  );
}
