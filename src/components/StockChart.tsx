import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api/client';

const RANGES = ['1d', '5d', '1mo', '3mo', '6mo', '1y'] as const;

interface Props {
  symbol: string;
  name: string;
  currentPrice?: number;
  changePct?: number;
}

export default function StockChart({ symbol, name, currentPrice, changePct }: Props) {
  const [range, setRange] = useState<typeof RANGES[number]>('1mo');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getHistory(symbol, range).then((h) => {
      setData(h.map((p: any) => ({
        ...p,
        date: new Date(p.date).toLocaleDateString('en-IN', {
          month: 'short', day: 'numeric',
          ...(range === '1d' ? { hour: '2-digit', minute: '2-digit' } : {}),
        }),
      })));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [symbol, range]);

  const isPositive = (changePct ?? 0) >= 0;
  const first = data[0]?.close;
  const last = data[data.length - 1]?.close;
  const chartPositive = last >= first;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">{symbol.replace('.NS', '').replace('.BO', '')}</p>
          <p className="text-white font-bold text-lg leading-tight">{name}</p>
          {currentPrice !== undefined && (
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-white">₹{currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? '▲' : '▼'} {Math.abs(changePct ?? 0).toFixed(2)}%
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${range === r ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-52 flex items-center justify-center text-slate-500 text-sm">Loading…</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartPositive ? '#10b981' : '#ef4444'} stopOpacity={0.25} />
                <stop offset="95%" stopColor={chartPositive ? '#10b981' : '#ef4444'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(1)}k`}
              width={55}
            />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
              formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 'Price']}
            />
            <Area type="monotone" dataKey="close" stroke={chartPositive ? '#10b981' : '#ef4444'} strokeWidth={2} fill="url(#chartGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
