import { useState, useRef, useEffect } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { api } from '../api/client';

interface Props {
  onSelect: (symbol: string, name: string) => void;
  placeholder?: string;
  buttonLabel?: string;
}

export default function StockSearch({ onSelect, placeholder = 'Search NSE stocks…', buttonLabel = 'Add' }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = (q: string) => {
    setQuery(q);
    clearTimeout(debounce.current);
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchStocks(q);
        setResults(data);
        setOpen(true);
      } catch {}
      setLoading(false);
    }, 350);
  };

  const select = (item: any) => {
    onSelect(item.symbol, item.name);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative w-full max-w-sm">
      <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 focus-within:border-indigo-500 transition-colors">
        <Search size={14} className="text-slate-400 shrink-0" />
        <input
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-slate-200 placeholder-slate-500 outline-none text-sm"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false); }}>
            <X size={13} className="text-slate-400 hover:text-white" />
          </button>
        )}
        {loading && <span className="text-slate-400 text-xs">…</span>}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => select(r)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-700 transition-colors text-left"
            >
              <div>
                <p className="text-white text-sm font-medium">{r.symbol.replace('.NS', '').replace('.BO', '')}</p>
                <p className="text-slate-400 text-xs truncate max-w-[200px]">{r.name}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>{r.exchange}</span>
                <Plus size={12} className="text-indigo-400" />
                <span className="text-indigo-400">{buttonLabel}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
