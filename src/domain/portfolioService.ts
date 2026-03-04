import { Lot, Position } from '../types';
import { getAllTrades, StoredTrade } from '../storage/tradeStore';
import { basePrices } from '../config/prices';
import { sortTrades } from './tradeService';

interface LotsState {
  lots: Lot[];
  realized: number;
}

export function buildPortfolio(): Position[] {
  const trades = sortTrades(getAllTrades());
  const bySymbol = new Map<string, LotsState>();

  for (const trade of trades) {
    const state = bySymbol.get(trade.symbol) ?? { lots: [], realized: 0 };
    if (trade.side === 'buy') {
      state.lots.push({ quantity: trade.quantity, price: trade.price });
    } else {
      let remaining = trade.quantity;
      while (remaining > 0 && state.lots.length > 0) {
        const lot = state.lots[0];
        const useQty = Math.min(remaining, lot.quantity);
        state.realized += (trade.price - lot.price) * useQty;
        lot.quantity -= useQty;
        remaining -= useQty;
        if (lot.quantity === 0) {
          state.lots.shift();
        }
      }
    }
    bySymbol.set(trade.symbol, state);
  }

  const positions: Position[] = [];
  for (const [symbol, state] of bySymbol) {
    const totalQty = state.lots.reduce((sum, lot) => sum + lot.quantity, 0);
    const price = basePrices[symbol];
    if (totalQty === 0) {
      positions.push({
        symbol,
        quantity: 0,
        avgEntryPrice: null,
        marketPrice: price,
        realizedPnl: state.realized,
        unrealizedPnl: 0
      });
      continue;
    }

    const totalCost = state.lots.reduce((sum, lot) => sum + lot.price * lot.quantity, 0);
    const avgEntryPrice = totalCost / totalQty;
    const marketPrice = price;
    const unrealizedPnl = state.lots.reduce(
      (sum, lot) => sum + (marketPrice - lot.price) * lot.quantity,
      0
    );

    positions.push({
      symbol,
      quantity: totalQty,
      avgEntryPrice,
      marketPrice,
      realizedPnl: state.realized,
      unrealizedPnl
    });
  }

  return positions;
}

