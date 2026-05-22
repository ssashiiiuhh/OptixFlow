// ============================================
// OPTIXFLOW — Financial Payoff Engine
// Pure, side-effect-free calculation functions
// ============================================

import type {
  PayoffPoint,
  StrategyMetrics,
  StrategyParams,
} from "@/types/options";

// ── Utility ─────────────────────────────────

/**
 * Clamps a value to a minimum of 0.
 * Used for intrinsic value calculations (max(x, 0))
 */
const intrinsic = (value: number): number => Math.max(value, 0);

// ── Single-leg payoffs ───────────────────────

/**
 * Long Call payoff at expiration.
 *
 * profit = max(S - K, 0) - premium
 *
 * @param S - Stock price at expiration
 * @param K - Strike price
 * @param premium - Premium paid per share (cost basis)
 * @param quantity - Number of contracts (each = 100 shares)
 */
export function longCallPayoff(
  S: number,
  K: number,
  premium: number,
  quantity: number = 1
): number {
  return (intrinsic(S - K) - premium) * quantity * 100;
}

/**
 * Long Put payoff at expiration.
 *
 * profit = max(K - S, 0) - premium
 *
 * @param S - Stock price at expiration
 * @param K - Strike price
 * @param premium - Premium paid per share
 * @param quantity - Number of contracts
 */
export function longPutPayoff(
  S: number,
  K: number,
  premium: number,
  quantity: number = 1
): number {
  return (intrinsic(K - S) - premium) * quantity * 100;
}

/**
 * Bull Call Spread payoff at expiration.
 * Buy lower strike call (K1), sell upper strike call (K2).
 *
 * Three phases:
 *   S ≤ K1          →  flat loss  = −netPremium
 *   K1 < S < K2     →  linear     = S − K1 − netPremium
 *   S ≥ K2          →  capped     = K2 − K1 − netPremium
 *
 * Equivalent closed form: max(S−K1,0) − max(S−K2,0) − netPremium
 *
 * @param S          - Stock price at expiration
 * @param K1         - Lower strike (long call)
 * @param K2         - Upper strike (short call); must be > K1
 * @param netPremium - Net debit paid per share (long premium − short premium)
 * @param quantity   - Number of spread contracts
 */
export function bullCallSpreadPayoff(
  S: number,
  K1: number,
  K2: number,
  netPremium: number,
  quantity: number = 1
): number {
  return (intrinsic(S - K1) - intrinsic(S - K2) - netPremium) * quantity * 100;
}

// ── Series Generator ─────────────────────────

/**
 * Computes the price range that best frames a strategy's payoff diagram.
 * Returns [minPrice, maxPrice].
 *
 * For single-leg strategies we center on the strike and show ±45%.
 * For spreads we anchor to [K1, K2] and add generous padding on each side
 * so all three phases (flat-loss / slope / flat-profit) are clearly visible.
 */
function computePriceRange(params: StrategyParams): [number, number] {
  if (params.strategyType === "bull_call_spread") {
    const { lowerStrike: K1, upperStrike: K2 } = params;
    const spreadWidth = K2 - K1;
    // Show at least 2× the spread width outside each strike
    const pad = Math.max(spreadWidth * 2, 20);
    return [Math.max(1, K1 - pad), K2 + pad];
  }

  // Single-leg: center on strike price, ±45%
  const center = params.strikePrice;
  return [Math.max(1, center * 0.55), center * 1.45];
}

/**
 * Returns an ordered, deduplicated list of "inflection prices" where the
 * payoff curve changes shape. These are injected as explicit data points
 * to guarantee sharp kinks in the chart rather than smoothed curves.
 */
function getKeyPrices(params: StrategyParams): number[] {
  const keys: number[] = [];

  if (params.strategyType === "long_call") {
    keys.push(params.strikePrice, params.strikePrice + params.premium);
  } else if (params.strategyType === "long_put") {
    keys.push(params.strikePrice, params.strikePrice - params.premium);
  } else if (params.strategyType === "bull_call_spread") {
    const be = params.lowerStrike + params.netPremium;
    keys.push(params.lowerStrike, be, params.upperStrike);
  }

  return [...new Set(keys)].sort((a, b) => a - b);
}

/**
 * Evaluates the payoff for a given stock price and strategy.
 */
function evalPayoff(price: number, params: StrategyParams): number {
  if (params.strategyType === "long_call") {
    return longCallPayoff(price, params.strikePrice, params.premium, params.quantity);
  }
  if (params.strategyType === "long_put") {
    return longPutPayoff(price, params.strikePrice, params.premium, params.quantity);
  }
  if (params.strategyType === "bull_call_spread") {
    return bullCallSpreadPayoff(
      price,
      params.lowerStrike,
      params.upperStrike,
      params.netPremium,
      params.quantity
    );
  }
  return 0;
}

