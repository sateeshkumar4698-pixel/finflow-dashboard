import { useState } from 'react';
import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, Target, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';

const SIGNAL_CONFIG = {
  'STRONG BUY': { color: '#10b981', bg: 'bg-emerald-500/15 border-emerald-500/30', icon: TrendingUp, label: '🚀 STRONG BUY' },
  'BUY':         { color: '#22c55e', bg: 'bg-green-500/15 border-green-500/30',   icon: TrendingUp, label: '✅ BUY' },
  'HOLD':        { color: '#f59e0b', bg: 'bg-amber-500/15 border-amber-500/30',   icon: Minus,      label: '⏸ HOLD' },
  'SELL':        { color: '#ef4444', bg: 'bg-red-500/15 border-red-500/30',       icon: TrendingDown, label: '⚠️ SELL' },
  'STRONG SELL': { color: '#dc2626', bg: 'bg-red-600/15 border-red-600/30',       icon: TrendingDown, label: '🔴 STRONG SELL' },
};

interface Props {
  symbol: string;
  name: string;
}

export default function AIAnalysis({ symbol, name }: Props) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.analyzeStock(symbol);
      setAnalysis(data);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const cfg = analysis ? SIGNAL_CONFIG[analysis.signal as keyof typeof SIGNAL_CONFIG] : null;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-purple-400" />
          <h3 className="text-white font-semibold">AI Analysis</h3>
          <span className="text-slate-500 text-xs">· Groq Llama 3</span>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium"
        >
          {loading ? '⏳ Analysing…' : '🤖 Analyse Now'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm mb-3">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {!analysis && !loading && !error && (
        <div className="text-center py-8 text-slate-500">
          <Brain size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Click "Analyse Now" to get AI-powered</p>
          <p className="text-sm">buy/sell recommendation for {name}</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 text-purple-400">
            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Llama 3 is analysing {name}…</span>
          </div>
        </div>
      )}

      {analysis && cfg && (
        <div className="space-y-4">
          {/* Signal */}
          <div className={`flex items-center justify-between p-4 rounded-xl border ${cfg.bg}`}>
            <div>
              <p className="text-xs text-slate-400 mb-1">Signal</p>
              <p className="text-xl font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 mb-1">Confidence</p>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${analysis.confidence}%`, background: cfg.color }} />
                </div>
                <span className="text-white text-sm font-bold">{analysis.confidence}%</span>
              </div>
            </div>
          </div>

          {/* Targets */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Target size={12} className="text-emerald-400" />
                <span className="text-emerald-400 text-xs font-medium">Target Price</span>
              </div>
              <p className="text-white font-bold">₹{analysis.targetPrice?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <ShieldCheck size={12} className="text-red-400" />
                <span className="text-red-400 text-xs font-medium">Stop Loss</span>
              </div>
              <p className="text-white font-bold">₹{analysis.stopLoss?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Reasoning */}
          <div className="bg-slate-700/40 rounded-xl p-3">
            <p className="text-slate-400 text-xs font-medium mb-2">Analysis</p>
            <p className="text-slate-200 text-sm leading-relaxed">{analysis.reasoning}</p>
            <p className="text-slate-500 text-xs mt-2">Time horizon: {analysis.timeHorizon}</p>
          </div>

          {/* Technical factors */}
          {analysis.technicalFactors?.length > 0 && (
            <div>
              <p className="text-slate-400 text-xs font-medium mb-2">Technical Factors</p>
              <div className="space-y-1">
                {analysis.technicalFactors.map((f: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    <span className="text-slate-300">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risks */}
          {analysis.risks?.length > 0 && (
            <div>
              <p className="text-slate-400 text-xs font-medium mb-2">Risks</p>
              <div className="space-y-1">
                {analysis.risks.map((r: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-amber-400 mt-0.5">⚠</span>
                    <span className="text-slate-300">{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-slate-600 text-xs text-right">
            Generated {new Date(analysis.generatedAt).toLocaleTimeString('en-IN')} · Not financial advice
          </p>
        </div>
      )}
    </div>
  );
}
