import { Router } from 'express';
import { getQuote, getHistory, getMultipleQuotes } from '../services/marketService.js';
import { analyzeStock, getMarketSentiment } from '../services/aiService.js';

const router = Router();

// POST /api/ai/analyze  { symbol: 'RELIANCE.NS' }
router.post('/analyze', async (req, res) => {
  try {
    const { symbol } = req.body;
    if (!symbol) return res.status(400).json({ error: 'symbol required' });

    const [quote, history] = await Promise.all([
      getQuote(symbol),
      getHistory(symbol, '3mo'),
    ]);

    const analysis = await analyzeStock(quote, history);
    res.json(analysis);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/ai/sentiment  (analyses watchlist stocks)
router.get('/sentiment', async (req, res) => {
  try {
    const symbols = ((req.query.symbols as string) || '').split(',').filter(Boolean);
    if (!symbols.length) return res.status(400).json({ error: 'symbols query param required' });

    const quotes = await getMultipleQuotes(symbols);
    const sentiment = await getMarketSentiment(quotes);
    res.json({ sentiment, generatedAt: new Date().toISOString() });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
