// ============================================================================
// OPTIXFLOW — Historical Market Playback Scenarios
// Pre-recorded price/IV paths for 4 real-world market events.
// Each scenario has ~40 timesteps of {spotPrices, ivs, label, vix}.
// ============================================================================

export interface PlaybackFrame {
  label: string;    // e.g. "Day 3", "Hour 12", "T+08:30"
  vix: number;
  spotPrices: Record<string, number>;
  ivs: Record<string, number>;
  annotation?: string;  // Key event description for this frame
}

export interface HistoricalScenario {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  color: string;
  glowColor: string;
  icon: string;
  regime: "crash" | "vol_spike" | "earnings" | "rate_shock";
  frames: PlaybackFrame[];
}

// ─── Utility: interpolate between two scalar values ───────────────────────
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// ─── Utility: build a smooth price path with defined waypoints ────────────
function buildPricePath(
  ticker: string,
  waypoints: { t: number; price: number; iv: number }[],
  nFrames: number,
): { prices: number[]; ivs: number[] } {
  const prices: number[] = [];
  const ivValues: number[] = [];

  for (let i = 0; i < nFrames; i++) {
    const t = i / (nFrames - 1);
    // Find surrounding waypoints
    let lo = waypoints[0], hi = waypoints[waypoints.length - 1];
    for (let j = 0; j < waypoints.length - 1; j++) {
      if (t >= waypoints[j].t && t <= waypoints[j + 1].t) {
        lo = waypoints[j];
        hi = waypoints[j + 1];
        break;
      }
    }
    const seg = hi.t - lo.t || 1;
    const s = (t - lo.t) / seg;
    // Ease in-out for smooth motion
    const ease = s * s * (3 - 2 * s);
    prices.push(Math.round(lerp(lo.price, hi.price, ease) * 100) / 100);
    ivValues.push(Math.round(lerp(lo.iv, hi.iv, ease) * 1000) / 1000);
  }

  return { prices, ivs: ivValues };
}

// ─── SCENARIO 1: August 5, 2024 — VIX Spike (Japan carry trade unwind) ───

function buildAug2024(): HistoricalScenario {
  const n = 40;
  const spy = buildPricePath("SPY", [
    { t: 0,    price: 551, iv: 0.14 },
    { t: 0.08, price: 548, iv: 0.18 },
    { t: 0.18, price: 535, iv: 0.32 },
    { t: 0.30, price: 510, iv: 0.55 }, // Circuit breaker zone
    { t: 0.40, price: 505, iv: 0.65 }, // VIX 65 peak
    { t: 0.55, price: 520, iv: 0.45 },
    { t: 0.70, price: 533, iv: 0.28 },
    { t: 0.85, price: 542, iv: 0.20 },
    { t: 1.00, price: 548, iv: 0.16 },
  ], n);
  const aapl = buildPricePath("AAPL", [
    { t: 0,    price: 220, iv: 0.22 },
    { t: 0.30, price: 198, iv: 0.52 },
    { t: 0.40, price: 192, iv: 0.62 },
    { t: 0.70, price: 208, iv: 0.32 },
    { t: 1.00, price: 216, iv: 0.24 },
  ], n);
  const nvda = buildPricePath("NVDA", [
    { t: 0,    price: 124, iv: 0.42 },
    { t: 0.30, price: 100, iv: 0.72 },
    { t: 0.40, price: 96,  iv: 0.85 },
    { t: 0.70, price: 112, iv: 0.52 },
    { t: 1.00, price: 120, iv: 0.44 },
  ], n);
  const qqq = buildPricePath("QQQ", [
    { t: 0,    price: 475, iv: 0.18 },
    { t: 0.30, price: 432, iv: 0.58 },
    { t: 0.40, price: 425, iv: 0.68 },
    { t: 0.70, price: 452, iv: 0.38 },
    { t: 1.00, price: 468, iv: 0.22 },
  ], n);
  const vixPath = buildPricePath("VIX", [
    { t: 0,    price: 14, iv: 0 },
    { t: 0.18, price: 28, iv: 0 },
    { t: 0.40, price: 65, iv: 0 }, // Historic VIX 65 peak
    { t: 0.55, price: 38, iv: 0 },
    { t: 0.70, price: 22, iv: 0 },
    { t: 1.00, price: 16, iv: 0 },
  ], n);

  const annotations: Record<number, string> = {
    0: "Normal market conditions. Carry trade at peak.",
    4: "Japan BoJ rate hike signal — yen strengthening.",
    8: "Global carry trade unwind begins.",
    12: "SPY drops -5%. VIX breaks 30.",
    16: "Circuit breaker risk. NVDA -20% in 3 sessions.",
    20: "VIX peaks at 65. Worst since COVID.",
    24: "Fed emergency rhetoric cools panic.",
    28: "Systematic bid returns. Vol term structure normalizes.",
    36: "Full recovery trajectory. IV crush accelerates.",
  };

  const frames: PlaybackFrame[] = Array.from({ length: n }, (_, i) => ({
    label: `Day ${i + 1}`,
    vix: vixPath.prices[i],
    spotPrices: {
      SPY: spy.prices[i],
      AAPL: aapl.prices[i],
      NVDA: nvda.prices[i],
      QQQ: qqq.prices[i],
    },
    ivs: {
      SPY: spy.ivs[i],
      AAPL: aapl.ivs[i],
      NVDA: nvda.ivs[i],
      QQQ: qqq.ivs[i],
    },
    annotation: annotations[i],
  }));

  return {
    id: "aug2024",
    name: "Aug 2024 VIX Spike",
    subtitle: "Japan Carry Trade Unwind",
    description: "Yen carry unwind triggers historic VIX 65 spike. Equity markets see worst single-day drawdown since COVID with SPY -8.5% intraday.",
    color: "#ff4d6a",
    glowColor: "rgba(255,77,106,0.25)",
    icon: "⚡",
    regime: "vol_spike",
    frames,
  };
}

