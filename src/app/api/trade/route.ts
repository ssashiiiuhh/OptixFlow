// ============================================================================
// OPTIXFLOW — Tradier Paper Trading Bridge API Route
// POST /api/trade — constructs + submits option orders to Tradier sandbox.
// GET  /api/trade — fetches recent orders from the account.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

const TRADIER_BASE = "https://sandbox.tradier.com/v1";

interface TradeRequest {
  accountId: string;
  class: "equity" | "option" | "multileg";
  symbol: string;
  side: "buy" | "sell" | "buy_to_open" | "buy_to_close" | "sell_to_open" | "sell_to_close";
  quantity: number;
  type: "market" | "limit" | "stop" | "stop_limit";
  duration: "day" | "gtc" | "pre" | "post";
  price?: number;
  optionSymbol?: string;
  // Multi-leg fields
  legs?: {
    optionSymbol: string;
    side: string;
    quantity: number;
  }[];
}

function tradierHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

function buildOrderBody(req: TradeRequest): string {
  const params = new URLSearchParams();
  params.set("class", req.class);
  params.set("symbol", req.symbol);
  params.set("duration", req.duration);
  params.set("type", req.type);

  if (req.class === "multileg" && req.legs) {
    params.set("type", req.type);
    req.legs.forEach((leg, i) => {
      params.set(`option_symbol[${i}]`, leg.optionSymbol);
      params.set(`side[${i}]`, leg.side);
      params.set(`quantity[${i}]`, String(leg.quantity));
    });
  } else {
    params.set("side", req.side);
    params.set("quantity", String(req.quantity));
    if (req.optionSymbol) params.set("option_symbol", req.optionSymbol);
    if (req.price != null) params.set("price", String(req.price));
  }
  return params.toString();
}

// POST — submit order
export async function POST(request: NextRequest) {
  try {
    const body: TradeRequest = await request.json();
    const token = process.env.TRADIER_SANDBOX_TOKEN;

    if (!token) {
      // Simulate a successful paper order for demo purposes
      return NextResponse.json({
        order: {
          id: Math.floor(Math.random() * 9000000) + 1000000,
          status: "ok",
          partner_id: "SIMULATED",
        },
        simulated: true,
        message: "SANDBOX SIMULATION — No TRADIER_SANDBOX_TOKEN configured. Order not submitted to Tradier.",
      });
    }

    const res = await fetch(
      `${TRADIER_BASE}/accounts/${body.accountId}/orders`,
      {
        method: "POST",
        headers: tradierHeaders(token),
        body: buildOrderBody(body),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err, status: res.status }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ order: data.order, simulated: false });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// GET — fetch recent orders
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId") ?? "demo";
  const token = process.env.TRADIER_SANDBOX_TOKEN;

  if (!token) {
    // Return mock order book for demo
    return NextResponse.json({
      simulated: true,
      orders: {
        order: [
          { id: 1234567, status: "filled",   type: "limit",  symbol: "SPY", side: "buy_to_open",   quantity: 2, optionSymbol: "SPY250620C00530000", avg_fill_price: 2.45, create_date: new Date().toISOString() },
          { id: 1234566, status: "filled",   type: "market", symbol: "SPY", side: "sell_to_open",  quantity: 2, optionSymbol: "SPY250620P00520000", avg_fill_price: 1.82, create_date: new Date(Date.now() - 3600000).toISOString() },
          { id: 1234565, status: "cancelled",type: "limit",  symbol: "QQQ", side: "buy_to_open",   quantity: 1, optionSymbol: "QQQ250620C00460000", avg_fill_price: null, create_date: new Date(Date.now() - 7200000).toISOString() },
        ],
      },
    });
  }

  const res = await fetch(`${TRADIER_BASE}/accounts/${accountId}/orders`, {
    headers: tradierHeaders(token),
  });
  const data = await res.json();
  return NextResponse.json({ simulated: false, orders: data.orders });
}
