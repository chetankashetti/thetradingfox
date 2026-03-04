import { Trade } from '../types';
import { basePrices, knownSymbols } from '../config/prices';
import { addTrade, getAllTrades, StoredTrade } from '../storage/tradeStore';
import { DomainError } from './errors';

export function listTrades(): StoredTrade[] {
  return sortTrades(getAllTrades());
}

export function createTrade(input: Trade): StoredTrade {
  validateTrade(input);
  ensureNotDuplicateId(input.id);
  ensureKnownSymbol(input.symbol);
  ensureNoOversell(input);
  return addTrade(input);
}

function validateTrade(trade: Trade): void {
  if (!trade.id || !trade.symbol) {
    throw new DomainError('UNKNOWN_SYMBOL', 'id and symbol are required');
  }
  if (trade.side !== 'buy' && trade.side !== 'sell') {
    throw new DomainError('UNKNOWN_SYMBOL', 'side must be buy or sell');
  }
  if (!(trade.price > 0) || !(trade.quantity > 0)) {
    throw new DomainError('UNKNOWN_SYMBOL', 'price and quantity must be positive');
  }
  const d = new Date(trade.timestamp);
  if (isNaN(d.getTime())) {
    throw new DomainError('UNKNOWN_SYMBOL', 'timestamp must be a valid ISO 8601 string');
  }
}

function ensureNotDuplicateId(id: string): void {
  const existing = getAllTrades().find(t => t.id === id);
  if (existing) {
    throw new DomainError('DUPLICATE_TRADE_ID', `Trade with id ${id} already exists`);
  }
}

function ensureKnownSymbol(symbol: string): void {
  if (!knownSymbols.includes(symbol)) {
    throw new DomainError('UNKNOWN_SYMBOL', `Unknown symbol: ${symbol}`);
  }
}

function ensureNoOversell(trade: Trade): void {
  if (trade.side !== 'sell') return;
  const trades = sortTrades(getAllTrades());
  const currentQty = trades
    .filter(t => t.symbol === trade.symbol)
    .reduce((acc, t) => acc + (t.side === 'buy' ? t.quantity : -t.quantity), 0);
  if (trade.quantity > currentQty) {
    throw new DomainError(
      'INSUFFICIENT_POSITION',
      `Cannot sell ${trade.quantity} ${trade.symbol}; only ${currentQty} available`
    );
  }
}

export function sortTrades(trades: StoredTrade[]): StoredTrade[] {
  return trades
    .slice()
    .sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      if (ta !== tb) return ta - tb;
      return a._index - b._index;
    });
}

