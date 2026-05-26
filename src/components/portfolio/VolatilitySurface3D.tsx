// ============================================================================
// OPTIXFLOW — Interactive 3D Volatility Skew Surface (Three.js / WebGL)
// Strike (X) × DTE (Y) × Implied Volatility (Z) — live ticking mesh.
// ============================================================================

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { usePortfolio } from "./PortfolioContext";
import { generateIVSurface, updateIVSurface, type IVSurfaceGrid } from "@/lib/portfolio/surface/ivSurface";
import { motion } from "framer-motion";
import { Layers, RotateCcw, Maximize2, Info } from "lucide-react";

const N_STRIKES = 24;
const N_DTES = 16;

// Color map: low IV → cyan, mid → amber, high → red (institutional heat map)
function ivToColor(iv: number, minIV: number, maxIV: number): THREE.Color {
  const t = Math.max(0, Math.min(1, (iv - minIV) / (maxIV - minIV || 1)));
  if (t < 0.5) {
    // cyan → amber
    const s = t * 2;
    return new THREE.Color(
      0 + s * 0.96,
      0.83 - s * 0.18,
      1.0 - s * 0.86,
    );
  } else {
    // amber → red
    const s = (t - 0.5) * 2;
    return new THREE.Color(
      0.96 + s * 0.04,
      0.65 - s * 0.65,
      0.14 - s * 0.14,
    );
  }
}

