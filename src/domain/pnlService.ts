import { PnlBySymbol, PnlResponse } from '../types';
import { buildPortfolio } from './portfolioService';
import { basePrices } from '../config/prices';

export function computePnl(overrides: Record<string, number> = {}): PnlResponse {
  const effectivePrices: Record<string, number> = { ...basePrices, ...overrides };
  const positions = buildPortfolio();

  let totalRealized = 0;
  let totalUnrealized = 0;
  const bySymbol: Record<string, PnlBySymbol> = {};

  for (const pos of positions) {
    const price = effectivePrices[pos.symbol] ?? pos.marketPrice ?? 0;
    const realized = pos.realizedPnl ?? 0;
    const unrealized =
      pos.quantity && pos.avgEntryPrice != null
        ? (price - pos.avgEntryPrice) * pos.quantity
        : 0;

    totalRealized += realized;
    totalUnrealized += unrealized;

    bySymbol[pos.symbol] = {
      realized,
      unrealized
    };
  }

  return {
    method: 'FIFO',
    prices: effectivePrices,
    realized: totalRealized,
    unrealized: totalUnrealized,
    bySymbol
  };
}

