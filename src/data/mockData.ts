export const portfolioHistory = Array.from({ length: 30 }, (_, i) => {
  const base = 1_180_000;
  const trend = i * 2_200;
  const noise = Math.sin(i * 0.8) * 15_000 + Math.cos(i * 0.4) * 8_000;
  const date = new Date('2026-05-17');
  date.setDate(date.getDate() + i);
  return {
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: Math.round(base + trend + noise),
  };
});

export const stocks = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 211.43, change: 2.34, pct: 1.12, signal: 'BUY', shares: 48 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 438.21, change: -3.12, pct: -0.71, signal: 'HOLD', shares: 22 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 188.92, change: 4.56, pct: 2.47, signal: 'BUY', shares: 31 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 127.85, change: -1.90, pct: -1.46, signal: 'HOLD', shares: 60 },
  { symbol: 'META', name: 'Meta Platforms', price: 594.30, change: 8.15, pct: 1.39, signal: 'BUY', shares: 14 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 201.74, change: -5.32, pct: -2.57, signal: 'SELL', shares: 19 },
];

export const allocation = [
  { name: 'Technology', value: 52, color: '#6366f1' },
  { name: 'Healthcare', value: 16, color: '#10b981' },
  { name: 'Finance', value: 14, color: '#f59e0b' },
  { name: 'Consumer', value: 11, color: '#8b5cf6' },
  { name: 'Energy', value: 7, color: '#06b6d4' },
];

export const transactions = [
  { date: 'Jun 14', type: 'BUY', symbol: 'AAPL', shares: 5, price: 209.11, total: 1045.55 },
  { date: 'Jun 13', type: 'SELL', symbol: 'AMZN', shares: 3, price: 207.06, total: 621.18 },
  { date: 'Jun 11', type: 'BUY', symbol: 'NVDA', shares: 10, price: 123.44, total: 1234.40 },
  { date: 'Jun 10', type: 'BUY', symbol: 'META', shares: 2, price: 586.15, total: 1172.30 },
  { date: 'Jun 09', type: 'SELL', symbol: 'MSFT', shares: 4, price: 442.33, total: 1769.32 },
];

export const stats = [
  { label: 'Portfolio Value', value: '$1,246,830', delta: '+2.34%', up: true },
  { label: "Today's P&L", value: '+$28,541', delta: '+2.34%', up: true },
  { label: 'Total Return', value: '+$234,120', delta: '+23.14%', up: true },
  { label: 'Dividend Yield', value: '2.18%', delta: '+0.12%', up: true },
];
