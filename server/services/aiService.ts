import Groq from 'groq-sdk';
import type { StockQuote } from './marketService.js';

let groq: Groq | null = null;

function getGroq(): Groq {
  if (!groq) {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY not set in .env');
    groq = new Groq({ apiKey: key });
  }
  return groq;
}

export interface AIAnalysis {
  symbol: string;
  signal: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG SELL';
  confidence: number;
  targetPrice: number;
  stopLoss: number;
  reasoning: string;
  technicalFactors: string[];
  risks: string[];
  timeHorizon: string;
  generatedAt: string;
}

export async function analyzeStock(quote: StockQuote, history: { close: number; volume: number }[]): Promise<AIAnalysis> {
  const closes = history.map((h) => h.close).filter((c) => c > 0);
  const vols = history.map((h) => h.volume).filter((v) => v > 0);

  // Calculate simple technicals to give AI context
  const sma20 = closes.length >= 20 ? closes.slice(-20).reduce((a, b) => a + b, 0) / 20 : closes[closes.length - 1];
  const sma50 = closes.length >= 50 ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50 : sma20;
  const avgVol = vols.length ? vols.reduce((a, b) => a + b, 0) / vols.length : 0;
  const volChange = vols.length && avgVol ? ((quote.volume - avgVol) / avgVol) * 100 : 0;

  // RSI approximation (14-day)
  let rsi = 50;
  if (closes.length >= 15) {
    const gains = [], losses = [];
    for (let i = closes.length - 14; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains.push(diff); else losses.push(Math.abs(diff));
    }
    const avgGain = gains.reduce((a, b) => a + b, 0) / 14;
    const avgLoss = losses.reduce((a, b) => a + b, 0) / 14;
    rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }

  const prompt = `You are an expert Indian stock market analyst specialising in NSE/BSE stocks.

Analyse this stock and give a clear trading recommendation:

**Stock:** ${quote.name} (${quote.symbol})
**Current Price:** ₹${quote.price.toFixed(2)}
**Change Today:** ${quote.change >= 0 ? '+' : ''}₹${quote.change.toFixed(2)} (${quote.changePct.toFixed(2)}%)
**Day Range:** ₹${quote.low.toFixed(2)} – ₹${quote.high.toFixed(2)}
**52W Range:** ₹${quote.week52Low.toFixed(2)} – ₹${quote.week52High.toFixed(2)}
**Volume:** ${(quote.volume / 100000).toFixed(2)}L (${volChange >= 0 ? '+' : ''}${volChange.toFixed(0)}% vs avg)
**P/E Ratio:** ${quote.peRatio.toFixed(2)}
**Market Cap:** ₹${(quote.marketCap / 10000000).toFixed(0)} Cr
**SMA 20:** ₹${sma20.toFixed(2)} | **SMA 50:** ₹${sma50.toFixed(2)}
**RSI (14):** ${rsi.toFixed(1)}
**Price vs SMA20:** ${((quote.price / sma20 - 1) * 100).toFixed(2)}%

Respond with ONLY a valid JSON object in exactly this format (no markdown, no extra text):
{
  "signal": "BUY",
  "confidence": 75,
  "targetPrice": 0,
  "stopLoss": 0,
  "reasoning": "2-3 sentence analysis",
  "technicalFactors": ["factor1", "factor2", "factor3"],
  "risks": ["risk1", "risk2"],
  "timeHorizon": "2-4 weeks"
}

Signal must be one of: STRONG BUY, BUY, HOLD, SELL, STRONG SELL
Confidence: 1-100 (how confident you are)
targetPrice and stopLoss must be realistic numbers in INR`;

  const completion = await getGroq().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 600,
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch?.[0] ?? '{}');

  return {
    symbol: quote.symbol,
    signal: parsed.signal ?? 'HOLD',
    confidence: parsed.confidence ?? 50,
    targetPrice: parsed.targetPrice ?? quote.price * 1.05,
    stopLoss: parsed.stopLoss ?? quote.price * 0.95,
    reasoning: parsed.reasoning ?? 'Analysis unavailable.',
    technicalFactors: parsed.technicalFactors ?? [],
    risks: parsed.risks ?? [],
    timeHorizon: parsed.timeHorizon ?? '1-2 weeks',
    generatedAt: new Date().toISOString(),
  };
}

export async function getMarketSentiment(quotes: StockQuote[]): Promise<string> {
  const gainers = quotes.filter((q) => q.changePct > 0).length;
  const losers = quotes.filter((q) => q.changePct < 0).length;
  const avgChange = quotes.reduce((s, q) => s + q.changePct, 0) / quotes.length;

  const prompt = `You are a senior SEBI-registered Indian market analyst.

Today's NSE market snapshot:
- Advancing stocks: ${gainers}/${quotes.length}
- Declining stocks: ${losers}/${quotes.length}
- Average change: ${avgChange.toFixed(2)}%
- Top gainers: ${quotes.sort((a, b) => b.changePct - a.changePct).slice(0, 3).map(q => `${q.symbol} +${q.changePct.toFixed(1)}%`).join(', ')}
- Top losers: ${quotes.sort((a, b) => a.changePct - b.changePct).slice(0, 3).map(q => `${q.symbol} ${q.changePct.toFixed(1)}%`).join(', ')}

Write a 3-sentence market sentiment summary in plain English. No markdown. Be direct and actionable.`;

  const completion = await getGroq().chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 200,
  });

  return completion.choices[0]?.message?.content ?? 'Market sentiment data unavailable.';
}