export default function VolatilitySurface3D() {
  const { portfolioGreeks, isTicking } = usePortfolio();
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const frameRef = useRef<number>(0);
  const gridRef = useRef<IVSurfaceGrid | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [tooltipIV, setTooltipIV] = useState<string | null>(null);

  const buildGeometry = useCallback((grid: IVSurfaceGrid) => {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const scaleX = 10;
    const scaleY = 10;
    const scaleZ = 8;

    // Build vertex + color buffers
    for (let xi = 0; xi < N_STRIKES; xi++) {
      for (let yi = 0; yi < N_DTES; yi++) {
        const p = grid.points[xi * N_DTES + yi];
        const x = (xi / (N_STRIKES - 1) - 0.5) * scaleX;
        const y = (yi / (N_DTES - 1) - 0.5) * scaleY;
        const z = ((p.iv - grid.minIV) / (grid.maxIV - grid.minIV || 1)) * scaleZ;
        vertices.push(x, y, z);
        const col = ivToColor(p.iv, grid.minIV, grid.maxIV);
        colors.push(col.r, col.g, col.b);
      }
    }

    // Build triangle indices
    for (let xi = 0; xi < N_STRIKES - 1; xi++) {
      for (let yi = 0; yi < N_DTES - 1; yi++) {
        const a = xi * N_DTES + yi;
        const b = a + 1;
        const c = (xi + 1) * N_DTES + yi;
        const d = c + 1;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }, []);

  const updateGeometry = useCallback((grid: IVSurfaceGrid) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const scaleZ = 8;
    const posAttr = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    const colAttr = mesh.geometry.getAttribute("color") as THREE.BufferAttribute;

    for (let xi = 0; xi < N_STRIKES; xi++) {
      for (let yi = 0; yi < N_DTES; yi++) {
        const idx = xi * N_DTES + yi;
        const p = grid.points[idx];
        const z = ((p.iv - grid.minIV) / (grid.maxIV - grid.minIV || 1)) * scaleZ;
        posAttr.setZ(idx, z);
        const col = ivToColor(p.iv, grid.minIV, grid.maxIV);
        colAttr.setXYZ(idx, col.r, col.g, col.b);
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);
    camera.position.set(8, -14, 10);
    camera.up.set(0, 0, 1);
    cameraRef.current = camera;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 5;
    controls.maxDistance = 40;
    controls.target.set(0, 0, 2);
    controls.update();
    controlsRef.current = controls;

    // Ambient + directional lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dir = new THREE.DirectionalLight(0x00d4ff, 1.2);
    dir.position.set(10, -10, 15);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0xff4d6a, 0.6);
    dir2.position.set(-10, 10, 5);
    scene.add(dir2);

    // Grid helper (XY plane floor)
    const gridHelper = new THREE.GridHelper(12, 12, 0x1a2235, 0x0d1520);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.z = -0.05;
    scene.add(gridHelper);

    // Axis labels (wireframe guides)
    const axesMat = new THREE.LineBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.6 });

    // X axis (Strike)
    const xGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-5.5, -5, 0), new THREE.Vector3(5.5, -5, 0),
    ]);
    scene.add(new THREE.Line(xGeo, axesMat));

    // Y axis (DTE)
    const yGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-5, -5.5, 0), new THREE.Vector3(-5, 5.5, 0),
    ]);
    scene.add(new THREE.Line(yGeo, axesMat));

    // Build initial surface
    const avgIV = portfolioGreeks.avgIV / 100;
    const grid = generateIVSurface(avgIV, N_STRIKES, N_DTES);
    gridRef.current = grid;

    const geometry = buildGeometry(grid);
    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      shininess: 60,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    // Wireframe overlay
    const wireMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const wire = new THREE.Mesh(geometry.clone(), wireMat);
    mesh.add(wire);

    // Render loop
    let alive = true;
    const animate = () => {
      if (!alive) return;
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
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
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update surface on IV tick
  useEffect(() => {
    if (!gridRef.current) return;
    const avgIV = portfolioGreeks.avgIV / 100;
    const updated = updateIVSurface(gridRef.current, avgIV);
    gridRef.current = updated;
    updateGeometry(updated);
  }, [portfolioGreeks.avgIV, updateGeometry]);

  const resetCamera = () => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    camera.position.set(8, -14, 10);
    controls.target.set(0, 0, 2);
    controls.update();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`glass rounded-2xl border border-[var(--ox-border-default)] overflow-hidden relative flex flex-col transition-all duration-500 ${
        isExpanded ? "h-[520px]" : "h-[360px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-[var(--ox-accent-cyan)]" style={{ filter: "drop-shadow(0 0 6px rgba(0,212,255,0.6))" }} />
          <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--ox-text-primary)]">
            3D Volatility Skew Surface
          </span>
          <span className="text-[9px] font-mono text-[var(--ox-text-muted)] opacity-60">
            // Strike × DTE × IV
          </span>
          {isTicking && (
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ox-accent-green)] animate-pulse ml-1" />
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Axis legend */}
          <div className="hidden md:flex items-center gap-3 text-[9px] font-mono text-[var(--ox-text-muted)]">
            <span className="flex items-center gap-1">
              <span className="h-px w-4 bg-[var(--ox-accent-cyan)] inline-block opacity-70" /> Strike
            </span>
            <span className="flex items-center gap-1">
              <span className="h-px w-4 bg-[var(--ox-accent-green)] inline-block opacity-70" /> DTE
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm inline-block" style={{ background: "linear-gradient(90deg, #00d4ff, #ff4d6a)" }} /> IV
            </span>
          </div>

          <div
            className="flex items-center gap-0.5 rounded-md border border-white/[0.06] bg-black/30 p-0.5"
          >
            <button
              onClick={resetCamera}
              className="p-1 rounded text-[var(--ox-text-muted)] hover:text-[var(--ox-accent-cyan)] transition-colors"
              title="Reset Camera"
            >
              <RotateCcw size={11} />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded text-[var(--ox-text-muted)] hover:text-[var(--ox-accent-cyan)] transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              <Maximize2 size={11} />
            </button>
          </div>

          {/* ATM IV readout */}
          <div className="text-right">
            <p className="text-[8px] font-mono text-[var(--ox-text-muted)] uppercase">ATM IV</p>
            <p className="text-[11px] font-mono font-bold text-[var(--ox-accent-cyan)]">
              {portfolioGreeks.avgIV.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* WebGL Canvas Container */}
      <div ref={mountRef} className="flex-1 w-full cursor-grab active:cursor-grabbing" />

      {/* Gradient IV color scale bar */}
      <div className="absolute bottom-3 left-4 flex items-center gap-2 pointer-events-none">
        <span className="text-[8px] font-mono text-[var(--ox-accent-cyan)] opacity-70">Low IV</span>
        <div
          className="h-2 w-24 rounded-full opacity-70"
          style={{ background: "linear-gradient(90deg, #00d4ff, #f5a623, #ff4d6a)" }}
        />
        <span className="text-[8px] font-mono text-[var(--ox-accent-red)] opacity-70">High IV</span>
      </div>

      {/* Drag hint */}
      <div className="absolute top-14 left-1/2 -translate-x-1/2 pointer-events-none">
        <span className="text-[9px] font-mono text-[var(--ox-text-muted)] opacity-30">
          drag to rotate · scroll to zoom
        </span>
      </div>

      {/* Ambient glow overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(0,212,255,0.04) 0%, transparent 70%)",
        }}
      />
    </motion.div>
  );
}