// ─── SCENARIO 2: March 2020 — COVID Crash ─────────────────────────────────

function buildCOVID2020(): HistoricalScenario {
  const n = 40;
  const spy = buildPricePath("SPY", [
    { t: 0,    price: 335, iv: 0.14 },
    { t: 0.10, price: 320, iv: 0.22 },
    { t: 0.25, price: 290, iv: 0.42 },
    { t: 0.38, price: 252, iv: 0.78 }, // Peak COVID fear
    { t: 0.45, price: 240, iv: 0.85 },
    { t: 0.58, price: 260, iv: 0.62 },
    { t: 0.75, price: 285, iv: 0.40 },
    { t: 0.90, price: 305, iv: 0.28 },
    { t: 1.00, price: 318, iv: 0.22 },
  ], n);
  const aapl = buildPricePath("AAPL", [
    { t: 0,    price: 80,  iv: 0.22 },
    { t: 0.38, price: 56,  iv: 0.80 },
    { t: 0.45, price: 52,  iv: 0.90 },
    { t: 0.75, price: 68,  iv: 0.45 },
    { t: 1.00, price: 75,  iv: 0.28 },
  ], n);
  const nvda = buildPricePath("NVDA", [
    { t: 0,    price: 62,  iv: 0.38 },
    { t: 0.38, price: 40,  iv: 0.88 },
    { t: 0.45, price: 36,  iv: 0.98 },
    { t: 0.75, price: 52,  iv: 0.52 },
    { t: 1.00, price: 58,  iv: 0.40 },
  ], n);
  const qqq = buildPricePath("QQQ", [
    { t: 0,    price: 228, iv: 0.18 },
    { t: 0.38, price: 168, iv: 0.80 },
    { t: 0.45, price: 158, iv: 0.90 },
    { t: 0.75, price: 195, iv: 0.42 },
    { t: 1.00, price: 215, iv: 0.24 },
  ], n);
  const vixPath = buildPricePath("VIX", [
    { t: 0,    price: 13, iv: 0 },
    { t: 0.25, price: 38, iv: 0 },
    { t: 0.45, price: 82, iv: 0 }, // VIX 82 — all-time high
    { t: 0.65, price: 45, iv: 0 },
    { t: 0.85, price: 28, iv: 0 },
    { t: 1.00, price: 22, iv: 0 },
  ], n);

  const annotations: Record<number, string> = {
    0: "Jan 2020: Markets at all-time highs.",
    4: "First COVID cases outside China reported.",
    10: "WHO declares pandemic concern.",
    15: "Market circuit breakers triggered multiple times.",
    18: "VIX crosses 80. Fed emergency rate cut to 0.",
    24: "CARES Act stimulus passed. Systematic bid returns.",
    32: "Recovery rally. Tech outperforms.",
    39: "V-shaped recovery in progress.",
  };

  const frames: PlaybackFrame[] = Array.from({ length: n }, (_, i) => ({
    label: `Day ${i + 1}`,
    vix: vixPath.prices[i],
    spotPrices: { SPY: spy.prices[i], AAPL: aapl.prices[i], NVDA: nvda.prices[i], QQQ: qqq.prices[i] },
    ivs: { SPY: spy.ivs[i], AAPL: aapl.ivs[i], NVDA: nvda.ivs[i], QQQ: qqq.ivs[i] },
    annotation: annotations[i],
  }));

  return {
    id: "covid2020",
    name: "COVID Crash 2020",
    subtitle: "Pandemic Market Collapse",
    description: "Global equity markets collapse -35% in 33 days. VIX reaches all-time high of 82. Fed slashes rates to zero and launches unlimited QE.",
    color: "#a855f7",
    glowColor: "rgba(168,85,247,0.25)",
    icon: "💥",
    regime: "crash",
    frames,
  };
}

