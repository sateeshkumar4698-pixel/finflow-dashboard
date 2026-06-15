const BASE = 'http://localhost:4000/api';

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json();
}

export const api = {
  // Market
  getIndices: () => request<any[]>('/market/indices'),
  getNifty50: () => request<any[]>('/market/nifty50'),
  getQuote: (symbol: string) => request<any>(`/market/quote/${encodeURIComponent(symbol)}`),
  getHistory: (symbol: string, range = '1mo') => request<any[]>(`/market/history/${encodeURIComponent(symbol)}?range=${range}`),
  searchStocks: (q: string) => request<any[]>(`/market/search?q=${encodeURIComponent(q)}`),

  // Portfolio
  getSummary: () => request<any>('/portfolio/summary'),
  getHoldings: () => request<any[]>('/portfolio/holdings'),
  getTransactions: () => request<any[]>('/portfolio/transactions'),
  getWatchlist: () => request<any[]>('/portfolio/watchlist'),
  addToWatchlist: (symbol: string) => request<any>('/portfolio/watchlist', { method: 'POST', body: JSON.stringify({ symbol }) }),
  removeFromWatchlist: (symbol: string) => request<any>(`/portfolio/watchlist/${encodeURIComponent(symbol)}`, { method: 'DELETE' }),
  buy: (symbol: string, qty: number) => request<any>('/portfolio/buy', { method: 'POST', body: JSON.stringify({ symbol, qty }) }),
  sell: (symbol: string, qty: number) => request<any>('/portfolio/sell', { method: 'POST', body: JSON.stringify({ symbol, qty }) }),

  // AI
  analyzeStock: (symbol: string) => request<any>('/ai/analyze', { method: 'POST', body: JSON.stringify({ symbol }) }),
  getMarketSentiment: (symbols: string[]) => request<any>(`/ai/sentiment?symbols=${symbols.join(',')}`),
};
