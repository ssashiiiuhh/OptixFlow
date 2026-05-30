// ============================================================================
// OPTIXFLOW — Interactive 3D Volatility Skew Surface v2
// + Projected axis labels (strike/DTE/IV) that track camera rotation
// + Portfolio payoff curve overlay at ATM DTE slice (gold line)
// ============================================================================

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { usePortfolio } from "../portfolio/PortfolioContext";
import { generateIVSurface, updateIVSurfaceAsync, type IVSurfaceGrid } from "@/lib/quant/surface/ivSurface";
import { motion } from "framer-motion";
import { Layers, RotateCcw, Maximize2, TrendingUp } from "lucide-react";
import { surfaceVertexShader, surfaceFragmentShader } from "./SurfaceShaders";
import SurfaceTelemetry from "./SurfaceTelemetry";

const N_STRIKES = 24;
const N_DTES = 16;
const SCALE_X = 10;
const SCALE_Y = 10;
const SCALE_Z = 8;

// ── Color map: low IV → cyan, mid → amber, high → red ──────────────────────
function ivToColor(iv: number, minIV: number, maxIV: number): THREE.Color {
  const t = Math.max(0, Math.min(1, (iv - minIV) / (maxIV - minIV || 1)));
  if (t < 0.5) {
    const s = t * 2;
    return new THREE.Color(s * 0.96, 0.83 - s * 0.18, 1.0 - s * 0.86);
  }
  const s = (t - 0.5) * 2;
  return new THREE.Color(0.96 + s * 0.04, 0.65 - s * 0.65, 0.14 - s * 0.14);
}

// ── Project a 3D world point to 2D canvas pixels ────────────────────────────
function projectToScreen(
  point: THREE.Vector3,
  camera: THREE.Camera,
  w: number,
  h: number,
): { x: number; y: number; visible: boolean } {
  const v = point.clone().project(camera);
  return {
    x: ((v.x + 1) / 2) * w,
    y: (-(v.y - 1) / 2) * h,
    visible: v.z < 1,
  };
}

// ── Compute first+second order payoff line across strike axis ─────────────────
function computePayoffVertices(
  holdings: { delta: number; gamma: number; quantity: number }[],
  strikes: number[],   // moneyness values
  currentSpot: number, // e.g. SPY ~530
  dteSliceY: number,   // fixed Y world position for the overlay
  minIV: number,
  maxIV: number,
): number[] {
  const verts: number[] = [];
  let minPnl = Infinity, maxPnl = -Infinity;

  const pnls = strikes.map((m) => {
    const spotChange = currentSpot * m;
    let pnl = 0;
    holdings.forEach((h) => {
      const qty = Math.abs(h.quantity) * 100; // 100 shares per contract
      pnl += h.delta * spotChange * qty;
      pnl += 0.5 * h.gamma * spotChange * spotChange * qty;
    });
    minPnl = Math.min(minPnl, pnl);
    maxPnl = Math.max(maxPnl, pnl);
    return pnl;
  });

  const pnlRange = maxPnl - minPnl || 1;
  strikes.forEach((m, xi) => {
    const x = (xi / (N_STRIKES - 1) - 0.5) * SCALE_X;
    const z = 0.5 + ((pnls[xi] - minPnl) / pnlRange) * (SCALE_Z * 0.85);
    verts.push(x, dteSliceY, z);
  });
  return verts;
}

// ── Label definition for projected axis labels ───────────────────────────────
interface AxisLabel {
  ref: React.RefObject<HTMLDivElement | null>;
  worldPos: THREE.Vector3;
  text: string;
  color: string;
  anchor: "left" | "right" | "center";
}