// ─── SCENARIO 3: Nov 2023 — NVDA Earnings IV Crush ────────────────────────

function buildNVDAEarnings(): HistoricalScenario {
  const n = 40;
  const spy = buildPricePath("SPY", [
    { t: 0,    price: 448, iv: 0.14 },
    { t: 0.45, price: 450, iv: 0.15 }, // Flat pre-earnings
    { t: 0.55, price: 455, iv: 0.12 }, // Post-earnings relief
    { t: 1.00, price: 458, iv: 0.13 },
  ], n);
  const aapl = buildPricePath("AAPL", [
    { t: 0,    price: 188, iv: 0.22 },
    { t: 0.45, price: 189, iv: 0.23 },
    { t: 0.55, price: 191, iv: 0.20 },
    { t: 1.00, price: 192, iv: 0.21 },
  ], n);
  const nvda = buildPricePath("NVDA", [
    { t: 0,    price: 46,  iv: 0.52 },
    { t: 0.30, price: 48,  iv: 0.62 }, // IV expansion into earnings
    { t: 0.44, price: 49,  iv: 0.72 }, // Peak IV pre-announcement
    { t: 0.52, price: 51,  iv: 0.35 }, // EARNINGS: Beat. IV CRUSH -50%
    { t: 0.60, price: 53,  iv: 0.28 },
    { t: 0.80, price: 55,  iv: 0.38 },
    { t: 1.00, price: 54,  iv: 0.40 },
  ], n);
  const qqq = buildPricePath("QQQ", [
    { t: 0,    price: 378, iv: 0.18 },
    { t: 0.44, price: 380, iv: 0.20 },
    { t: 0.52, price: 386, iv: 0.15 },
    { t: 1.00, price: 390, iv: 0.16 },
  ], n);
  const vixPath = buildPricePath("VIX", [
    { t: 0,    price: 15, iv: 0 },
    { t: 0.44, price: 16, iv: 0 },
    { t: 0.52, price: 13, iv: 0 }, // Vol crush post-earnings
    { t: 1.00, price: 13, iv: 0 },
  ], n);

  const annotations: Record<number, string> = {
    0: "Pre-earnings runway. NVDA IV slowly expanding.",
    12: "Buy-side IV premium builds. Options expensive.",
    18: "T-5 days to NVDA earnings. IV reaches 72%.",
    20: "NVDA earnings: Data center revenue +206% YoY.",
    21: "IV CRUSH: NVDA IV collapses from 72% → 28% overnight.",
    25: "Straddle buyers demolished. Long-vol positions crushed.",
    32: "Short-vol positions profit. Portfolio theta income realized.",
    39: "Volatility normalized. NVDA maintains post-earnings gains.",
  };

  const frames: PlaybackFrame[] = Array.from({ length: n }, (_, i) => ({
    label: `T${i < 20 ? `-${20 - i}` : `+${i - 20}`}`,
    vix: vixPath.prices[i],
    spotPrices: { SPY: spy.prices[i], AAPL: aapl.prices[i], NVDA: nvda.prices[i], QQQ: qqq.prices[i] },
    ivs: { SPY: spy.ivs[i], AAPL: aapl.ivs[i], NVDA: nvda.ivs[i], QQQ: qqq.ivs[i] },
    annotation: annotations[i],
  }));

  return {
    id: "nvdaEarnings2023",
    name: "NVDA Earnings 2023",
    subtitle: "IV Crush — AI Mania",
    description: "NVIDIA Q3 2023 earnings beat consensus by 19%. Options IV collapses 50%+ overnight, destroying long-vol positions while short-vol profits.",
    color: "#00e5a0",
    glowColor: "rgba(0,229,160,0.25)",
    icon: "📊",
    regime: "earnings",
    frames,
  };
}

