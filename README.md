# OptixFlow — Probabilistic Market Intelligence & Derivatives Cognition Platform

OptixFlow is an institutional-grade derivatives intelligence and market cognition system. Designed as a cinematic, spacecraft-like operating terminal, the platform maps complex quantitative options structures to dynamic spatial relationships and probability boundaries.

Instead of operating as a simple options calculator, OptixFlow functions as a reality-aware decision support environment that helps quants, portfolio managers, and sophisticated traders analyze risk boundaries, volatility skew surfaces, time decay curves, and multi-leg strategies under dynamic volatility regimes.

---

## ── System Philosophy ──────────────────────────────────────

Modern derivatives trading is often obscured by static equations and disjointed spreadsheets. OptixFlow is built on the philosophy of **cinematic financial intelligence**:
1. **Derivatives as Geometries:** Visualizing options legs not as tables of numbers, but as morphing payoff shapes, probability bands, and spatial Greek coordinates.
2. **Reality-Aware Diagnostics:** Integrating live ticking underlying asset parameters directly into strategy models, calculating suitability scores based on market regime changes (VIX movements, skew shifts, volatility shocks).
3. **Cockpit decision support:** Helping quants construct a custom market outlook (direction, dispersion magnitude, horizon, IV shifts, risk limits) and evaluating mathematical structural compatibility rather than offering speculative stock recommendations.

---

## ── Product Architecture & Modules ─────────────────────────

OptixFlow is compartmentalized into five core subsystems:

### 1. Trade Intelligence Cockpit (`/intelligence`)
The high-level quant evaluation dashboard:
*   **Thesis Constructor:** A cockpit panel with radial SVG HUD components and spring-damped segment selectors allowing users to configure Directional Vectors, Move Magnitude, Expiry Horizon, IV Shift, and Risk Appetite.
*   **Structural Fit Engine:** Recursively scores and ranks 8 core derivatives strategies (Spreads, Condors, Straddles, etc.) in real-time, highlighting the optimal fit in a dominant glowing card.
*   **Scenario Reality Simulator:** Dynamic sliders (Spot, IV, DTE) and playback buttons that morph the payoff curves with exact 1-day step increments, complete with probability of profit (POP) indicators and standard-deviation volatility overlay bands.
*   **Telemetry Console:** A filterable monospace terminal logging real-time mathematical observations.

### 2. Strategy Lab Sandbox (`/strategy`)
An interactive options design laboratory:
*   Simulate multi-leg option profiles and custom strikes.
*   Monitor real-time Greek exposure distributions (Delta, Gamma, Theta, Vega).
*   Toggle asset references (SPY, AAPL, NVDA, TSLA, IWM) to see how synthetic positions score against active market environments.

### 3. Analytics Lab (`/analytics`)
Professional market diagnostics:
*   **Volatility Surface:** Interactive 3D visualization of implied volatility smiles across different strikes and expirations.
*   **Probability Cones:** Visualizing statistical standard deviation ranges over temporal horizons.
*   **Geometries Table:** Tracking the top resilient vs. vulnerable options setups under current market volatility profiles.

### 4. Portfolio Intelligence (`/portfolio`)
Aggregate risk management:
*   Consolidated dashboard tracking capital deployment, net P&L, and total portfolio Theta decay.
*   Stress-testing simulation: Analyze how the entire portfolio's net Greeks shift under customized volatility shocks or price changes.

### 5. Playbook Constellation (`/playbook`)
Immersive educational universe:
*   A spatial node network mapping strategies in a galaxy-like constellation with animated SVG link lines and parallax camera motion.
*   Glows, pulses, and dims nodes based on their suitability scores in response to the active market tick.

---

## ── Technology Stack ────────────────────────────────────────

*   **Framework:** Next.js (App Router, optimized client/server boundaries, route-level loading skeletons, and runtime error boundary fallbacks).
*   **Styling & UI:** Vanilla Tailwind CSS with custom glassmorphism utilities, radial atmospheric glows, and responsive grid layouts.
*   **Animations:** Framer Motion (spring-based physics, layout animations, and enter/exit route transitions).
*   **Data Visualization:** Recharts (Area, Line, CartesianGrid, and ReferenceLine elements customized with custom SVG glow filters and gradient fills).
*   **Simulation Engine:** Custom high-fidelity Black-Scholes option pricing formulas and analytical Greek calculators (`bsmPrice`, `bsmGreeks`, `computeStrategyGreeks`).
*   **Atmospheric Background:** HTML5 Canvas particle/magnetic field simulations rendering floating nodes that dynamically compress or accelerate based on DTE and IV values.

---

## ── Performance & Production Hardening ─────────────────────

1.  **Hydration Mismatch Mitigation:** Integrated client-side mounting guards (`mounted` states) in time-dependent UI components to prevent pre-render discrepancies.
2.  **GPU-Optimized Canvas Loops:** Built the particle canvases using non-blocking `requestAnimationFrame` loops, automated window resize handlers, and responsive pixel densities.
3.  **Reduced Motion Support:** Clean separation of animation physics to support systems requesting reduced motion triggers.
4.  **Static Prerendering:** Configured Next.js layout structures so static chrome elements are cached, keeping page transition times under 100ms.

---

## ── Running Locally ────────────────────────────────────────

Clone the repository and install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Start the production server:
```bash
npm run start
```
