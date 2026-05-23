"use client";

import { useEffect, useRef } from "react";
import { motion, MotionValue, useTransform } from "framer-motion";

interface AmbientParticlesProps {
  cameraX: MotionValue<number>;
  cameraY: MotionValue<number>;
  activeColor?: string;
  decayIntensity?: number;             // 0 = normal, 1 = fully decayed
  ivIntensityRef?: React.RefObject<number>; // ref to IV intensity (0=low, 1=high) — written at 60fps without re-renders
}

export default function AmbientParticles({ cameraX, cameraY, activeColor, decayIntensity = 0, ivIntensityRef }: AmbientParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const decayRef = useRef(decayIntensity);
  useEffect(() => { decayRef.current = decayIntensity; }, [decayIntensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let particles: { x: number; y: number; z: number; size: number; alpha: number }[] = [];
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize 100 particles with depth (z)
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * 3 + 1, // 1 (far) to 4 (near)
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
      });
    }

    let frame = 0;

    const draw = () => {
      const decay = decayRef.current;
      // Read IV directly from the shared ref — no React state, no re-renders
      const iv = ivIntensityRef?.current ?? 0.5;
      const speedMult = (1 - decay * 0.8) * (0.6 + iv * 0.8);
      const alphaMult = 1 - decay * 0.6;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      ctx.globalCompositeOperation = "screen";

      particles.forEach((p) => {
        // Slow ambient drift — slows as decay increases
        p.x += (0.1 / p.z) * speedMult;
        p.y -= (0.05 / p.z) * speedMult;

        // Wrap around
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;

        // Draw particle — dims as decay intensifies
        const particleAlpha = (p.alpha + Math.sin(frame * 0.02 + p.x) * 0.1) * alphaMult;
        ctx.fillStyle = `rgba(255, 255, 255, ${particleAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.z * 0.5, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Parallax: back particles move very little, front particles move more.
  // We use the canvas for deep space, and we'll apply a subtle inverse transform 
  // on the container to simulate parallax against the foreground camera.
  const bgX = useTransform(cameraX, (x) => x * -0.05);
  const bgY = useTransform(cameraY, (y) => y * -0.05);

  return (
    <motion.div 
      className="absolute inset-0 pointer-events-none z-0"
      style={{ x: bgX, y: bgY }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-40" />
      
      {/* Cinematic subtle grid and vignettes */}
      <div className="absolute inset-0 bg-grid opacity-20 mix-blend-overlay" />
      
      {/* Default vignette */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{ background: "radial-gradient(circle at 50% 50%, transparent 20%, rgba(5,8,16,0.8) 100%)" }}
      />
      
      {/* Active Color Environmental Glow */}
      <motion.div 
        className="absolute inset-0 pointer-events-none transition-colors duration-1000 mix-blend-screen"
        initial={false}
        animate={{ 
          background: activeColor 
            ? `radial-gradient(circle at 50% 50%, ${activeColor}15 0%, transparent 80%)` 
            : 'radial-gradient(circle at 50% 50%, transparent 0%, transparent 100%)'
        }}
      />
    </motion.div>
  );
}
