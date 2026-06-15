import { useEffect, useState, useCallback } from 'react';
import { LayoutDashboard, LineChart, Briefcase, Brain, X, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { api } from '../api/client';
import { useSocket } from '../hooks/useSocket';
import StockChart from './StockChart';
import AIAnalysis from './AIAnalysis';
import TradingPanel from './TradingPanel';
import StockSearch from './StockSearch';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

type Tab = 'dashboard' | 'markets' | 'portfolio' | 'ai';

const INR = (n: number, digits = 2) =>
  '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: digits });

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444'];

function Badge({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span className={`text-xs font-semibold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
    </span>
  );
}

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [summary, setSummary] = useState<any>(null);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [nifty50, setNifty50] = useState<any[]>([]);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [connected, setConnected] = useState(false);

  const watchlistSymbols = watchlist.map((w) => w.symbol);
  const { prices, indices } = useSocket([...watchlistSymbols, '^NSEI', '^BSESN']);

  // Merge real-time prices into watchlist
  const liveWatchlist = watchlist.map((s) => ({ ...s, ...(prices[s.symbol] ?? {}) }));
  const liveNifty = nifty50.map((s) => ({ ...s, ...(prices[s.symbol] ?? {}) }));
  const liveHoldings = holdings.map((h) => {
    const live = prices[h.symbol];
    if (!live) return h;
    const currentPrice = live.price;
    const currentValue = currentPrice * h.qty;
    const pnl = currentValue - h.investedValue;
    return { ...h, currentPrice, currentValue, pnl, pnlPct: (pnl / h.investedValue) * 100, dayChange: live.changePct };
  });

  const niftyIndex = indices.find((i) => i.symbol === '^NSEI');
  const sensexIndex = indices.find((i) => i.symbol === '^BSESN');

  const reload = useCallback(async () => {
    const [s, w, h, tx, n50] = await Promise.allSettled([
      api.getSummary(),
      api.getWatchlist(),
      api.getHoldings(),
      api.getTransactions(),
      api.getNifty50(),
    ]);
    if (s.status === 'fulfilled') { setSummary(s.value); setConnected(true); }
    if (w.status === 'fulfilled') setWatchlist(w.value);
    if (h.status === 'fulfilled') setHoldings(h.value);
    if (tx.status === 'fulfilled') setTransactions(tx.value);
    if (n50.status === 'fulfilled') setNifty50(n50.value);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const addToWatchlist = async (symbol: string) => {
    try { await api.addToWatchlist(symbol); reload(); } catch {}
  };

  const removeFromWatchlist = async (symbol: string) => {
    await api.removeFromWatchlist(symbol);
    setWatchlist((prev) => prev.filter((w) => w.symbol !== symbol));
  };

  const openStock = async (sym: string) => {
    try {
      const q = prices[sym] ?? await api.getQuote(sym);
      setSelectedStock(q);
      setTab('markets');
    } catch {}
  };

  const holdingForSelected = selectedStock
    ? liveHoldings.find((h) => h.symbol === selectedStock.symbol)
    : null;

  // Portfolio pie data
  const pieData = liveHoldings.map((h) => ({
    name: h.symbol.replace('.NS', ''),
    value: Math.max(0, h.currentValue),
  }));
  if (summary?.virtualCash > 0) pieData.push({ name: 'Cash', value: summary.virtualCash });

  return (
    <div className="min-h-screen bg-[#080d14] text-slate-200 flex flex-col">
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="bg-[#0d1421] border-b border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm">₹</div>
          <span className="text-white font-bold text-lg tracking-tight">FinFlow</span>
          <span className="text-slate-600 text-xs hidden sm:block">Indian Stock Market · Paper Trading</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Index pills */}
          {niftyIndex && (
            <div className="hidden md:flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-slate-400">NIFTY</span>
              <span className="text-white font-bold">{niftyIndex.price?.toLocaleString('en-IN') ?? '–'}</span>
              <Badge pct={niftyIndex.changePct ?? 0} />
            </div>
          )}
          {sensexIndex && (
            <div className="hidden md:flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-slate-400">SENSEX</span>
              <span className="text-white font-bold">{sensexIndex.price?.toLocaleString('en-IN') ?? '–'}</span>
              <Badge pct={sensexIndex.changePct ?? 0} />
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs">
            {connected ? <Wifi size={12} className="text-emerald-400" /> : <WifiOff size={12} className="text-red-400" />}
            <span className={connected ? 'text-emerald-400' : 'text-red-400'}>{connected ? 'Live' : 'Offline'}</span>
          </div>
          <button onClick={reload} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <RefreshCw size={13} />
          </button>
        </div>
      </nav>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="bg-[#0d1421] border-b border-slate-800 px-6 flex gap-1">
        {([
          { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { id: 'markets', icon: LineChart, label: 'Markets' },
          { id: 'portfolio', icon: Briefcase, label: 'Portfolio' },
          { id: 'ai', icon: Brain, label: 'AI Signals' },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === id ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">

        {/* ══ DASHBOARD TAB ══════════════════════════════════════════════════ */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats row */}
            {summary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Portfolio', value: INR(summary.totalPortfolio, 0), sub: 'Virtual capital', color: 'text-white' },
                  { label: 'Invested Value', value: INR(summary.investedValue, 0), sub: `${summary.holdingsCount} holdings`, color: 'text-white' },
                  { label: 'Unrealised P&L', value: (summary.totalPnl >= 0 ? '+' : '') + INR(summary.totalPnl, 0), sub: `${summary.totalPnlPct >= 0 ? '+' : ''}${summary.totalPnlPct.toFixed(2)}%`, color: summary.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400' },
                  { label: 'Cash Available', value: INR(summary.virtualCash, 0), sub: 'Ready to invest', color: 'text-white' },
                ].map((s) => (
                  <div key={s.label} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                    <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">{s.label}</p>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-slate-500 text-xs mt-1">{s.sub}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Watchlist */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
                  <h2 className="text-white font-semibold">Watchlist</h2>
                  <StockSearch onSelect={(sym) => addToWatchlist(sym)} buttonLabel="Watch" />
                </div>
                <div className="divide-y divide-slate-700/50">
                  {liveWatchlist.length === 0 && (
                    <p className="text-slate-500 text-sm text-center py-8">Add stocks to watch them here</p>
                  )}
                  {liveWatchlist.map((s) => (
                    <div key={s.symbol} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-700/30 transition-colors group">
                      <button onClick={() => openStock(s.symbol)} className="flex items-center gap-3 flex-1 text-left">
                        <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-300">
                          {s.symbol.replace('.NS', '').replace('.BO', '').slice(0, 3)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold">{s.symbol.replace('.NS', '').replace('.BO', '')}</p>
                          <p className="text-slate-500 text-xs truncate">{s.shortName ?? s.longName ?? ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white text-sm font-bold">
                            {s.price ? INR(s.price) : '–'}
                          </p>
                          {s.changePct !== undefined && <Badge pct={s.changePct} />}
                        </div>
                      </button>
                      <button onClick={() => removeFromWatchlist(s.symbol)} className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent transactions */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl">
                <div className="px-5 py-4 border-b border-slate-700">
                  <h2 className="text-white font-semibold">Recent Trades</h2>
                </div>
                <div className="divide-y divide-slate-700/50">
                  {transactions.length === 0 && (
                    <p className="text-slate-500 text-sm text-center py-8">No trades yet — use Markets tab to buy</p>
                  )}
                  {transactions.slice(0, 8).map((tx) => (
                    <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${tx.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {tx.type === 'BUY' ? '↑' : '↓'}
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-semibold">{tx.symbol.replace('.NS', '')} × {tx.qty}</p>
                        <p className="text-slate-500 text-xs">{new Date(tx.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${tx.type === 'BUY' ? 'text-red-400' : 'text-emerald-400'}`}>
                          {tx.type === 'BUY' ? '–' : '+'}{INR(tx.total)}
                        </p>
                        <p className="text-slate-500 text-xs">@ {INR(tx.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Nifty 50 movers */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl">
              <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-white font-semibold">Nifty 50 Stocks</h2>
                <p className="text-slate-500 text-xs">Click any stock to trade</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      {['Symbol', 'Name', 'Price', 'Change', '52W High', '52W Low', 'P/E', 'Vol'].map((h) => (
                        <th key={h} className="text-left text-slate-500 text-xs font-medium px-4 py-2 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {(liveNifty.length ? liveNifty : nifty50).slice(0, 15).map((s) => (
                      <tr key={s.symbol} onClick={() => openStock(s.symbol)} className="hover:bg-slate-700/30 cursor-pointer transition-colors">
                        <td className="px-4 py-2.5 text-indigo-400 font-mono font-semibold whitespace-nowrap">{s.symbol.replace('.NS', '')}</td>
                        <td className="px-4 py-2.5 text-slate-300 max-w-[180px] truncate">{s.name}</td>
                        <td className="px-4 py-2.5 text-white font-semibold whitespace-nowrap">{INR(s.price ?? 0)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap"><Badge pct={s.changePct ?? 0} /></td>
                        <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{INR(s.week52High ?? 0)}</td>
                        <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{INR(s.week52Low ?? 0)}</td>
                        <td className="px-4 py-2.5 text-slate-400">{s.peRatio?.toFixed(1) ?? '–'}</td>
                        <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{s.volume ? (s.volume / 100000).toFixed(1) + 'L' : '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ MARKETS TAB ════════════════════════════════════════════════════ */}
        {tab === 'markets' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <h2 className="text-white font-bold text-lg">Markets</h2>
              <StockSearch onSelect={async (sym, name) => {
                try {
                  const q = prices[sym] ?? await api.getQuote(sym);
                  setSelectedStock({ ...q, name: q.name ?? name });
                } catch {}
              }} placeholder="Search & analyse any NSE stock…" />
            </div>

            {selectedStock ? (
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <StockChart
                    symbol={selectedStock.symbol}
                    name={selectedStock.name ?? selectedStock.symbol}
                    currentPrice={prices[selectedStock.symbol]?.price ?? selectedStock.price}
                    changePct={prices[selectedStock.symbol]?.changePct ?? selectedStock.changePct}
                  />
                  {/* Key metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Open', value: INR(selectedStock.open) },
                      { label: 'Day High', value: INR(selectedStock.high) },
                      { label: 'Day Low', value: INR(selectedStock.low) },
                      { label: 'Prev Close', value: INR(selectedStock.previousClose) },
                      { label: '52W High', value: INR(selectedStock.week52High) },
                      { label: '52W Low', value: INR(selectedStock.week52Low) },
                      { label: 'P/E Ratio', value: selectedStock.peRatio?.toFixed(2) ?? '–' },
                      { label: 'Mkt Cap', value: selectedStock.marketCap ? '₹' + (selectedStock.marketCap / 10000000).toFixed(0) + ' Cr' : '–' },
                    ].map((m) => (
                      <div key={m.label} className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                        <p className="text-slate-400 text-xs mb-1">{m.label}</p>
                        <p className="text-white font-semibold">{m.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <TradingPanel
                    symbol={selectedStock.symbol}
                    name={selectedStock.name ?? selectedStock.symbol}
                    currentPrice={prices[selectedStock.symbol]?.price ?? selectedStock.price ?? 0}
                    availableCash={summary?.virtualCash ?? 0}
                    availableShares={holdingForSelected?.qty ?? 0}
                    onTrade={reload}
                  />
                  <AIAnalysis symbol={selectedStock.symbol} name={selectedStock.name ?? selectedStock.symbol} />
                </div>
              </div>
            ) : (
              <div className="text-center py-24 text-slate-500">
                <LineChart size={48} className="mx-auto mb-4 opacity-30" />
                <p className="font-semibold text-lg text-slate-400">Search a stock or click one from the Dashboard</p>
                <p className="text-sm mt-1">Try: RELIANCE, TCS, INFY, HDFC, ICICI</p>
              </div>
            )}
          </div>
        )}

        {/* ══ PORTFOLIO TAB ══════════════════════════════════════════════════ */}
        {tab === 'portfolio' && (
          <div className="space-y-6">
            <h2 className="text-white font-bold text-lg">My Portfolio</h2>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Holdings table */}
              <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-700">
                  <h3 className="text-white font-semibold">Holdings</h3>
                </div>
                {liveHoldings.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    <Briefcase size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No holdings yet. Go to Markets to buy stocks.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          {['Stock', 'Qty', 'Avg Buy', 'LTP', 'P&L', 'Day', 'Action'].map((h) => (
                            <th key={h} className="text-left text-slate-500 text-xs px-4 py-2 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/30">
                        {liveHoldings.map((h) => (
                          <tr key={h.symbol} className="hover:bg-slate-700/20 transition-colors">
                            <td className="px-4 py-3">
                              <p className="text-white font-semibold">{h.symbol.replace('.NS', '')}</p>
                              <p className="text-slate-500 text-xs truncate max-w-[120px]">{h.name}</p>
                            </td>
                            <td className="px-4 py-3 text-slate-300">{h.qty}</td>
                            <td className="px-4 py-3 text-slate-300">{INR(h.avgBuyPrice)}</td>
                            <td className="px-4 py-3 text-white font-semibold">{INR(h.currentPrice)}</td>
                            <td className="px-4 py-3">
                              <p className={h.pnl >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                                {h.pnl >= 0 ? '+' : ''}{INR(h.pnl)}
                              </p>
                              <p className={`text-xs ${h.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {h.pnlPct >= 0 ? '+' : ''}{h.pnlPct.toFixed(2)}%
                              </p>
                            </td>
                            <td className="px-4 py-3"><Badge pct={h.dayChange ?? 0} /></td>
                            <td className="px-4 py-3">
                              <button onClick={() => { openStock(h.symbol); }} className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded-lg">
                                Trade
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Allocation pie */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-4">Allocation</h3>
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [INR(Number(v)), '']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-3">
                      {pieData.map((d, i) => (
                        <div key={d.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-slate-400">{d.name}</span>
                          </div>
                          <span className="text-white font-medium">{INR(d.value, 0)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-500 text-sm">Buy stocks to see allocation</div>
                )}
              </div>
            </div>

            {/* Transaction history */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl">
              <div className="px-5 py-4 border-b border-slate-700">
                <h3 className="text-white font-semibold">Transaction History</h3>
              </div>
              {transactions.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No transactions yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        {['Type', 'Stock', 'Qty', 'Price', 'Total', 'Date'].map((h) => (
                          <th key={h} className="text-left text-slate-500 text-xs px-4 py-2 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-bold px-2 py-1 rounded ${tx.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{tx.type}</span>
                          </td>
                          <td className="px-4 py-2.5 text-white font-medium">{tx.symbol.replace('.NS', '')}</td>
                          <td className="px-4 py-2.5 text-slate-300">{tx.qty}</td>
                          <td className="px-4 py-2.5 text-slate-300">{INR(tx.price)}</td>
                          <td className="px-4 py-2.5 text-white font-semibold">{INR(tx.total)}</td>
                          <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{new Date(tx.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ AI SIGNALS TAB ═════════════════════════════════════════════════ */}
        {tab === 'ai' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Brain size={20} className="text-purple-400" />
              <h2 className="text-white font-bold text-lg">AI Stock Signals</h2>
              <span className="text-slate-500 text-sm">· Powered by Groq Llama 3</span>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-300 text-sm">
              ⚠️ <strong>Disclaimer:</strong> AI signals are for educational purposes only and not financial advice. Always do your own research (DYOR) before investing. Past performance does not guarantee future returns.
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Analyse watchlist stocks */}
              {liveWatchlist.slice(0, 4).map((s) => (
                <AIAnalysis key={s.symbol} symbol={s.symbol} name={s.name ?? s.shortName ?? s.symbol} />
              ))}
            </div>

            {liveWatchlist.length === 0 && (
              <div className="text-center py-16 text-slate-500">
                <Brain size={48} className="mx-auto mb-4 opacity-30" />
                <p className="font-semibold">Add stocks to your watchlist to get AI signals</p>
                <p className="text-sm mt-1">Go to Dashboard → Watchlist → Search & add stocks</p>
              </div>
            )}

            {/* Search for any stock analysis */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-3">Analyse any NSE stock</h3>
              <StockSearch
                onSelect={(sym, name) => setSelectedStock({ symbol: sym, name })}
                placeholder="Search for any stock to analyse…"
                buttonLabel="Analyse"
              />
              {selectedStock && tab === 'ai' && (
                <div className="mt-4">
                  <AIAnalysis symbol={selectedStock.symbol} name={selectedStock.name} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
