import { createTrade, listTrades } from '../src/domain/tradeService';
import { resetTradesForTest } from '../src/storage/tradeStore';
import { DomainError } from '../src/domain/errors';
import { Trade } from '../src/types';

function makeTrade(partial: Partial<Trade> = {}): Trade {
  const base: Trade = {
    id: 't1',
    symbol: 'BTC',
    side: 'buy',
    price: 40000,
    quantity: 1,
    timestamp: '2021-01-01T00:00:00.000Z'
  };
  return { ...base, ...partial };
}

describe('tradeService.createTrade and listTrades', () => {
  beforeEach(() => {
    resetTradesForTest();
  });

  test('creates a valid buy trade and lists it', () => {
    const created = createTrade(makeTrade({ id: 'a' }));
    expect(created.id).toBe('a');

    const all = listTrades();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('a');
  });

  test('sorts trades by timestamp then insertion index', () => {
    const t1 = createTrade(makeTrade({ id: '1', timestamp: '2021-01-01T00:00:00.000Z' }));
    const t2 = createTrade(makeTrade({ id: '2', timestamp: '2021-01-01T00:00:00.000Z' }));
    const t3 = createTrade(makeTrade({ id: '3', timestamp: '2021-01-02T00:00:00.000Z' }));

    const all = listTrades();
    expect(all.map(t => t.id)).toEqual([t1.id, t2.id, t3.id]);
  });

  test('rejects duplicate trade id', () => {
    createTrade(makeTrade({ id: 'dup' }));
    expect(() => createTrade(makeTrade({ id: 'dup' }))).toThrow(DomainError);
    try {
      createTrade(makeTrade({ id: 'dup' }));
    } catch (err) {
      const e = err as DomainError;
      expect(e.code).toBe('DUPLICATE_TRADE_ID');
    }
  });

  test('rejects unknown symbol', () => {
    expect(() =>
      createTrade(makeTrade({ symbol: 'DOGE' }))
    ).toThrow(DomainError);
    try {
      createTrade(makeTrade({ symbol: 'DOGE' }));
    } catch (err) {
      const e = err as DomainError;
      expect(e.code).toBe('UNKNOWN_SYMBOL');
    }
  });

  test('rejects invalid side', () => {
    // @ts-expect-error testing runtime validation
    const badTrade: Trade = { ...makeTrade(), side: 'hold' };
    expect(() => createTrade(badTrade)).toThrow(DomainError);
  });

  test('rejects non-positive price or quantity', () => {
    expect(() => createTrade(makeTrade({ price: 0 }))).toThrow(DomainError);
    expect(() => createTrade(makeTrade({ quantity: 0 }))).toThrow(DomainError);
  });

  test('rejects invalid timestamp', () => {
    expect(() =>
      createTrade(makeTrade({ timestamp: 'not-a-date' }))
    ).toThrow(DomainError);
  });

  test('prevents overselling more than current position', () => {
    createTrade(makeTrade({ id: 'b1', side: 'buy', quantity: 1 }));
    expect(() =>
      createTrade(makeTrade({ id: 's1', side: 'sell', quantity: 2 }))
    ).toThrow(DomainError);
    try {
      createTrade(makeTrade({ id: 's1', side: 'sell', quantity: 2 }));
    } catch (err) {
      const e = err as DomainError;
      expect(e.code).toBe('INSUFFICIENT_POSITION');
    }
  });

  test('allows selling up to the current position quantity', () => {
    createTrade(makeTrade({ id: 'b1', side: 'buy', quantity: 2 }));
    const sell = createTrade(makeTrade({ id: 's1', side: 'sell', quantity: 2 }));
    expect(sell.side).toBe('sell');
    const all = listTrades();
    expect(all).toHaveLength(2);
  });

  test('listTrades returns empty array when there are no trades', () => {
    const all = listTrades();
    expect(all).toEqual([]);
  });

  test('rejects trade with missing id or symbol', () => {
    // Missing id
    expect(() => createTrade({ ...makeTrade(), id: '' })).toThrow(DomainError);

    // Missing symbol
    expect(() => createTrade({ ...makeTrade(), symbol: '' })).toThrow(DomainError);
  });

  test('oversell checks are per symbol, not global', () => {
    // Long 2 BTC
    createTrade(makeTrade({ id: 'btc1', symbol: 'BTC', side: 'buy', quantity: 2 }));
    // No ETH position, so selling any ETH should fail
    expect(() =>
      createTrade(makeTrade({ id: 'ethSell', symbol: 'ETH', side: 'sell', quantity: 1 }))
    ).toThrow(DomainError);
  });
});

