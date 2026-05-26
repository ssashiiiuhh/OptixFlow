// ============================================================================
// OPTIXFLOW — Gemini AI Narration API Route
// Streams institutional-quality risk commentary from Gemini 2.0 Flash.
// POST /api/narrate — accepts Greeks + VaR context, returns streaming text.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

interface NarrateRequest {
  totalDelta: number;
  totalGamma: number;
  totalTheta: number;
  totalVega: number;
  netPnl: number;
  avgIV: number;
  var95: number;
  var99: number;
  cvar: number;
  isTicking: boolean;
  playbackMode?: boolean;
  scenarioName?: string;
}

const SYSTEM_PROMPT = `You are OptixFlow's embedded quantitative risk analyst — an elite derivatives intelligence engine.
Your role is to narrate the current portfolio risk state in the style of a senior derivatives desk analyst at a top-tier hedge fund.

Rules:
- Write in monologue-style, 2–4 SHORT sentences per response.
- Be precise: reference the actual Greek values and risk metrics provided.
- Mix formal quant vocabulary (e.g. "convexity", "vol surface", "theta bleed", "gamma flip") with clear financial insight.
- Flag genuine risk concerns with severity language (CAUTION, WARNING, CRITICAL).
- Never repeat yourself exactly — each narration must feel fresh.
- Keep each response under 120 words.
- Do NOT use bullet points or headers — pure prose monologue only.`;

function buildPrompt(data: NarrateRequest): string {
  const mode = data.playbackMode
    ? `PLAYBACK MODE — Historical Scenario: ${data.scenarioName ?? "Unknown"}`
    : data.isTicking
    ? "LIVE TICKING ENGINE — Real-time market simulation active"
    : "STANDBY — Market simulation paused";

  return `Mode: ${mode}

Current Portfolio Metrics:
- Net Delta: ${data.totalDelta.toFixed(2)} (directional exposure)
- Net Gamma: ${data.totalGamma.toFixed(4)} (convexity)
- Net Theta: ${data.totalTheta.toFixed(2)} $/day (time decay)
- Net Vega: ${data.totalVega.toFixed(2)} (vol sensitivity)
- Net P&L: $${data.netPnl.toLocaleString()}
- Avg IV: ${data.avgIV.toFixed(1)}%
- VaR (95%): $${Math.abs(data.var95).toLocaleString()}
- VaR (99%): $${Math.abs(data.var99).toLocaleString()}
- CVaR (Expected Shortfall): $${Math.abs(data.cvar).toLocaleString()}

Generate a 2–4 sentence risk narration for this portfolio state. Be specific, be sharp, be institutional.`;
}

export async function POST(request: NextRequest) {
  try {
    const data: NarrateRequest = await request.json();

    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    // If no API key, return a high-quality simulated narration
    if (!apiKey) {
      const simulated = generateSimulatedNarration(data);
      return NextResponse.json({ narration: simulated });
    }

    // Real Gemini API call
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: buildPrompt(data) }] }],
          generationConfig: {
            maxOutputTokens: 180,
            temperature: 0.75,
            topP: 0.9,
          },
        }),
      }
    );

    if (!response.ok) {
      const simulated = generateSimulatedNarration(data);
      return NextResponse.json({ narration: simulated });
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? generateSimulatedNarration(data);
    return NextResponse.json({ narration: text });

  } catch {
    return NextResponse.json({ narration: "[AI] Narration engine temporarily offline — simulated mode active." });
  }
}

// ── Deterministic fallback narration (no API key needed) ─────────────────────

function generateSimulatedNarration(data: NarrateRequest): string {
  const { totalDelta, totalGamma, totalTheta, totalVega, netPnl, avgIV, var99, cvar, playbackMode, scenarioName } = data;

  const deltaDir = totalDelta > 30 ? "long-biased" : totalDelta < -30 ? "short-biased" : "delta-neutral";
  const thetaStr = `decaying at $${Math.abs(totalTheta).toFixed(0)}/day`;
  const vegaSignal = totalVega > 50 ? "long-vol positioning makes this portfolio vulnerable to IV crush" : "short-vol positioning benefits from realized-vol compression";
  const varStr = `$${Math.abs(var99).toLocaleString()}`;
  const ivStr = `${avgIV.toFixed(1)}%`;

  const pnlStr = netPnl >= 0 ? `+$${netPnl.toLocaleString()}` : `-$${Math.abs(netPnl).toLocaleString()}`;

  if (playbackMode && scenarioName) {
    return `[AI] Replaying ${scenarioName} — ${deltaDir} exposure with IV at ${ivStr}. Theta engine ${thetaStr} as historical vol regime unfolds. ${vegaSignal.charAt(0).toUpperCase() + vegaSignal.slice(1)} across this stress window. VaR 99% breach zone at ${varStr}.`;
  }

  const gammaNote = Math.abs(totalGamma) > 0.05
    ? `Gamma at ${totalGamma.toFixed(4)} signals accelerating convexity risk near strike clusters.`
    : `Gamma profile remains flat — limited second-order acceleration risk.`;

  return `[AI] Portfolio is ${deltaDir} with net Δ ${totalDelta > 0 ? "+" : ""}${totalDelta.toFixed(1)}, ${thetaStr} at implied vol ${ivStr}. ${gammaNote} Current ${vegaSignal}. Tail risk at VaR 99%: ${varStr}, CVaR: $${Math.abs(cvar).toLocaleString()} — P&L mark: ${pnlStr}.`;
}
