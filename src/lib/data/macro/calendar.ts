import { LiveMacroEvent } from "../types";
import { FinnhubDataProvider } from "../providers/finnhub";
import { AlphaVantageDataProvider } from "../providers/alphavantage";

/**
 * Aggregates macroeconomic and earnings catalyst calendars from active providers.
 */
export async function fetchLiveMacroCalendar(keys: {
  finnhubKey?: string;
  alphavantageKey?: string;
}): Promise<LiveMacroEvent[]> {
  const events: LiveMacroEvent[] = [];

  // 1. Ingest Finnhub earnings calendar
  if (keys.finnhubKey) {
    try {
      const finnhub = new FinnhubDataProvider(keys.finnhubKey);
      const earnings = await finnhub.fetchMacroEvents();
      events.push(...earnings);
    } catch (err) {
      console.warn("fetchLiveMacroCalendar: Finnhub earnings calendar fetch failed.", err);
    }
  }

  // 2. Ingest Alpha Vantage economic prints (CPI)
  if (keys.alphavantageKey) {
    try {
      const av = new AlphaVantageDataProvider(keys.alphavantageKey);
      const cpi = await av.fetchMacroEvents();
      events.push(...cpi);
    } catch (err) {
      console.warn("fetchLiveMacroCalendar: Alpha Vantage CPI fetch failed.", err);
    }
  }

  return events;
}
