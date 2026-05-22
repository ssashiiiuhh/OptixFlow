// ============================================
// OPTIXFLOW — Playbook Data Engine
// Educational content for the Playbook Tab
// ============================================

// ── Strategy Constellation Nodes ───────────────────────────────────────────

export type MarketCondition = "Bullish" | "Bearish" | "Neutral" | "Volatile";

export interface StrategyNode {
  id: string;
  name: string;
  condition: MarketCondition;
  complexity: 1 | 2 | 3;
  description: string;
  x: number; // 0-100 normalized coordinate for constellation map
  y: number; // 0-100 normalized coordinate for constellation map
  color: string;
  tags: string[];
}

export const PLAYBOOK_NODES: StrategyNode[] = [
  // Bullish
  { id: "long-call", name: "Long Call", condition: "Bullish", complexity: 1, description: "Unlimited upside, defined risk. Pure directional play.", x: 20, y: 30, color: "#00e5a0", tags: ["Directional", "Defined Risk"] },
  { id: "bull-call", name: "Bull Call Spread", condition: "Bullish", complexity: 2, description: "Capped upside but cheaper than a Long Call. Mitigates theta decay.", x: 35, y: 20, color: "#00e5a0", tags: ["Directional", "Spread"] },
  { id: "cash-secured-put", name: "Cash Secured Put", condition: "Bullish", complexity: 1, description: "Get paid to buy a stock at a discount. Bullish to Neutral.", x: 30, y: 45, color: "#00e5a0", tags: ["Income", "Neutral-Bullish"] },
  
  // Bearish
  { id: "long-put", name: "Long Put", condition: "Bearish", complexity: 1, description: "Profit from downside. Defined risk alternative to shorting.", x: 80, y: 30, color: "#ff4d6a", tags: ["Directional", "Defined Risk"] },
  { id: "bear-put", name: "Bear Put Spread", condition: "Bearish", complexity: 2, description: "Cheaper downside bet. Caps profit to reduce upfront cost.", x: 65, y: 20, color: "#ff4d6a", tags: ["Directional", "Spread"] },
  { id: "credit-call", name: "Bear Call Spread", condition: "Bearish", complexity: 2, description: "Collect premium assuming stock stays below strike.", x: 70, y: 45, color: "#ff4d6a", tags: ["Income", "Neutral-Bearish"] },

  // Neutral
  { id: "iron-condor", name: "Iron Condor", condition: "Neutral", complexity: 3, description: "Profit from low volatility. Defined risk range trade.", x: 50, y: 70, color: "#00d4ff", tags: ["Income", "Range-bound"] },
  { id: "covered-call", name: "Covered Call", condition: "Neutral", complexity: 1, description: "Generate yield on existing stock positions.", x: 50, y: 50, color: "#00d4ff", tags: ["Income", "Stock Required"] },
  
  // Volatile
  { id: "straddle", name: "Long Straddle", condition: "Volatile", complexity: 2, description: "Bet on a massive move in either direction.", x: 50, y: 25, color: "#a855f7", tags: ["Vol-Long", "Direction-Agnostic"] },
  { id: "strangle", name: "Long Strangle", condition: "Volatile", complexity: 2, description: "Cheaper straddle requiring a larger move to profit.", x: 50, y: 10, color: "#a855f7", tags: ["Vol-Long", "Cheaper"] },
];

// ── Interactive Scenario Challenges ────────────────────────────────────────

export interface QuizScenario {
  id: string;
  title: string;
  setup: string;
  options: { label: string; correct: boolean; explanation: string }[];
}

export const SCENARIO_CHALLENGES: QuizScenario[] = [
  {
    id: "q1",
    title: "Earnings Volatility Crush",
    setup: "TSLA reports earnings tomorrow. Implied volatility is at the 99th percentile. You expect the stock to stay relatively flat. What is the optimal play?",
    options: [
      { label: "Buy a Long Straddle", correct: false, explanation: "Wrong. A straddle requires a huge move to offset the massive IV crush post-earnings." },
      { label: "Sell an Iron Condor", correct: true, explanation: "Correct! You collect high premium and profit from both the flat move and the IV crush." },
      { label: "Buy a Long Call", correct: false, explanation: "Wrong. Even if the stock goes up slightly, IV crush might still result in a net loss." },
    ]
  },
  {
    id: "q2",
    title: "The Theta Trap",
    setup: "You hold a Long Call expiring in 3 days. It is currently Out-of-the-Money (OTM) by 5%. What happens to the option's value?",
    options: [
      { label: "It holds value until expiration day.", correct: false, explanation: "Incorrect. Theta (time decay) accelerates exponentially in the final days for OTM options." },
      { label: "It decays rapidly to zero.", correct: true, explanation: "Correct! Theta decay curve steepens massively for OTM options near expiry." },
      { label: "Its value increases due to Gamma.", correct: false, explanation: "Incorrect. While Gamma is high, it doesn't offset Theta unless the stock moves rapidly towards the strike." }
    ]
  }
];

// ── Payoff mini-chart data generators ──────────────────────────────────────

export function generateMiniPayoff(strategy: string) {
  const data = [];
  for (let i = 80; i <= 120; i += 2) {
    let pnl = 0;
    if (strategy === "Long Call") pnl = Math.max(i - 100, 0) - 5;
    if (strategy === "Iron Condor") {
      if (i < 85) pnl = -5;
      else if (i >= 85 && i < 95) pnl = -5 + (i - 85) * 0.5;
      else if (i >= 95 && i <= 105) pnl = 5;
      else if (i > 105 && i <= 115) pnl = 5 - (i - 105) * 0.5;
      else pnl = -5;
    }
    if (strategy === "Straddle") pnl = Math.abs(i - 100) - 10;
    
    data.push({ price: i, pnl });
  }
  return data;
}