/**
 * Generates a sorted array of PayoffPoint data for charting.
 *
 * Key design decisions:
 * - POINTS uniform samples across the visible price range
 * - Inflection prices (strikes, breakeven) are injected explicitly so that
 *   Recharts' linear interpolation produces exact sharp kinks
 * - `profit` = Math.max(0, pnl) and `loss` = Math.min(0, pnl) (never null)
 *   so Recharts Area fills from 0 without gaps at the zero crossing
 */
export function generatePayoffSeries(params: StrategyParams): PayoffPoint[] {
  const POINTS = 300;

  const [minPrice, maxPrice] = computePriceRange(params);
  const step = (maxPrice - minPrice) / POINTS;

  // Uniform grid
  const prices = new Set<number>();
  for (let i = 0; i <= POINTS; i++) {
    prices.add(minPrice + i * step);
  }

  // Inject key inflection points so kinks are pixel-exact
  for (const kp of getKeyPrices(params)) {
    if (kp >= minPrice && kp <= maxPrice) {
      prices.add(kp);
    }
  }

  // Sort ascending, compute payoff for each
  return [...prices]
    .sort((a, b) => a - b)
    .map((price) => {
      const pnl = evalPayoff(price, params);
      const rounded = Math.round(pnl * 100) / 100;

      return {
        price: Math.round(price * 100) / 100,
        pnl: rounded,
        // Use 0 (not null) at the boundary so Area fills are seamless.
        // The Area component renders height = |value − baseValue(0)|,
        // so 0 means zero height (invisible) in the non-applicable zone.
        profit: Math.max(0, rounded),
        loss: Math.min(0, rounded),
      };
    });
}

// ── Metrics Calculator ───────────────────────

/** Derive key strategy metrics for the info bar */
export function computeMetrics(params: StrategyParams): StrategyMetrics {
  if (params.strategyType === "long_call") {
    const { strikePrice: K, premium, quantity } = params;
    return {
      breakevenPrice: K + premium,
      maxProfit: Infinity, // theoretically unlimited
      maxLoss: -(premium * quantity * 100),
    };
  }

  if (params.strategyType === "long_put") {
    const { strikePrice: K, premium, quantity } = params;
    return {
      // Put's max profit is capped: stock can only fall to 0
      maxProfit: (K - premium) * quantity * 100,
      maxLoss: -(premium * quantity * 100),
      breakevenPrice: K - premium,
    };
  }

  if (params.strategyType === "bull_call_spread") {
    const { lowerStrike: K1, upperStrike: K2, netPremium, quantity } = params;
    const spreadWidth = K2 - K1;
    return {
      // Breakeven: stock must rise enough past K1 to recoup the net debit
      breakevenPrice: K1 + netPremium,
      // Max profit: full spread width minus the net debit paid, per contract
      maxProfit: (spreadWidth - netPremium) * quantity * 100,
      // Max loss: entire net debit paid upfront, if stock stays below K1
      maxLoss: -(netPremium * quantity * 100),
    };
  }

  return { breakevenPrice: null, maxProfit: null, maxLoss: null };
}

// ── Axis Domain Helper ───────────────────────

/**
 * Computes a Y-axis [min, max] domain with padding so the flat regions
 * of the payoff (floor loss, capped profit) have visual breathing room.
 */
export function computeYDomain(
  series: PayoffPoint[]
): [number, number] {
  const pnlValues = series.map((p) => p.pnl);
  const dataMin = Math.min(...pnlValues);
  const dataMax = Math.max(...pnlValues);
  const range = dataMax - dataMin || 100;

  // Add 20% vertical padding above and below the extremes
  const pad = range * 0.2;
  return [
    Math.floor((dataMin - pad) / 50) * 50,
    Math.ceil((dataMax + pad) / 50) * 50,
  ];
}

// ── Formatting ───────────────────────────────

/** Format a dollar P&L value for display */
export function formatPnL(value: number | null): string {
  if (value === null) return "—";
  if (!isFinite(value)) return "∞";
  const abs = Math.abs(value);
  const sign = value >= 0 ? "+" : "-";
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(2)}k`;
  return `${sign}$${abs.toFixed(2)}`;
}

/** Format a price value */
export function formatPrice(value: number | null): string {
  if (value === null) return "—";
  return `$${value.toFixed(2)}`;
}
