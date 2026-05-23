# OptixFlow: Core Intelligence & Session State

This document serves as the long-term memory, architectural intelligence layer, and design philosophy manual for **OptixFlow**. Its purpose is to preserve the product vision, enforce design consistency, and track core engineering decisions across development sessions to prevent architectural drift.

---

## 1. Project Vision

OptixFlow is not a conventional options visualizer, nor is it a traditional brokerage dashboard. It is a modern, interactive options intelligence platform designed to seamlessly fuse quantitative finance with premium frontend engineering. By treating financial derivatives as dynamic spatial relationships rather than static math equations, OptixFlow seeks to make complex quantitative structures intuitive, explorable, and emotionally engaging.

## 2. Core Product Identity

The identity of OptixFlow is rooted in **cinematic financial intelligence**. 
- **Immersive Learning:** Transitioning education from passive reading to active, spatial exploration.
- **Spatial Interaction Systems:** Using node networks and immersive environments to map market concepts.
- **Visual Intuition:** Prioritizing geometric, color-coded, and fluid representations of Greek exposures, volatility skew, and payoff structures.
- **Educational Technology Positioning:** Operating at the intersection of professional-grade risk tools (e.g., Bloomberg, TradingView) and high-end creative software.

## 3. Design Philosophy

OptixFlow is built on strict aesthetic and emotional guidelines to ensure a premium, "quant-terminal" feel.

### Emotional Goals
The product should evoke a sense of deep intelligence, calm control, and professional mastery. The user should feel like they are operating a highly tuned, futuristic risk engine.

### What the Product SHOULD Feel Like:
- Cinematic and atmospheric.
- Visually dense but structurally elegant.
- Fluid, alive, and instantly reactive to input.

### What the Product Should NEVER Become:
- A generic admin-dashboard (no standard white cards, excessive borders, or unstyled tables).
- A chaotic, game-like interface (no hyperactive animations or erratic camera movements).
- A static PDF-like educational tool.

### Visual Hierarchy Rules
- Deep dark backgrounds (pure blacks and subtle slate/navy undertones).
- Strategic use of "glassmorphism" (heavy blurs, low opacity fills, subtle glowing borders).
- Data must be front-and-center, using modern typography (inter/mono-spaced numbers).

## 4. Motion & Interaction Rules

Motion in OptixFlow must be intentional, physically grounded, and hierarchical.

- **Hover Behavior:** Interactions must feel frictionless. Elements should respond instantaneously using smooth spring physics.
- **Node Activation Hierarchy:**
  - *Inactive:* `60%` opacity, standard scale. Ambient and resting.
  - *Dimmed:* `15%` opacity, `0.9x` scale. Fades into the background to allow focus elsewhere.
  - *Connected (Neighbor):* `90%` opacity, `1.1x` scale, subtle thematic glow. Visibly related.
  - *Hovered/Selected:* `100%` opacity, `1.3x - 1.4x` scale. Dominant, vivid, featuring a pure white core and intense double-layered box-shadow.
- **Glow Intensity Philosophy:** Glows (`text-shadow`, `box-shadow`, `SVG filters`) are reserved strictly for active or connected states. They signal energy and focus, not passive decoration.
- **Camera/Parallax Principles:** The camera must utilize a soft nonlinear falloff (e.g., sine-wave interpolation) to prevent edge discontinuities. Camera motion must be heavily damped (`damping: 100`, `stiffness: 30`) to feel subconsciously atmospheric rather than directly tracking the cursor.

## 5. Architecture Decisions

### 1. Foreground Stability & Background Parallax
- **Decision:** Remove `useTransform` focal logic (`focusX`, `focusY`) from the foreground constellation layer.
- **Reasoning:** Moving interactive DOM elements (nodes) based on mouse hover state causes them to physically shift away from the cursor. This created an infinite `mouseEnter`/`mouseLeave` jitter loop near the viewport edges.
- **Implementation:** Parallax is now strictly mapped to `smoothMouseX/Y` using a very small max drift limit (`10px`). Depth is achieved primarily by moving the *background* particle canvas behind a mathematically static foreground network.