export default function VolatilitySurface3D() {
  const { portfolioGreeks, holdings, isTicking, spotPrices } = usePortfolio();
  
  // ── Use the real active spot price (defaulting to SPY or 530)
  const currentSpot = spotPrices["SPY"] || Object.values(spotPrices)[0] || 530;

  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const payoffLineRef = useRef<THREE.Line | null>(null);
  const frameRef = useRef<number>(0);
  const gridRef = useRef<IVSurfaceGrid | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPayoff, setShowPayoff] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);

  // Target buffers for vertex lerping
  const targetZRef = useRef<Float32Array | null>(null);
  const targetColRef = useRef<Float32Array | null>(null);
  const targetViolRef = useRef<Float32Array | null>(null);

  // Axis label refs (DOM elements updated directly in RAF loop)
  const labelStrikeLeft  = useRef<HTMLDivElement>(null);
  const labelStrikeRight = useRef<HTMLDivElement>(null);
  const labelDTENear     = useRef<HTMLDivElement>(null);
  const labelDTEFar      = useRef<HTMLDivElement>(null);
  const labelIVLow       = useRef<HTMLDivElement>(null);
  const labelIVHigh      = useRef<HTMLDivElement>(null);
  const labelATM         = useRef<HTMLDivElement>(null);
  const labelsContainerRef = useRef<HTMLDivElement>(null);

  // ── Geometry builders ─────────────────────────────────────────────────────

  const buildGeometry = useCallback((grid: IVSurfaceGrid) => {
    const geo = new THREE.BufferGeometry();
    const verts: number[] = [], colors: number[] = [], idx: number[] = [], viols: number[] = [];
    for (let xi = 0; xi < N_STRIKES; xi++) {
      for (let yi = 0; yi < N_DTES; yi++) {
        const p = grid.points[xi * N_DTES + yi];
        const x = (xi / (N_STRIKES - 1) - 0.5) * SCALE_X;
        const y = (yi / (N_DTES - 1) - 0.5) * SCALE_Y;
        const z = ((p.iv - grid.minIV) / (grid.maxIV - grid.minIV || 1)) * SCALE_Z;
        verts.push(x, y, z);
        const col = ivToColor(p.iv, grid.minIV, grid.maxIV);
        colors.push(col.r, col.g, col.b);
        viols.push(p.violationMagnitude || 0);
      }
    }
    for (let xi = 0; xi < N_STRIKES - 1; xi++) {
      for (let yi = 0; yi < N_DTES - 1; yi++) {
        const a = xi * N_DTES + yi, b = a + 1, c = (xi + 1) * N_DTES + yi, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute("aViolation", new THREE.Float32BufferAttribute(viols, 1));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }, []);

  const updateGeometry = useCallback((grid: IVSurfaceGrid) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    
    // Initialize target buffers if empty
    if (!targetZRef.current) targetZRef.current = new Float32Array(N_STRIKES * N_DTES);
    if (!targetColRef.current) targetColRef.current = new Float32Array(N_STRIKES * N_DTES * 3);
    if (!targetViolRef.current) targetViolRef.current = new Float32Array(N_STRIKES * N_DTES);
    
    for (let xi = 0; xi < N_STRIKES; xi++) {
      for (let yi = 0; yi < N_DTES; yi++) {
        const idx = xi * N_DTES + yi;
        const p = grid.points[idx];
        
        targetZRef.current[idx] = ((p.iv - grid.minIV) / (grid.maxIV - grid.minIV || 1)) * SCALE_Z;
        const col = ivToColor(p.iv, grid.minIV, grid.maxIV);
        targetColRef.current[idx * 3] = col.r;
        targetColRef.current[idx * 3 + 1] = col.g;
        targetColRef.current[idx * 3 + 2] = col.b;
        targetViolRef.current[idx] = p.violationMagnitude || 0;
      }
    }
  }, []);

  const updatePayoffLine = useCallback(() => {
    const line = payoffLineRef.current;
    if (!line || !showPayoff) return;
    const strikes = Array.from({ length: N_STRIKES }, (_, i) => -0.25 + (i / (N_STRIKES - 1)) * 0.5);
    const dteSliceY = 0; // ATM DTE slice at centre
    
    const verts = computePayoffVertices(
      holdings.map(h => ({ delta: h.delta, gamma: h.gamma, quantity: h.quantity })),
      strikes, currentSpot, dteSliceY,

      gridRef.current?.minIV ?? 0.1, gridRef.current?.maxIV ?? 0.8,
    );
    const posAttr = line.geometry.getAttribute("position") as THREE.BufferAttribute;
    verts.forEach((v, i) => posAttr.array[i] = v);
    posAttr.needsUpdate = true;
    (line as THREE.Line).visible = showPayoff;
  }, [holdings, showPayoff]);

  // ── Three.js scene init ───────────────────────────────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const w = container.clientWidth, h = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);
    camera.position.set(8, -14, 10);
    camera.up.set(0, 0, 1);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 5;
    controls.maxDistance = 40;
    controls.target.set(0, 0, 2);
    controls.update();
    controlsRef.current = controls;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const d1 = new THREE.DirectionalLight(0x00d4ff, 1.2); d1.position.set(10, -10, 15); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xff4d6a, 0.6); d2.position.set(-10, 10, 5); scene.add(d2);

    // Floor grid
    const grid = new THREE.GridHelper(12, 12, 0x1a2235, 0x0d1520);
    grid.rotation.x = Math.PI / 2; grid.position.z = -0.05; scene.add(grid);

    // Axis arrow helpers (colored arrows showing X=Strike, Y=DTE, Z=IV)
    const arrowMat = { headLength: 0.4, headWidth: 0.25 };
    const xArr = new THREE.ArrowHelper(new THREE.Vector3(1,0,0), new THREE.Vector3(-5.5,-5.5,-0.1), 2.5, 0x00d4ff, arrowMat.headLength, arrowMat.headWidth);
    scene.add(xArr);
    const yArr = new THREE.ArrowHelper(new THREE.Vector3(0,1,0), new THREE.Vector3(-5.5,-5.5,-0.1), 2.5, 0x00e5a0, arrowMat.headLength, arrowMat.headWidth);
    scene.add(yArr);
    const zArr = new THREE.ArrowHelper(new THREE.Vector3(0,0,1), new THREE.Vector3(-5.5,-5.5,-0.1), 2.5, 0xf5a623, arrowMat.headLength, arrowMat.headWidth);
    scene.add(zArr);

    // Axis guide lines
    const lineMat = new THREE.LineBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.5 });
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-5.5,-5,0), new THREE.Vector3(5.5,-5,0)]), lineMat));
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-5,-5.5,0), new THREE.Vector3(-5,5.5,0)]), lineMat));

    // ATM vertical dashed line marker (at moneyness=0)
    const atmLinePts: THREE.Vector3[] = [];
    for (let k = 0; k <= 10; k++) atmLinePts.push(new THREE.Vector3(0, -5.5, k / 10 * SCALE_Z));
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(atmLinePts),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, linewidth: 1 })));

    // Build IV surface
    const avgIV = (portfolioGreeks.avgIV || 25) / 100;
    const ivGrid = generateIVSurface(avgIV, currentSpot, N_STRIKES, N_DTES);
    gridRef.current = ivGrid;

    const geo = buildGeometry(ivGrid);
    const uniforms = {
      uTime: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      vertexShader: surfaceVertexShader,
      fragmentShader: surfaceFragmentShader,
      uniforms,
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    meshRef.current = mesh;

    // Wireframe overlay
    const wireMesh = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({ vertexColors: true, wireframe: true, transparent: true, opacity: 0.10 }));
    mesh.add(wireMesh);

    // Payoff line (gold)
    const payoffGeo = new THREE.BufferGeometry();
    const payoffVerts = new Float32Array(N_STRIKES * 3);
    payoffGeo.setAttribute("position", new THREE.BufferAttribute(payoffVerts, 3));
    const payoffLine = new THREE.Line(payoffGeo,
      new THREE.LineBasicMaterial({ color: 0xf5c542, linewidth: 2, transparent: true, opacity: 0.9 }));
    scene.add(payoffLine);
    payoffLineRef.current = payoffLine;

    // Render loop with projected label updates
    let alive = true;
    const labelPoints = [
      { ref: labelStrikeLeft,  world: new THREE.Vector3(-5.5, -5.8, -0.3), },
      { ref: labelStrikeRight, world: new THREE.Vector3( 5.5, -5.8, -0.3), },
      { ref: labelDTENear,     world: new THREE.Vector3(-6.2, -5,   -0.3), },
      { ref: labelDTEFar,      world: new THREE.Vector3(-6.2,  5,   -0.3), },
      { ref: labelIVLow,       world: new THREE.Vector3(-6.2, -5.5,  0),   },
      { ref: labelIVHigh,      world: new THREE.Vector3(-6.2, -5.5,  SCALE_Z), },
      { ref: labelATM,         world: new THREE.Vector3( 0,   -5.8, -0.3), },
    ];

    const animate = () => {
      if (!alive) return;
      frameRef.current = requestAnimationFrame(animate);
      controls.update();

      // Lerp vertices towards target if updated
      const mesh = meshRef.current;
      if (mesh && targetZRef.current && targetColRef.current) {
        const posA = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
        const colA = mesh.geometry.getAttribute("color") as THREE.BufferAttribute;
        const violA = mesh.geometry.getAttribute("aViolation") as THREE.BufferAttribute;
        let needsUpdate = false;
        
        for (let i = 0; i < N_STRIKES * N_DTES; i++) {
          const currentZ = posA.getZ(i);
          const targetZ = targetZRef.current[i];
          if (Math.abs(currentZ - targetZ) > 0.001) {
            posA.setZ(i, currentZ + (targetZ - currentZ) * 0.1);
            needsUpdate = true;
          }
          
          const currentR = colA.getX(i);
          const targetR = targetColRef.current[i * 3];
          if (Math.abs(currentR - targetR) > 0.001) {
            colA.setXYZ(
              i,
              currentR + (targetR - currentR) * 0.1,
              colA.getY(i) + (targetColRef.current[i * 3 + 1] - colA.getY(i)) * 0.1,
              colA.getZ(i) + (targetColRef.current[i * 3 + 2] - colA.getZ(i)) * 0.1
            );
            needsUpdate = true;
          }

          if (targetViolRef.current) {
            const currentV = violA.getX(i);
            const targetV = targetViolRef.current[i];
            if (Math.abs(currentV - targetV) > 0.001) {
              violA.setX(i, currentV + (targetV - currentV) * 0.1);
              needsUpdate = true;
            }
          }
        }
        
        if (needsUpdate) {
          posA.needsUpdate = true;
          colA.needsUpdate = true;
          if (violA) violA.needsUpdate = true;
          mesh.geometry.computeVertexNormals();
        }

        // Update uTime uniform for shader pulse
        if ((mesh.material as THREE.ShaderMaterial).uniforms) {
          (mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = performance.now() / 1000.0;
        }
      }

      renderer.render(scene, camera);

      // Update projected label positions via direct DOM manipulation
      const cw = container.clientWidth, ch = container.clientHeight;
      labelPoints.forEach(({ ref, world }) => {
        if (!ref.current) return;
        const { x, y, visible } = projectToScreen(world, camera, cw, ch);
        ref.current.style.left = `${x}px`;
        ref.current.style.top  = `${y}px`;
        ref.current.style.opacity = visible ? "1" : "0";
      });
    };
    animate();

    const ro = new ResizeObserver(() => {
      if (!container) return;
      const nw = container.clientWidth, nh = container.clientHeight;
      renderer.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    });
    ro.observe(container);

    return () => {
      alive = false;
      cancelAnimationFrame(frameRef.current);
      controls.dispose();
      renderer.dispose();
      ro.disconnect();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update surface on IV change
  useEffect(() => {
    if (!gridRef.current) return;
    
    let active = true;
    const fetchAsync = async () => {
      setIsCalculating(true);
      const updated = await updateIVSurfaceAsync(gridRef.current!, (portfolioGreeks.avgIV || 25) / 100, currentSpot);
      if (!active) return;
      gridRef.current = updated;
      updateGeometry(updated);
      updatePayoffLine();
      setIsCalculating(false);
    };
    
    fetchAsync();
    
    return () => { active = false; };
  }, [portfolioGreeks.avgIV, currentSpot, updateGeometry, updatePayoffLine]);

  // Update payoff when holdings change
  useEffect(() => {
    updatePayoffLine();
  }, [holdings, showPayoff, updatePayoffLine]);

  const resetCamera = () => {
    cameraRef.current?.position.set(8, -14, 10);
    controlsRef.current?.target.set(0, 0, 2);
    controlsRef.current?.update();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`glass rounded-2xl border border-[var(--ox-border-default)] overflow-hidden relative flex flex-col transition-all duration-500 ${isExpanded ? "h-[540px]" : "h-[380px]"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-[var(--ox-accent-cyan)]" style={{ filter: "drop-shadow(0 0 6px rgba(0,212,255,0.6))" }} />
          <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--ox-text-primary)]">3D Volatility Skew Surface</span>
          <span className="text-[9px] font-mono text-[var(--ox-text-muted)] opacity-50">// Strike × DTE × IV</span>
          {isTicking && <span className="h-1.5 w-1.5 rounded-full bg-[var(--ox-accent-green)] animate-pulse ml-1" />}
        </div>
        <div className="flex items-center gap-3">
          {/* Axis legend */}
          <div className="hidden md:flex items-center gap-3 text-[9px] font-mono">
            <span className="flex items-center gap-1 text-[var(--ox-accent-cyan)]/80"><span className="h-2.5 w-0.5 rounded-full bg-[var(--ox-accent-cyan)] inline-block" /> Strike</span>
            <span className="flex items-center gap-1 text-[var(--ox-accent-green)]/80"><span className="h-2.5 w-0.5 rounded-full bg-[var(--ox-accent-green)] inline-block" /> DTE</span>
            <span className="flex items-center gap-1 text-[var(--ox-accent-amber)]/80"><span className="h-2.5 w-0.5 rounded-full bg-[var(--ox-accent-amber)] inline-block" /> IV</span>
            <span className="flex items-center gap-1 text-[#f5c542]/80"><span className="h-px w-4 bg-[#f5c542] inline-block" /> P&amp;L</span>
          </div>

          {/* Payoff toggle */}
          <button
            onClick={() => setShowPayoff(p => !p)}
            className={`flex items-center gap-1 text-[8px] font-mono px-2 py-0.5 rounded-lg border transition-all ${
              showPayoff
                ? "border-[#f5c542]/40 bg-[#f5c542]/10 text-[#f5c542]"
                : "border-white/[0.06] text-[var(--ox-text-muted)]"
            }`}
            title="Toggle payoff overlay"
          >
            <TrendingUp size={9} />
            P&amp;L
          </button>

          <div className="flex items-center gap-0.5 rounded-md border border-white/[0.06] bg-black/30 p-0.5">
            <button onClick={resetCamera} className="p-1 rounded text-[var(--ox-text-muted)] hover:text-[var(--ox-accent-cyan)] transition-colors" title="Reset Camera"><RotateCcw size={11} /></button>
            <button onClick={() => setIsExpanded(e => !e)} className="p-1 rounded text-[var(--ox-text-muted)] hover:text-[var(--ox-accent-cyan)] transition-colors" title="Toggle height"><Maximize2 size={11} /></button>
          </div>

          <div className="text-right">
            <p className="text-[8px] font-mono text-[var(--ox-text-muted)] uppercase">ATM IV</p>
            <p className="text-[11px] font-mono font-bold text-[var(--ox-accent-cyan)]">{(portfolioGreeks.avgIV || 0).toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* WebGL mount + projected label overlay */}
      <div className="flex-1 relative overflow-hidden">
        <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

        {/* Projected axis labels — updated per-frame via direct DOM in RAF loop */}
        <div ref={labelsContainerRef} className="absolute inset-0 pointer-events-none select-none">
          {/* Strike labels */}
          <div ref={labelStrikeLeft}  className="absolute -translate-x-1/2 -translate-y-1/2 text-[7px] font-mono text-[var(--ox-accent-cyan)]/70 whitespace-nowrap bg-black/40 px-1 rounded">25% OTM Put</div>
          <div ref={labelStrikeRight} className="absolute -translate-x-1/2 -translate-y-1/2 text-[7px] font-mono text-[var(--ox-accent-cyan)]/70 whitespace-nowrap bg-black/40 px-1 rounded">25% OTM Call</div>
          <div ref={labelATM}         className="absolute -translate-x-1/2 -translate-y-1/2 text-[7px] font-mono text-white/50 whitespace-nowrap bg-black/40 px-1 rounded">ATM</div>
          {/* DTE labels */}
          <div ref={labelDTENear}     className="absolute -translate-x-1/2 -translate-y-1/2 text-[7px] font-mono text-[var(--ox-accent-green)]/70 whitespace-nowrap bg-black/40 px-1 rounded">7d</div>
          <div ref={labelDTEFar}      className="absolute -translate-x-1/2 -translate-y-1/2 text-[7px] font-mono text-[var(--ox-accent-green)]/70 whitespace-nowrap bg-black/40 px-1 rounded">180d</div>
          {/* IV labels */}
          <div ref={labelIVLow}       className="absolute -translate-x-1/2 -translate-y-1/2 text-[7px] font-mono text-[var(--ox-accent-amber)]/70 whitespace-nowrap bg-black/40 px-1 rounded">Low IV</div>
          <div ref={labelIVHigh}      className="absolute -translate-x-1/2 -translate-y-1/2 text-[7px] font-mono text-[var(--ox-accent-amber)]/70 whitespace-nowrap bg-black/40 px-1 rounded">High IV</div>
        </div>

        {/* Scanline loading effect when Web Worker is calculating */}
        {isCalculating && (
          <div className="absolute inset-0 z-10 pointer-events-none rounded-xl overflow-hidden mix-blend-screen opacity-40">
            <motion.div 
              className="absolute w-full h-[20%] bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent"
              initial={{ top: "-20%" }}
              animate={{ top: "120%" }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            />
            <div className="absolute top-4 right-4 text-[10px] font-mono text-cyan-400 bg-black/40 px-2 py-1 rounded border border-cyan-500/20 shadow-[0_0_10px_rgba(0,212,255,0.3)] animate-pulse">
              WORKER: SOLVING GRID...
            </div>
          </div>
        )}

        {/* Drag hint */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="text-[8px] font-mono text-[var(--ox-text-muted)] opacity-25">drag · rotate · scroll to zoom</span>
        </div>

        {/* Telemetry Overlay */}
        <SurfaceTelemetry grid={gridRef.current} />
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-3 left-4 flex items-center gap-2 pointer-events-none z-10">
        <span className="text-[7px] font-mono text-[var(--ox-accent-cyan)]/60">Low IV</span>
        <div className="h-1.5 w-20 rounded-full opacity-70" style={{ background: "linear-gradient(90deg, #00d4ff, #f5a623, #ff4d6a)" }} />
        <span className="text-[7px] font-mono text-[var(--ox-accent-red)]/60">High IV</span>
        {showPayoff && <span className="ml-3 flex items-center gap-1 text-[7px] font-mono text-[#f5c542]/60"><span className="h-px w-5 bg-[#f5c542]/50 inline-block" /> Portfolio P&amp;L</span>}
      </div>

      {/* Ambient overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(0,212,255,0.035) 0%, transparent 70%)" }} />
    </motion.div>
  );
}
