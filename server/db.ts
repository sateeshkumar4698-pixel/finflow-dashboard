import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';

const __dir = dirname(fileURLToPath(import.meta.url));

export interface Holding {
  symbol: string;
  name: string;
  qty: number;
  avgBuyPrice: number;
  boughtAt: string;
}

export interface Transaction {
  id: string;
  type: 'BUY' | 'SELL';
  symbol: string;
  name: string;
  qty: number;
  price: number;
  total: number;
  timestamp: string;
}

export interface WatchlistItem {
  symbol: string;
  addedAt: string;
}

interface DB {
  virtualCash: number;
  holdings: Holding[];
  transactions: Transaction[];
  watchlist: WatchlistItem[];
}

const defaultData: DB = {
  virtualCash: 1_000_000, // ₹10 Lakh starting capital
  holdings: [],
  transactions: [],
  watchlist: [
    { symbol: 'RELIANCE.NS', addedAt: new Date().toISOString() },
    { symbol: 'TCS.NS', addedAt: new Date().toISOString() },
    { symbol: 'HDFCBANK.NS', addedAt: new Date().toISOString() },
    { symbol: 'INFY.NS', addedAt: new Date().toISOString() },
    { symbol: 'ICICIBANK.NS', addedAt: new Date().toISOString() },
  ],
};

const adapter = new JSONFile<DB>(join(__dir, '../data/db.json'));
export const db = new Low<DB>(adapter, defaultData);

export async function initDB() {
  await db.read();
  db.data ||= defaultData;
  await db.write();
  console.log('📦 Database ready. Virtual cash: ₹' + db.data.virtualCash.toLocaleString('en-IN'));
}

export { uuid };
