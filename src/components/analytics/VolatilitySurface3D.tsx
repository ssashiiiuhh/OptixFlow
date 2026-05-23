// ============================================================================
// OPTIXFLOW — Volatility Surface Engine (3D living probabilistic terrain)
// Renders an interactive 3D mesh grid of Implied Volatility across Strike and DTE.
// Custom projection math on HTML5 Canvas. Supports drag-to-rotate.
// ============================================================================

import React, { useRef, useEffect, useState, useMemo } from "react";
import { MarketAsset, marketDataService } from "@/lib/market/MarketDataService";

interface VolatilitySurface3DProps {
  asset: MarketAsset;
  regimeColor: string;
}

interface Point3D {
  x: number; // Expiry/DTE axis (standardised -0.5 to 0.5)
  y: number; // Strike axis (standardised -0.5 to 0.5)
  z: number; // Implied Volatility axis (standardised -0.5 to 0.5)
  // Raw parameters
  dte: number;
  strike: number;
  iv: number;
  // Projected 2D coordinates
  px: number;
  py: number;
}

interface Quad3D {
  p0: Point3D;
  p1: Point3D;
  p2: Point3D;
  p3: Point3D;
  avgZ: number; // For depth sorting (Painter's Algorithm)
}

export default function VolatilitySurface3D({ asset, regimeColor }: VolatilitySurface3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Rotation state: theta (yaw, left/right) and phi (pitch, up/down)
  const [rotation, setRotation] = useState({ theta: -0.65, phi: 0.65 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const rotationStart = useRef({ theta: 0, phi: 0 });

  // Hover target
  const [hoveredPoint, setHoveredPoint] = useState<Point3D | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Grid expiries and strike points
  const expiries = useMemo(() => [7, 14, 21, 30, 45, 60, 90], []);
  const strikes = useMemo(() => {
    const spot = asset.price;
    let step = 5;
    if (spot < 100) step = 2.5;
    else if (spot > 500) step = 10;
    
    // Generate 9 strike slices centered near spot
    const center = Math.round(spot / step) * step;
    return Array.from({ length: 9 }, (_, i) => center + (i - 4) * step);
  }, [asset.price]);

  // Construct 3D mesh points
  const points = useMemo<Point3D[]>(() => {
    const spot = asset.price;
    const meshPoints: Point3D[] = [];

    expiries.forEach((dte, xIdx) => {
      // Standardise X to [-0.5, 0.5]
      const x = (xIdx / (expiries.length - 1)) - 0.5;

      strikes.forEach((strike, yIdx) => {
        // Standardise Y to [-0.5, 0.5]
        const y = (yIdx / (strikes.length - 1)) - 0.5;

        // Fetch volatility from Quant Layer
        const iv = marketDataService.calculateStrikeIv(asset, strike, dte);
        
        // Standardise Z (IV) to [-0.5, 0.5]. Target normalisation: IV range [0% to 150%]
        // z represents height
        const z = (iv - 0.5); 

        meshPoints.push({
          x,
          y,
          z,
          dte,
          strike,
          iv: iv * 100, // percentage for tooltip
          px: 0,
          py: 0
        });
      });
    });

    return meshPoints;
  }, [asset, expiries, strikes]);

  // Mouse event listeners for rotation dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    rotationStart.current = { ...rotation };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setMousePos({ x: mx, y: my });

    if (isDragging) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      
      // Scale rotation sensitivity
      const speed = 0.005;
      setRotation({
        theta: rotationStart.current.theta + dx * speed,
        // Clamp pitch to avoid turning completely upside down or underneath
        phi: Math.max(0.15, Math.min(1.4, rotationStart.current.phi + dy * speed))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoveredPoint(null);
  };

  // Touch triggers for mobile viewports
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    rotationStart.current = { ...rotation };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.current.x;
    const dy = e.touches[0].clientY - dragStart.current.y;
    const speed = 0.005;
    setRotation({
      theta: rotationStart.current.theta + dx * speed,
      phi: Math.max(0.15, Math.min(1.4, rotationStart.current.phi + dy * speed))
    });
  };

  // Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2 + 10; // Shift down slightly to accommodate height

    // Scale parameter: size of the bounding cube
    const cubeScaleX = width * 0.55;
    const cubeScaleY = width * 0.40;
    const cubeScaleZ = height * 0.40;

    // Rotation parameters
    const cosT = Math.cos(rotation.theta);
    const sinT = Math.sin(rotation.theta);
    const cosP = Math.cos(rotation.phi);
    const sinP = Math.sin(rotation.phi);

    // 3D to 2D projection function
    const project = (x: number, y: number, z: number) => {
      // 1. Scale in 3D
      const sx = x * cubeScaleX;
      const sy = y * cubeScaleY;
      const sz = z * cubeScaleZ;

      // 2. Rotate around Z (Yaw / Theta)
      const xRot = sx * cosT - sy * sinT;
      const yRot = sx * sinT + sy * cosT;
      
      // 3. Rotate around X (Pitch / Phi)
      // Standard isometric projection coordinates
      const px = cx + xRot;
      const py = cy + (yRot * sinP - sz * cosP);

      // Depth coordinate (for Painter's Algorithm sorting)
      // Farther points have higher depth values
      const depth = yRot * cosP + sz * sinP;

      return { px, py, depth };
    };

    // Project all mesh points and update their px, py
    const projectedPoints = points.map((p) => {
      const proj = project(p.x, p.y, p.z);
      return {
        ...p,
        px: proj.px,
        py: proj.py,
        depth: proj.depth
      };
    });

    // Create quads for surface drawing
    const quads: Quad3D[] = [];
    const numX = expiries.length;
    const numY = strikes.length;

    for (let x = 0; x < numX - 1; x++) {
      for (let y = 0; y < numY - 1; y++) {
        // Indices of the four quad corners
        const idx0 = x * numY + y;
        const idx1 = x * numY + (y + 1);
        const idx2 = (x + 1) * numY + (y + 1);
        const idx3 = (x + 1) * numY + y;

        const p0 = projectedPoints[idx0];
        const p1 = projectedPoints[idx1];
        const p2 = projectedPoints[idx2];
        const p3 = projectedPoints[idx3];

        // Average depth of the quad coordinates
        const avgDepth = ((p0 as any).depth + (p1 as any).depth + (p2 as any).depth + (p3 as any).depth) / 4;

        quads.push({ p0, p1, p2, p3, avgZ: avgDepth });
      }
    }

    // Sort quads by depth (Painter's algorithm: draw farthest quads first)
    // In our coordinate projection, larger depth = closer to camera, smaller depth = farther.
    // So sort ascending: draw smaller depth (back) to larger depth (front).
    quads.sort((a, b) => a.avgZ - b.avgZ);

    // Draw floor grid shadow
    ctx.strokeStyle = "rgba(255,255,255,0.02)";
    ctx.lineWidth = 1;
    for (let x = -0.5; x <= 0.5; x += 0.166) {
      const start = project(x, -0.5, -0.5);
      const end = project(x, 0.5, -0.5);
      ctx.beginPath();
      ctx.moveTo(start.px, start.py);
      ctx.lineTo(end.px, end.py);
      ctx.stroke();
    }
    for (let y = -0.5; y <= 0.5; y += 0.125) {
      const start = project(-0.5, y, -0.5);
      const end = project(0.5, y, -0.5);
      ctx.beginPath();
      ctx.moveTo(start.px, start.py);
      ctx.lineTo(end.px, end.py);
      ctx.stroke();
    }

    // Draw solid-looking surface quads
    quads.forEach((quad) => {
      ctx.beginPath();
      ctx.moveTo(quad.p0.px, quad.p0.py);
      ctx.lineTo(quad.p1.px, quad.p1.py);
      ctx.lineTo(quad.p2.px, quad.p2.py);
      ctx.lineTo(quad.p3.px, quad.p3.py);
      ctx.closePath();

      // Translucent gradient fill matching regime color
      // Heights determine opacity: higher IV is slightly brighter
      const avgIv = (quad.p0.iv + quad.p1.iv + quad.p2.iv + quad.p3.iv) / 4;
      const opacity = Math.min(0.22, 0.05 + (avgIv / 150) * 0.18);
      ctx.fillStyle = `${regimeColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
      ctx.fill();

      // Mesh wire borders
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 0.6;
      ctx.stroke();
    });

    // Draw structural curves (thick wire lines along maturities/strikes)
    ctx.lineWidth = 1.2;
    // Connect along Strike slices (for each expiry)
    for (let x = 0; x < numX; x++) {
      ctx.beginPath();
      for (let y = 0; y < numY; y++) {
        const p = projectedPoints[x * numY + y];
        if (y === 0) ctx.moveTo(p.px, p.py);
        else ctx.lineTo(p.px, p.py);
      }
      // Stroke color shifts brighter based on expiration
      ctx.strokeStyle = `${regimeColor}66`;
      ctx.stroke();
    }

    // Connect along Expiry slices (for each strike)
    for (let y = 0; y < numY; y++) {
      ctx.beginPath();
      for (let x = 0; x < numX; x++) {
        const p = projectedPoints[x * numY + y];
        if (x === 0) ctx.moveTo(p.px, p.py);
        else ctx.lineTo(p.px, p.py);
      }
      // Highlight ATM slice with brighter glow
      const isAtmStrike = y === 4; // middle strike
      ctx.strokeStyle = isAtmStrike ? "rgba(0, 212, 255, 0.6)" : `${regimeColor}44`;
      ctx.lineWidth = isAtmStrike ? 1.8 : 1.0;
      ctx.stroke();
    }

    // Draw spot price intersection plane (vertical cyan overlay)
    const spotIdx = 4; // center strike represents ATM
    ctx.strokeStyle = "rgba(0, 212, 255, 0.25)";
    ctx.lineWidth = 1.0;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let x = 0; x < numX; x++) {
      const p = projectedPoints[x * numY + spotIdx];
      if (x === 0) ctx.moveTo(p.px, p.py);
      else ctx.lineTo(p.px, p.py);
    }
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // ── HOVER MAPPING DETECTION ──
    let closestPoint: Point3D | null = null;
    let minDistance = 20; // 20px detection threshold

    projectedPoints.forEach((p) => {
      const dx = mousePos.x - p.px;
      const dy = mousePos.y - p.py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDistance) {
        minDistance = dist;
        closestPoint = p;
      }
    });

    if (closestPoint) {
      setHoveredPoint(closestPoint);

      // Highlight target vertex
      ctx.beginPath();
      ctx.arc((closestPoint as any).px, (closestPoint as any).py, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#00d4ff";
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow

      // Draw projection lines to floor
      const floorProj = project((closestPoint as any).x, (closestPoint as any).y, -0.5);
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 2]);
      ctx.moveTo((closestPoint as any).px, (closestPoint as any).py);
      ctx.lineTo(floorProj.px, floorProj.py);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw projection lines on the floor to the axes
      const floorAxisX = project((closestPoint as any).x, -0.5, -0.5);
      const floorAxisY = project(-0.5, (closestPoint as any).y, -0.5);
      
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.moveTo(floorProj.px, floorProj.py);
      ctx.lineTo(floorAxisX.px, floorAxisX.py);
      ctx.moveTo(floorProj.px, floorProj.py);
      ctx.lineTo(floorAxisY.px, floorAxisY.py);
      ctx.stroke();
    } else {
      setHoveredPoint(null);
    }
  }, [points, rotation, mousePos, isDragging, regimeColor, strikes, expiries]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      
      {/* 3D Canvas Rendering viewport */}
      <canvas
        ref={canvasRef}
        width={500}
        height={320}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing z-10"
      />

      {/* Surface Legend axis tags */}
      <div className="absolute bottom-2.5 left-4 text-[8px] font-mono text-white/30 pointer-events-none flex flex-col gap-1 select-none z-0">
        <div>Z-AXIS: IMPLIED VOLATILITY (IV%)</div>
        <div>Y-AXIS: OPTION STRIKE PRICE ($)</div>
        <div>X-AXIS: DAYS TO EXPIRATION (DTE)</div>
      </div>

      <div className="absolute top-2.5 right-4 text-[8px] font-mono text-cyan-400 bg-cyan-950/20 border border-cyan-500/10 px-2 py-0.5 rounded pointer-events-none select-none z-0">
        DRAG TO ROTATE 3D TERRAIN
      </div>

      {/* Floating Hover Tooltip overlay */}
      {hoveredPoint && (
        <div
          className="absolute z-20 pointer-events-none bg-black/95 border border-white/15 px-3 py-2 rounded-lg font-mono text-[9px] shadow-2xl flex flex-col gap-0.5"
          style={{
            left: Math.max(12, Math.min(canvasRef.current?.width ? canvasRef.current.width - 135 : 300, mousePos.x + 15)),
            top: Math.max(12, Math.min(canvasRef.current?.height ? canvasRef.current.height - 75 : 200, mousePos.y - 65)),
            boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
          }}
        >
          <div className="text-white/40 uppercase tracking-widest text-[7px] border-b border-white/5 pb-0.5 mb-1 font-bold">Terrain Probe</div>
          <div>DTE MATURITY: <span className="text-emerald-400 font-bold">{hoveredPoint.dte} Days</span></div>
          <div>STRIKE PRICE: <span className="text-cyan-400 font-bold">${hoveredPoint.strike.toFixed(2)}</span></div>
          <div>IMPLIED VOL: <span className="text-purple-400 font-bold">{hoveredPoint.iv.toFixed(1)}%</span></div>
        </div>
      )}
    </div>
  );
}
