"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { type MarketCondition } from "@/lib/playbook-data";

export default function EnvironmentEngine({ condition }: { condition: MarketCondition }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let particles: any[] = [];
    let frame = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize particles based on condition
    const initParticles = () => {
      particles = [];
      const count = condition === "Volatile" ? 150 : condition === "Neutral" ? 80 : 100;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: Math.random() * 2 + 1,
          life: Math.random(),
          offset: Math.random() * Math.PI * 2,
        });
      }
    };
    initParticles();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      ctx.globalCompositeOperation = "screen";

      particles.forEach((p) => {
        if (condition === "Bullish") {
          // Upward flowing green particles
          p.y -= (Math.random() * 1.5 + 0.5);
          p.x += Math.sin(frame * 0.05 + p.offset) * 0.5;
          if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
          ctx.fillStyle = `rgba(0, 229, 160, ${0.1 + p.life * 0.3})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2); ctx.fill();

        } else if (condition === "Bearish") {
          // Fast descending red streaks
          p.y += (Math.random() * 3 + 2);
          if (p.y > canvas.height + 10) { p.y = -10; p.x = Math.random() * canvas.width; }
          ctx.fillStyle = `rgba(255, 77, 106, ${0.1 + p.life * 0.4})`;
          ctx.beginPath();
          ctx.rect(p.x, p.y, p.size * 0.5, p.size * 6);
          ctx.fill();

        } else if (condition === "Neutral") {
          // Slow horizontal cyan waves
          p.x += (Math.random() * 0.5 + 0.2);
          p.y += Math.sin(frame * 0.02 + p.offset) * 0.3;
          if (p.x > canvas.width + 10) { p.x = -10; p.y = Math.random() * canvas.height; }
          ctx.fillStyle = `rgba(0, 212, 255, ${0.1 + p.life * 0.2})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();

        } else if (condition === "Volatile") {
          // Chaotic erratic purple particles
          p.x += p.vx * 2;
          p.y += p.vy * 2;
          
          if (Math.random() < 0.05) {
            p.vx = (Math.random() - 0.5) * 4;
            p.vy = (Math.random() - 0.5) * 4;
          }

          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

          ctx.fillStyle = `rgba(168, 85, 247, ${0.1 + p.life * 0.5})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2); ctx.fill();
        }
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [condition]);

  // Determine radial glow color based on condition
  const getGlowColors = () => {
    switch (condition) {
      case "Bullish": return "rgba(0, 229, 160, 0.08), rgba(0, 229, 160, 0.02)";
      case "Bearish": return "rgba(255, 77, 106, 0.08), rgba(255, 77, 106, 0.02)";
      case "Neutral": return "rgba(0, 212, 255, 0.08), rgba(0, 212, 255, 0.02)";
      case "Volatile": return "rgba(168, 85, 247, 0.08), rgba(168, 85, 247, 0.02)";
    }
  };

  return (
    <motion.div 
      className="absolute inset-0 z-0 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <motion.div
        className="absolute inset-0"
        animate={{
          background: `radial-gradient(circle at 50% 50%, ${getGlowColors().split(', ')[0]} 0%, transparent 70%)`
        }}
        transition={{ duration: 1.5 }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />
      <div className="absolute inset-0 bg-grid opacity-30 mix-blend-overlay" />
    </motion.div>
  );
}
