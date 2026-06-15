import { Router } from 'express';
import { db, uuid } from '../db.js';
import { getQuote, getMultipleQuotes } from '../services/marketService.js';

const router = Router();

// GET /api/portfolio/summary
router.get('/summary', async (_req, res) => {
  try {
    await db.read();
    const { holdings, virtualCash, transactions } = db.data;

    let investedValue = 0;
    let currentValue = 0;

    if (holdings.length > 0) {
      const quotes = await getMultipleQuotes(holdings.map((h) => h.symbol));
      for (const h of holdings) {
        const q = quotes.find((q) => q.symbol === h.symbol);
        if (q) {
          investedValue += h.avgBuyPrice * h.qty;
          currentValue += q.price * h.qty;
        }
      }
    }

    const totalPortfolio = virtualCash + currentValue;
    const dayPnl = currentValue - investedValue;

    res.json({
      virtualCash,
      investedValue,
      currentValue,
      totalPortfolio,
      totalPnl: dayPnl,
      totalPnlPct: investedValue > 0 ? (dayPnl / investedValue) * 100 : 0,
      holdingsCount: holdings.length,
      transactionsCount: transactions.length,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/portfolio/holdings
router.get('/holdings', async (_req, res) => {
  try {
    await db.read();
    const { holdings } = db.data;
    if (!holdings.length) return res.json([]);

    const quotes = await getMultipleQuotes(holdings.map((h) => h.symbol));
    const enriched = holdings.map((h) => {
      const q = quotes.find((q) => q.symbol === h.symbol);
      const currentPrice = q?.price ?? h.avgBuyPrice;
      const currentValue = currentPrice * h.qty;
      const investedValue = h.avgBuyPrice * h.qty;
      const pnl = currentValue - investedValue;
      return {
        ...h,
        currentPrice,
        currentValue,
        investedValue,
        pnl,
        pnlPct: (pnl / investedValue) * 100,
        dayChange: q?.changePct ?? 0,
        name: q?.name ?? h.name,
      };
    });

    res.json(enriched);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/portfolio/transactions
router.get('/transactions', async (_req, res) => {
  await db.read();
  res.json(db.data.transactions.slice().reverse().slice(0, 50));
});

// GET /api/portfolio/watchlist
router.get('/watchlist', async (_req, res) => {
  try {
    await db.read();
    const { watchlist } = db.data;
    if (!watchlist.length) return res.json([]);
    const quotes = await getMultipleQuotes(watchlist.map((w) => w.symbol));
    res.json(quotes);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/portfolio/watchlist
router.post('/watchlist', async (req, res) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  await db.read();
  if (db.data.watchlist.find((w) => w.symbol === symbol)) {
    return res.status(409).json({ error: 'Already in watchlist' });
  }
  db.data.watchlist.push({ symbol, addedAt: new Date().toISOString() });
  await db.write();
  res.json({ ok: true });
});

// DELETE /api/portfolio/watchlist/:symbol
router.delete('/watchlist/:symbol', async (req, res) => {
  await db.read();
  db.data.watchlist = db.data.watchlist.filter((w) => w.symbol !== req.params.symbol);
  await db.write();
  res.json({ ok: true });
});

// POST /api/portfolio/buy
router.post('/buy', async (req, res) => {
  try {
    const { symbol, qty } = req.body;
    if (!symbol || !qty || qty <= 0) return res.status(400).json({ error: 'symbol and qty required' });

    const quote = await getQuote(symbol);
    const total = quote.price * qty;

    await db.read();
    if (db.data.virtualCash < total) {
      return res.status(400).json({ error: `Insufficient funds. Need ₹${total.toFixed(2)}, have ₹${db.data.virtualCash.toFixed(2)}` });
    }

    db.data.virtualCash -= total;

    const existing = db.data.holdings.find((h) => h.symbol === symbol);
    if (existing) {
      const totalQty = existing.qty + qty;
      existing.avgBuyPrice = (existing.avgBuyPrice * existing.qty + quote.price * qty) / totalQty;
      existing.qty = totalQty;
    } else {
      db.data.holdings.push({ symbol, name: quote.name, qty, avgBuyPrice: quote.price, boughtAt: new Date().toISOString() });
    }

    const tx: import('../db.js').Transaction = {
      id: uuid(),
      type: 'BUY',
      symbol,
      name: quote.name,
      qty,
      price: quote.price,
      total,
      timestamp: new Date().toISOString(),
    };
    db.data.transactions.push(tx);
    await db.write();

    res.json({ ok: true, transaction: tx, remainingCash: db.data.virtualCash });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/portfolio/sell
router.post('/sell', async (req, res) => {
  try {
    const { symbol, qty } = req.body;
    if (!symbol || !qty || qty <= 0) return res.status(400).json({ error: 'symbol and qty required' });

    await db.read();
    const holding = db.data.holdings.find((h) => h.symbol === symbol);
    if (!holding || holding.qty < qty) {
      return res.status(400).json({ error: `Not enough shares. You have ${holding?.qty ?? 0}` });
    }

    const quote = await getQuote(symbol);
    const total = quote.price * qty;

    db.data.virtualCash += total;
    holding.qty -= qty;
    if (holding.qty === 0) {
      db.data.holdings = db.data.holdings.filter((h) => h.symbol !== symbol);
    }

    const tx: import('../db.js').Transaction = {
      id: uuid(),
      type: 'SELL',
      symbol,
      name: quote.name,
      qty,
      price: quote.price,
      total,
      timestamp: new Date().toISOString(),
    };
    db.data.transactions.push(tx);
    await db.write();

    res.json({ ok: true, transaction: tx, remainingCash: db.data.virtualCash });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
