"use client";

import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";

interface AmbientParticlesProps {
  cameraX: MotionValue<number>;
  cameraY: MotionValue<number>;
}

export default function AmbientParticles({ cameraX, cameraY }: AmbientParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      ctx.globalCompositeOperation = "screen";

      particles.forEach((p) => {
        // Slow ambient drift
        p.x += 0.1 / p.z;
        p.y -= 0.05 / p.z;

        // Wrap around
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;

        // Draw particle
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha + Math.sin(frame * 0.02 + p.x) * 0.1})`;
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
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{ background: "radial-gradient(circle at 50% 50%, transparent 20%, rgba(5,8,16,0.8) 100%)" }}
      />
    </motion.div>
  );
}
