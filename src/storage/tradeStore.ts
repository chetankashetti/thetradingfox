import { Trade } from '../types';

const trades: StoredTrade[] = [];

let nextIndex = 0;

export interface StoredTrade extends Trade {
  _index: number;
}

export function addTrade(trade: Trade): StoredTrade {
  const stored: StoredTrade = { ...trade, _index: nextIndex++ };
  trades.push(stored);
  return stored;
}

export function getAllTrades(): StoredTrade[] {
  return trades.slice();
}

// Intended for use in tests only to reset the in-memory store
export function resetTradesForTest(): void {
  trades.length = 0;
  nextIndex = 0;
}

