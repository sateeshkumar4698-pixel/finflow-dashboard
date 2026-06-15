import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL ?? 'http://localhost:4000', { transports: ['websocket'] });
  }
  return socket;
}

export function useSocket(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, any>>({});
  const [indices, setIndices] = useState<any[]>([]);
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;

  useEffect(() => {
    const s = getSocket();
    if (symbols.length) s.emit('subscribe', symbols);

    s.on('priceUpdate', (data: any[]) => {
      setPrices((prev) => {
        const next = { ...prev };
        data.forEach((q) => { next[q.symbol] = q; });
        return next;
      });
    });

    s.on('indexUpdate', (data: any[]) => {
      setIndices(data);
    });

    return () => {
      s.off('priceUpdate');
      s.off('indexUpdate');
    };
  }, [symbols.join(',')]);

  return { prices, indices };
}
