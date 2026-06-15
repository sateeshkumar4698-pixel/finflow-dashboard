import { useState } from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';

interface Props {
  symbol: string;
  name: string;
  currentPrice: number;
  availableCash: number;
  availableShares?: number;
  onTrade: () => void;
}

export default function TradingPanel({ symbol, name, currentPrice, availableCash, availableShares = 0, onTrade }: Props) {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [qty, setQty] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const qty_n = parseInt(qty) || 0;
  const total = qty_n * currentPrice;
  const canBuy = side === 'BUY' && total > 0 && total <= availableCash;
  const canSell = side === 'SELL' && qty_n > 0 && qty_n <= availableShares;

  const execute = async () => {
    if (!qty_n || qty_n <= 0) return;
    setLoading(true);
    setResult(null);
    try {
      if (side === 'BUY') {
        await api.buy(symbol, qty_n);
        setResult({ ok: true, message: `Bought ${qty_n} shares of ${name} at ₹${currentPrice.toLocaleString('en-IN')}` });
      } else {
        await api.sell(symbol, qty_n);
        setResult({ ok: true, message: `Sold ${qty_n} shares of ${name} at ₹${currentPrice.toLocaleString('en-IN')}` });
      }
      setQty('');
      onTrade();
    } catch (e: any) {
      setResult({ ok: false, message: e.message });
    }
    setLoading(false);
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
      <h3 className="text-white font-semibold mb-4">Paper Trade</h3>

      {/* BUY / SELL toggle */}
      <div className="flex rounded-xl overflow-hidden border border-slate-700 mb-4">
        {(['BUY', 'SELL'] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setSide(s); setResult(null); }}
            className={`flex-1 py-2.5 text-sm font-bold transition-colors ${
              side === s
                ? s === 'BUY' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {s === 'BUY' ? '↑ BUY' : '↓ SELL'}
          </button>
        ))}
      </div>

      {/* Stock info */}
      <div className="flex items-center justify-between mb-4 py-2 border-b border-slate-700">
        <div>
          <p className="text-white text-sm font-semibold">{symbol.replace('.NS', '').replace('.BO', '')}</p>
          <p className="text-slate-500 text-xs">{name}</p>
        </div>
        <div className="text-right">
          <p className="text-white font-bold">₹{currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          <p className="text-slate-400 text-xs">Market price</p>
        </div>
      </div>

      {/* Quantity input */}
      <div className="mb-4">
        <label className="text-slate-400 text-xs font-medium block mb-1.5">Quantity (shares)</label>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="0"
            className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
          />
          {side === 'BUY' && (
            <button
              onClick={() => setQty(String(Math.floor(availableCash / currentPrice)))}
              className="text-xs text-indigo-400 border border-indigo-500/30 px-2 rounded-lg hover:bg-indigo-500/10 whitespace-nowrap"
            >
              Max
            </button>
          )}
          {side === 'SELL' && availableShares > 0 && (
            <button
              onClick={() => setQty(String(availableShares))}
              className="text-xs text-red-400 border border-red-500/30 px-2 rounded-lg hover:bg-red-500/10 whitespace-nowrap"
            >
              All
            </button>
          )}
        </div>
      </div>

      {/* Order summary */}
      {qty_n > 0 && (
        <div className="bg-slate-700/40 rounded-xl p-3 mb-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>Price per share</span><span className="text-white">₹{currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Quantity</span><span className="text-white">{qty_n}</span>
          </div>
          <div className="flex justify-between font-bold pt-1 border-t border-slate-600">
            <span className="text-slate-300">Total</span>
            <span className={total > availableCash && side === 'BUY' ? 'text-red-400' : 'text-white'}>
              ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* Available info */}
      <div className="flex justify-between text-xs text-slate-500 mb-4">
        <span>Cash available: ₹{availableCash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
        {availableShares > 0 && <span>Holdings: {availableShares} shares</span>}
      </div>

      {/* Execute button */}
      <button
        onClick={execute}
        disabled={loading || (side === 'BUY' ? !canBuy : !canSell)}
        className={`w-full py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-40 ${
          side === 'BUY'
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
            : 'bg-red-600 hover:bg-red-500 text-white'
        }`}
      >
        {loading ? 'Executing…' : `${side === 'BUY' ? 'Buy' : 'Sell'} ${qty_n || 0} shares`}
      </button>

      {/* Result */}
      {result && (
        <div className={`flex items-start gap-2 mt-3 p-3 rounded-xl text-sm ${result.ok ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
          {result.ok ? <Check size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
          {result.message}
        </div>
      )}
    </div>
  );
}
