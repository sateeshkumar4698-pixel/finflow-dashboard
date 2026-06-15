import YahooFinanceClass from 'yahoo-finance2';
const yahooFinance = new (YahooFinanceClass as any)({ suppressNotices: ['yahooSurvey'] });

export const NIFTY50_SYMBOLS = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
  'HINDUNILVR.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS', 'BAJFINANCE.NS',
  'ASIANPAINT.NS', 'MARUTI.NS', 'LT.NS', 'AXISBANK.NS', 'TITAN.NS',
  'WIPRO.NS', 'ULTRACEMCO.NS', 'HCLTECH.NS', 'NESTLEIND.NS', 'SUNPHARMA.NS',
  'POWERGRID.NS', 'NTPC.NS', 'ONGC.NS', 'TATAMOTORS.NS', 'M&M.NS',
  'SBIN.NS', 'TECHM.NS', 'DRREDDY.NS', 'BRITANNIA.NS', 'GRASIM.NS',
  'CIPLA.NS', 'DIVISLAB.NS', 'BAJAJ-AUTO.NS', 'EICHERMOT.NS', 'JSWSTEEL.NS',
  'HINDALCO.NS', 'ADANIENT.NS', 'COALINDIA.NS', 'INDUSINDBK.NS', 'BPCL.NS',
  'SBILIFE.NS',
];

export const INDEX_SYMBOLS: Record<string, string> = {
  'NIFTY 50': '^NSEI',
  'SENSEX': '^BSESN',
  'BANK NIFTY': '^NSEBANK',
};

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  marketCap: number;
  peRatio: number;
  week52High: number;
  week52Low: number;
  currency: string;
  exchange: string;
  marketState: string;
}

export interface HistoryPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function getQuote(symbol: string): Promise<StockQuote> {
  const q = await yahooFinance.quote(symbol);
  return {
    symbol: q.symbol,
    name: q.longName ?? q.shortName ?? symbol,
    price: q.regularMarketPrice ?? 0,
    change: q.regularMarketChange ?? 0,
    changePct: q.regularMarketChangePercent ?? 0,
    open: q.regularMarketOpen ?? 0,
    high: q.regularMarketDayHigh ?? 0,
    low: q.regularMarketDayLow ?? 0,
    previousClose: q.regularMarketPreviousClose ?? 0,
    volume: q.regularMarketVolume ?? 0,
    marketCap: q.marketCap ?? 0,
    peRatio: q.trailingPE ?? 0,
    week52High: q.fiftyTwoWeekHigh ?? 0,
    week52Low: q.fiftyTwoWeekLow ?? 0,
    currency: q.currency ?? 'INR',
    exchange: q.exchange ?? '',
    marketState: q.marketState ?? 'CLOSED',
  };
}

export async function getMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
  const results = await Promise.allSettled(symbols.map(getQuote));
  return results
    .filter((r): r is PromiseFulfilledResult<StockQuote> => r.status === 'fulfilled')
    .map((r) => r.value);
}

export async function getHistory(
  symbol: string,
  range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' = '1mo'
): Promise<HistoryPoint[]> {
  const intervalMap: Record<string, '5m' | '15m' | '1d'> = {
    '1d': '5m', '5d': '15m', '1mo': '1d', '3mo': '1d', '6mo': '1d', '1y': '1d',
  };
  // Convert range string to actual Date (yahoo-finance2 v3 requires Date or timestamp)
  const now = new Date();
  function period1Date(r: string): Date {
    const d = new Date(now);
    switch (r) {
      case '1d': d.setDate(d.getDate() - 1); break;
      case '5d': d.setDate(d.getDate() - 5); break;
      case '1mo': d.setMonth(d.getMonth() - 1); break;
      case '3mo': d.setMonth(d.getMonth() - 3); break;
      case '6mo': d.setMonth(d.getMonth() - 6); break;
      case '1y': d.setFullYear(d.getFullYear() - 1); break;
    }
    return d;
  }

  const result = await yahooFinance.chart(symbol, {
    period1: period1Date(range),
    interval: intervalMap[range],
  });

  return (result.quotes ?? [])
    .filter((q) => q.close != null && q.close > 0)
    .map((q) => ({
      date: new Date(q.date).toISOString(),
      open: q.open ?? 0,
      high: q.high ?? 0,
      low: q.low ?? 0,
      close: q.close ?? 0,
      volume: q.volume ?? 0,
    }));
}

export async function searchStocks(query: string) {
  const result = await yahooFinance.search(query, { newsCount: 0 });
  return (result.quotes ?? [])
    .filter((q) => q.exchange === 'NSI' || q.exchange === 'BSE' || (q as any).symbol?.endsWith('.NS') || (q as any).symbol?.endsWith('.BO'))
    .slice(0, 8)
    .map((q) => ({
      symbol: (q as any).symbol,
      name: (q as any).longname ?? (q as any).shortname ?? (q as any).symbol,
      exchange: (q as any).exchange,
    }));
}

export async function getIndices() {
  const symbols = Object.values(INDEX_SYMBOLS);
  const quotes = await getMultipleQuotes(symbols);
  return Object.entries(INDEX_SYMBOLS).map(([name, sym]) => {
    const q = quotes.find((q) => q.symbol === sym);
    return { name, symbol: sym, ...q };
  });
}