// ─── SCENARIO 4: Oct 2022 — Fed Rate Shock ────────────────────────────────

function buildFedRateShock(): HistoricalScenario {
  const n = 40;
  const spy = buildPricePath("SPY", [
    { t: 0,    price: 408, iv: 0.22 },
    { t: 0.15, price: 390, iv: 0.28 },
    { t: 0.30, price: 370, iv: 0.36 }, // Fed hike 75bps
    { t: 0.45, price: 355, iv: 0.40 }, // Continued hiking cycle
    { t: 0.60, price: 362, iv: 0.35 },
    { t: 0.80, price: 375, iv: 0.28 },
    { t: 1.00, price: 385, iv: 0.24 },
  ], n);
  const aapl = buildPricePath("AAPL", [
    { t: 0,    price: 155, iv: 0.28 },
    { t: 0.30, price: 138, iv: 0.40 },
    { t: 0.45, price: 130, iv: 0.45 },
    { t: 0.80, price: 143, iv: 0.30 },
    { t: 1.00, price: 150, iv: 0.26 },
  ], n);
  const nvda = buildPricePath("NVDA", [
    { t: 0,    price: 138, iv: 0.52 },
    { t: 0.30, price: 112, iv: 0.65 },
    { t: 0.45, price: 108, iv: 0.70 },
    { t: 0.80, price: 122, iv: 0.48 },
    { t: 1.00, price: 130, iv: 0.44 },
  ], n);
  const qqq = buildPricePath("QQQ", [
    { t: 0,    price: 288, iv: 0.26 },
    { t: 0.30, price: 258, iv: 0.40 },
    { t: 0.45, price: 248, iv: 0.45 },
    { t: 0.80, price: 268, iv: 0.30 },
    { t: 1.00, price: 278, iv: 0.26 },
  ], n);
  const vixPath = buildPricePath("VIX", [
    { t: 0,    price: 28, iv: 0 },
    { t: 0.30, price: 34, iv: 0 },
    { t: 0.45, price: 36, iv: 0 },
    { t: 0.65, price: 30, iv: 0 },
    { t: 1.00, price: 25, iv: 0 },
  ], n);

  const annotations: Record<number, string> = {
    0: "October 2022. Aggressive Fed tightening cycle.",
    6: "CPI 8.2% — hotter than expected.",
    12: "Fed raises 75bps. 4th consecutive jumbo hike.",
    18: "Terminal rate fears: market prices 5.25% peak.",
    24: "QQQ breaks 2022 bear market lows.",
    30: "Pivot narrative emerges. Short-covering begins.",
    38: "Bear market rally. Vol premium still elevated.",
  };

  const frames: PlaybackFrame[] = Array.from({ length: n }, (_, i) => ({
    label: `Week ${i + 1}`,
    vix: vixPath.prices[i],
    spotPrices: { SPY: spy.prices[i], AAPL: aapl.prices[i], NVDA: nvda.prices[i], QQQ: qqq.prices[i] },
    ivs: { SPY: spy.ivs[i], AAPL: aapl.ivs[i], NVDA: nvda.ivs[i], QQQ: qqq.ivs[i] },
    annotation: annotations[i],
  }));

  return {
    id: "fedShock2022",
    name: "Fed Rate Shock 2022",
    subtitle: "Aggressive Tightening Cycle",
    description: "Fed delivers 4 consecutive 75bps hikes. Equity markets enter bear territory. Duration risk destroys growth/tech portfolios.",
    color: "#f5a623",
    glowColor: "rgba(245,166,35,0.25)",
    icon: "📉",
    regime: "rate_shock",
    frames,
  };
}

// ─── Export all scenarios ──────────────────────────────────────────────────

export const HISTORICAL_SCENARIOS: HistoricalScenario[] = [
  buildAug2024(),
  buildCOVID2020(),
  buildNVDAEarnings(),
  buildFedRateShock(),
];