### 2. Centralized Graph Relationship State
- **Decision:** State propagation is determined at the highest parent level (`ConstellationCanvas`) rather than isolated within individual nodes.
- **Reasoning:** Computing neighbor pathways globally allows the canvas to instantly broadcast `isNeighbor` and `isDimmed` flags downstream, enabling seamless SVG connection glowing and unrelated node dimming.

### 3. Window-Level Mouse Tracking
- **Decision:** Bind camera physics `mousemove` listeners to the global `window` object inside a `useEffect` instead of a React `div` boundary.
- **Reasoning:** Relying on DOM container boundaries triggers premature `mouseLeave` resets when touching padding/margins, resulting in aggressive spring-back snaps.

## 6. Current Systems

Currently implemented modules:
- **Landing Page:** Interactive public page (`/`) with a custom particle canvas, HTML-rendered options payoff graph visualizers, and institutional feature matrices.
- **Trade Intelligence Cockpit:** High-level cockpit (`/intelligence`) with spring-damped segment selectors, an analytical structural fit scoring engine ranking 8 strategies, and a Scenario Reality Simulator with play/pause timeline steps (exactly 1 DTE per tick) and morphing Recharts payoff curves.
- **Strategy Lab Sandbox:** Interactive option leg simulator (re-routed to `/strategy`) with dynamic Greek exposure distributions, scorecards, and ticker selection.
- **Analytics Lab:** Volatility diagnostics panel, 3D implied volatility skew surfaces, and suitability geometries table.
- **Portfolio Intelligence:** Capital allocation metrics, positions table, aggregate Greek calculation, and global volatility/price shock simulator.
- **Constellation Universe:** The signature spatial playbook node network (`/playbook`) with ambient canvas physics, glowing connection path vectors, and preview cards.

## 7. Active Problems

- **Supabase Integration:** The application currently relies entirely on mocked React state and static data arrays. A true backend data layer must be wired up for auth, saved portfolios, and custom strategies.
- **Live Data Feeds:** Payoff engines require real-time options chain data (implied volatility surfaces, bid/ask spreads) rather than deterministic mathematical mocks.
- **Mobile Responsiveness:** Complex canvas layers and absolute-positioned Constellation nodes require optimization and touch-based gesture support for mobile devices.

## 8. Future Vision

Ambitious features to build out the OptixFlow ecosystem:
- **Volatility Simulations:** Real-time 3D volatility surface mapping.
- **Probability Cones:** Visualizing statistical price distributions over time alongside strategy payoffs.
- **Portfolio Intelligence:** AI-driven strategy recommendations based on a user's current directional and volatility exposure.
- **Scenario Engine:** "What-If" sliders that globally shift implied volatility and days-to-expiration across the entire Portfolio to stress-test positions.

## 9. Session Logs

### Session: May 23, 2026 - Trade Intelligence Engine & Vercel Production Hardening
- **Achievements:** Developed the Trade Intelligence Cockpit (`/intelligence`) featuring custom sliders, morphing Recharts payoff curves with standard deviation overlays, a filterable monospace telemetry console, and a suitability scoring grid.
- **Production Hardening:** Relocated Strategy Lab to `/strategy` and converted route pages into Server Components. Added SEO metadata, favicon configurations, global loading skeletons (`loading.tsx`), and error boundaries (`error.tsx`).
- **Deployments:** Configured credentials and successfully deployed OptixFlow to production on Vercel at `https://optixflow-silk.vercel.app`. Committed and synchronized the codebase to GitHub at `ssashiiiuhh/OptixFlow`.
- **Lessons:** Separating route-level wrappers from client interaction elements optimizes pre-rendering and permits static Next.js metadata compilation. Checking client mounting state inside hooks completely eliminates SSR hydration warnings.

## 10. AI Collaboration Notes

- **Workflow Successes:** Tackling discrete, highly focused interaction states (e.g., "Refine hover hierarchy", "Fix edge jitter") yields far better results than asking for massive architectural overhauls in a single prompt.
- **Architectural Guardrails:** Always remind the AI to prioritize "cinematic finance" and "quant-terminal" aesthetics. Explicitly forbid generic admin-dashboard styles to maintain the premium dark-mode aesthetic.
- **Iteration Lessons:** When debugging motion loops, analyze the physical event listeners (`onMouseEnter/Leave`) and spatial bounding boxes first before tearing apart the mathematical physics formulas.
