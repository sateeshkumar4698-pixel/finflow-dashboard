import { Router } from 'express';
import { getQuote, getMultipleQuotes, getHistory, searchStocks, getIndices, NIFTY50_SYMBOLS } from '../services/marketService.js';

const router = Router();

// GET /api/market/indices
router.get('/indices', async (_req, res) => {
  try {
    const data = await getIndices();
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/market/nifty50
router.get('/nifty50', async (_req, res) => {
  try {
    const quotes = await getMultipleQuotes(NIFTY50_SYMBOLS.slice(0, 20));
    res.json(quotes);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/market/quote/:symbol
router.get('/quote/:symbol', async (req, res) => {
  try {
    const data = await getQuote(req.params.symbol);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/market/history/:symbol?range=1mo
router.get('/history/:symbol', async (req, res) => {
  try {
    const range = (req.query.range as string) || '1mo';
    const data = await getHistory(req.params.symbol, range as any);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/market/search?q=reliance
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    if (!q || q.length < 2) return res.json([]);
    const data = await searchStocks(q);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
