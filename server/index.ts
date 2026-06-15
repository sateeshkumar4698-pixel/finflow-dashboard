import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initDB, db } from './db.js';
import marketRouter from './routes/market.js';
import portfolioRouter from './routes/portfolio.js';
import aiRouter from './routes/ai.js';
import { getMultipleQuotes } from './services/marketService.js';

const app = express();
const httpServer = createServer(app);
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'https://sateeshkumar4698-pixel.github.io',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true },
});

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use('/api/market', marketRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/ai', aiRouter);

// ── Real-time price ticker via WebSocket ────────────────────────────────────
let priceInterval: ReturnType<typeof setInterval> | null = null;

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('subscribe', (symbols: string[]) => {
    console.log('📈 Subscribing to:', symbols);
    socket.data.symbols = symbols;
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

async function broadcastPrices() {
  const allSymbols = new Set<string>();
  for (const [, socket] of io.sockets.sockets) {
    (socket.data.symbols ?? []).forEach((s: string) => allSymbols.add(s));
  }
  if (!allSymbols.size) return;

  try {
    const quotes = await getMultipleQuotes([...allSymbols]);
    io.emit('priceUpdate', quotes);
  } catch {
    // silently skip — market may be closed
  }
}

// Poll prices every 15 seconds (Yahoo Finance rate limit friendly)
priceInterval = setInterval(broadcastPrices, 15_000);

// ── Nifty 50 index ticker every 30s ─────────────────────────────────────────
setInterval(async () => {
  try {
    const quotes = await getMultipleQuotes(['^NSEI', '^BSESN']);
    io.emit('indexUpdate', quotes);
  } catch {}
}, 30_000);

const PORT = process.env.PORT ?? 4000;
httpServer.listen(PORT, async () => {
  await initDB();
  console.log(`\n🚀 FinFlow API server running at http://localhost:${PORT}`);
  console.log(`📊 Market data: Yahoo Finance NSE`);
  console.log(`🤖 AI: Groq Llama 3 (${process.env.GROQ_API_KEY ? '✅ key loaded' : '⚠️  no GROQ_API_KEY in .env'})`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /api/market/indices`);
  console.log(`  GET  /api/market/nifty50`);
  console.log(`  GET  /api/market/quote/:symbol`);
  console.log(`  GET  /api/market/history/:symbol?range=1mo`);
  console.log(`  GET  /api/market/search?q=reliance`);
  console.log(`  GET  /api/portfolio/summary`);
  console.log(`  GET  /api/portfolio/holdings`);
  console.log(`  GET  /api/portfolio/watchlist`);
  console.log(`  POST /api/portfolio/buy  { symbol, qty }`);
  console.log(`  POST /api/portfolio/sell { symbol, qty }`);
  console.log(`  POST /api/ai/analyze     { symbol }`);
  console.log(`  GET  /api/ai/sentiment?symbols=...`);
});

export { io };
