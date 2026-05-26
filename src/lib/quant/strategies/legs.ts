import { OptionLeg } from "./types";

/**
 * Dynamically builds option legs for a given strategy.
 */
export function getStrategyLegs(
  strategyName: string,
  strike: number,
  spreadWidth: number = 5
): OptionLeg[] {
  // Normalize strategy name for comparison
  const normalized = strategyName.toLowerCase().replace(/[^a-z0-9]/g, "");

  switch (normalized) {
    case "longcall":
      return [{ type: "call", side: "long", strike, quantity: 1 }];
    
    case "longput":
      return [{ type: "put", side: "long", strike, quantity: 1 }];
    
    case "longstraddle":
    case "straddle":
      return [
        { type: "call", side: "long", strike, quantity: 1 },
        { type: "put", side: "long", strike, quantity: 1 }
      ];
    
    case "longstrangle":
    case "strangle":
      return [
        { type: "call", side: "long", strike: strike + spreadWidth, quantity: 1 },
        { type: "put", side: "long", strike: strike - spreadWidth, quantity: 1 }
      ];
    
    case "bullcallspread":
    case "bullcall":
      return [
        { type: "call", side: "long", strike, quantity: 1 },
        { type: "call", side: "short", strike: strike + spreadWidth, quantity: 1 }
      ];
    
    case "bearputspread":
    case "bearput":
      return [
        { type: "put", side: "long", strike, quantity: 1 },
        { type: "put", side: "short", strike: strike - spreadWidth, quantity: 1 }
      ];

    case "bearcallspread":
    case "creditcall":
      return [
        { type: "call", side: "short", strike, quantity: 1 },
        { type: "call", side: "long", strike: strike + spreadWidth, quantity: 1 }
      ];

    case "bullputspread":
      return [
        { type: "put", side: "short", strike, quantity: 1 },
        { type: "put", side: "long", strike: strike - spreadWidth, quantity: 1 }
      ];
    
    case "ironcondor":
      return [
        { type: "put", side: "long", strike: strike - 2 * spreadWidth, quantity: 1 },
        { type: "put", side: "short", strike: strike - spreadWidth, quantity: 1 },
        { type: "call", side: "short", strike: strike + spreadWidth, quantity: 1 },
        { type: "call", side: "long", strike: strike + 2 * spreadWidth, quantity: 1 }
      ];
    
    case "coveredcall":
      return [
        { type: "call", side: "long", strike: 0.01, quantity: 1 },
        { type: "call", side: "short", strike, quantity: 1 }
      ];
    
    case "cashsecuredput":
      return [{ type: "put", side: "short", strike, quantity: 1 }];

    case "protectiveput":
      return [
        { type: "call", side: "long", strike: 0.01, quantity: 1 },
        { type: "put", side: "long", strike, quantity: 1 }
      ];
    
    default:
      return [{ type: "call", side: "long", strike, quantity: 1 }];
  }
}
