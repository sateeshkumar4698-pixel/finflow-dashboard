import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import { portfolioHistory, stocks, allocation, transactions, stats } from '../data/mockData';

const SIGNAL_COLORS: Record<string, string> = {
  BUY: '#10b981',
  HOLD: '#f59e0b',
  SELL: '#ef4444',
};

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

function StatCard({ label, value, delta, up }: { label: string; value: string; delta: string; up: boolean }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">{label}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
      <p className={`text-sm font-medium mt-1 ${up ? 'text-emerald-400' : 'text-red-400'}`}>{delta} today</p>
    </div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'1W' | '1M' | '3M'>('1M');
  const sliced = activeTab === '1W' ? portfolioHistory.slice(-7) : activeTab === '1M' ? portfolioHistory : portfolioHistory.slice(-30);

  return (
    <div className="min-h-screen bg-[#0b0f1a]">
      {/* Nav */}
      <nav className="glass border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">F</div>
          <span className="text-white font-bold text-lg tracking-tight">FinFlow</span>
          <span className="text-slate-500 text-sm ml-2">Financial Analytics</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400 text-sm">Market Open</span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">SK</div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Main Charts Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Portfolio Chart */}
          <div className="lg:col-span-2 glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-white font-bold text-lg">Portfolio Performance</h2>
                <p className="text-slate-500 text-sm">30-day value tracking</p>
              </div>
              <div className="flex gap-1">
                {(['1W', '1M', '3M'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${activeTab === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={sliced}>
                <defs>
                  <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} interval={4} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ background: '#131929', border: '1px solid #1e2535', borderRadius: 8, color: '#e2e8f0' }}
                  formatter={(v) => [fmt.format(Number(v)), 'Portfolio']}
                />
                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} fill="url(#portfolioGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Allocation */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg mb-1">Asset Allocation</h2>
            <p className="text-slate-500 text-sm mb-4">By sector</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={allocation} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {allocation.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#131929', border: '1px solid #1e2535', borderRadius: 8 }} formatter={(v) => [`${v}%`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {allocation.map((a) => (
                <div key={a.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: a.color }} />
                    <span className="text-slate-400 text-sm">{a.name}</span>
                  </div>
                  <span className="text-white text-sm font-medium">{a.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Watchlist + Transactions */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Watchlist */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg mb-4">Watchlist</h2>
            <div className="space-y-3">
              {stocks.map((s) => (
                <div key={s.symbol} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-indigo-400">{s.symbol.slice(0, 2)}</div>
                    <div>
                      <p className="text-white text-sm font-semibold">{s.symbol}</p>
                      <p className="text-slate-500 text-xs">{s.shares} shares</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-semibold">${s.price.toFixed(2)}</p>
                    <p className={`text-xs font-medium ${s.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {s.change >= 0 ? '+' : ''}{s.pct.toFixed(2)}%
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-1 rounded"
                    style={{ color: SIGNAL_COLORS[s.signal], background: SIGNAL_COLORS[s.signal] + '22' }}
                  >
                    {s.signal}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Transactions */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg mb-4">Recent Transactions</h2>
            <div className="space-y-3">
              {transactions.map((t, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${t.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {t.type === 'BUY' ? '↑' : '↓'}
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">{t.symbol}</p>
                      <p className="text-slate-500 text-xs">{t.shares} shares @ ${t.price}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${t.type === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.type === 'BUY' ? '-' : '+'}${t.total.toFixed(2)}
                    </p>
                    <p className="text-slate-500 text-xs">{t.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="text-center text-slate-600 text-xs pb-4">
          FinFlow — built by{' '}
          <a href="https://github.com/sateeshkumar4698-pixel" className="text-indigo-400 hover:underline">
            Sateesh Kumar
          </a>{' '}
          · React + TypeScript + Recharts
        </footer>
      </div>
    </div>
  );
}
