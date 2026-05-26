import { StrategyHoldingGroup } from "../types/portfolioTypes";

export interface RiskNode {
  id: string;
  label: string;
  riskWeight: number; // 0-100%
  value: number;      // Capital allocated
  color: string;
}

export interface ExposureMatrix {
  nodes: RiskNode[];
  concentratedAsset: string | null;
  diversificationIndex: number; // 0-100 (higher = more diversified)
}

/**
 * Maps portfolio holdings into a topological risk concentration matrix.
 */
export function generateExposureTopology(holdings: StrategyHoldingGroup[]): ExposureMatrix {
  const totalAllocation = holdings.reduce((sum, h) => sum + Math.abs(h.currentValue), 0);
  const assetWeights: Record<string, { value: number; color: string }> = {};

  holdings.forEach((h) => {
    const val = Math.abs(h.currentValue);
    if (!assetWeights[h.ticker]) {
      assetWeights[h.ticker] = { value: 0, color: h.color };
    }
    assetWeights[h.ticker].value += val;
  });

  const nodes: RiskNode[] = Object.entries(assetWeights).map(([ticker, data]) => {
    const weight = totalAllocation > 0 ? (data.value / totalAllocation) * 100 : 0;
    return {
      id: ticker,
      label: ticker,
      riskWeight: Math.round(weight * 10) / 10,
      value: Math.round(data.value),
      color: data.color,
    };
  });

  nodes.sort((a, b) => b.riskWeight - a.riskWeight);

  // Concentrated asset is any asset with > 40% risk allocation
  let concentratedAsset: string | null = null;
  const topNode = nodes[0];
  if (topNode && topNode.riskWeight > 40) {
    concentratedAsset = topNode.id;
  }

  // Diversification Index based on Herfindahl-Hirschman Index (HHI)
  // HHI = sum(w_i^2) where w_i is weight in percent
  let hhi = 0;
  nodes.forEach((n) => {
    const weightPct = n.riskWeight;
    hhi += weightPct * weightPct;
  });
  
  // Normalise HHI from 0 to 100 scale (100 = perfectly diversified, 0 = concentrated in one asset)
  const HHI_MAX_CONC = 10000;
  const rawIndex = HHI_MAX_CONC - hhi;
  const diversificationIndex = Math.min(100, Math.max(0, Math.round((rawIndex / 9000) * 100))); // normalize

  return {
    nodes,
    concentratedAsset,
    diversificationIndex,
  };
}
