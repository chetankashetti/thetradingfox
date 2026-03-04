import { addTrade, resetTradesForTest } from '../src/storage/tradeStore';
import { computePnl } from '../src/domain/pnlService';
import { buildPortfolio } from '../src/domain/portfolioService';
import { Trade } from '../src/types';

function makeTrade(partial: Partial<Trade>): Trade {
  const base: Trade = {
    id: 't',
    symbol: 'BTC',
    side: 'buy',
    price: 1,
    quantity: 1,
    timestamp: new Date().toISOString()
  };
  return { ...base, ...partial };
}

describe('PnL logic', () => {
  beforeEach(() => {
    resetTradesForTest();
  });

  test('example scenario: two buys then one sell (FIFO)', () => {
    addTrade(
      makeTrade({
        id: '1',
        side: 'buy',
        price: 40000,
        quantity: 1,
        timestamp: '2021-01-01T00:00:00.000Z'
      })
    );
    addTrade(
      makeTrade({
        id: '2',
        side: 'buy',
        price: 42000,
        quantity: 1,
        timestamp: '2021-01-02T00:00:00.000Z'
      })
    );
    addTrade(
      makeTrade({
        id: '3',
        side: 'sell',
        price: 43000,
        quantity: 1,
        timestamp: '2021-01-03T00:00:00.000Z'
      })
    );

    const portfolio = buildPortfolio();
    const btc = portfolio.find(p => p.symbol === 'BTC');
    expect(btc).toBeDefined();
    expect(btc?.quantity).toBe(1);
    // After selling 1 BTC (FIFO), remaining lot is the 42k buy
    expect(Math.round((btc?.avgEntryPrice ?? 0) * 100) / 100).toBe(42000);

    const pnl = computePnl({ BTC: 44000 });
    // Realized = (43k - 40k) * 1 = 3k, unrealized = (44k - 42k) * 1 = 2k
    expect(pnl.realized).toBe(3000);
    expect(pnl.unrealized).toBe(2000);
  });

  test('empty portfolio has zero PnL', () => {
    const portfolio = buildPortfolio();
    expect(portfolio).toEqual([]);

    const pnl = computePnl();
    expect(pnl.realized).toBe(0);
    expect(pnl.unrealized).toBe(0);
    expect(pnl.bySymbol).toEqual({});
  });

  test('fully closed position has zero quantity and only realized PnL', () => {
    addTrade(
      makeTrade({
        id: '1',
        side: 'buy',
        price: 100,
        quantity: 2,
        timestamp: '2021-01-01T00:00:00.000Z'
      })
    );
    addTrade(
      makeTrade({
        id: '2',
        side: 'sell',
        price: 110,
        quantity: 2,
        timestamp: '2021-01-02T00:00:00.000Z'
      })
    );

    const portfolio = buildPortfolio();
    const btc = portfolio.find(p => p.symbol === 'BTC');
    expect(btc).toBeDefined();
    expect(btc?.quantity).toBe(0);
    expect(btc?.avgEntryPrice).toBeNull();
    expect(btc?.unrealizedPnl).toBe(0);

    const pnl = computePnl();
    expect(pnl.realized).toBe(20);
    expect(pnl.unrealized).toBe(0);
    expect(pnl.bySymbol.BTC.realized).toBe(20);
    expect(pnl.bySymbol.BTC.unrealized).toBe(0);
  });

  test('multiple symbols with separate realized and unrealized PnL', () => {
    // BTC: buy 1 at 40k, price now 42k => unrealized 2k
    addTrade(
      makeTrade({
        id: 'btc1',
        symbol: 'BTC',
        side: 'buy',
        price: 40000,
        quantity: 1,
        timestamp: '2021-01-01T00:00:00.000Z'
      })
    );
    // ETH: buy 2 at 2k, sell 1 at 2.2k, price now 2.1k
    addTrade(
      makeTrade({
        id: 'eth1',
        symbol: 'ETH',
        side: 'buy',
        price: 2000,
        quantity: 2,
        timestamp: '2021-01-01T00:00:00.000Z'
      })
    );
    addTrade(
      makeTrade({
        id: 'eth2',
        symbol: 'ETH',
        side: 'sell',
        price: 2200,
        quantity: 1,
        timestamp: '2021-01-02T00:00:00.000Z'
      })
    );

    const portfolio = buildPortfolio();
    const btc = portfolio.find(p => p.symbol === 'BTC');
    const eth = portfolio.find(p => p.symbol === 'ETH');

    expect(btc?.quantity).toBe(1);
    expect(eth?.quantity).toBe(1);

    const pnl = computePnl({ BTC: 42000, ETH: 2100 });

    // BTC: unrealized (42k - 40k) * 1 = 2k
    expect(pnl.bySymbol.BTC.unrealized).toBe(2000);
    // ETH: realized (2.2k - 2k) * 1 = 200
    expect(pnl.bySymbol.ETH.realized).toBe(200);
    // ETH: remaining 1 at entry 2k, price 2.1k => unrealized 100
    expect(pnl.bySymbol.ETH.unrealized).toBe(100);

    expect(pnl.realized).toBe(200);
    expect(pnl.unrealized).toBe(2100);
  });

  test('FIFO logic for partial sells across multiple lots', () => {
    // Buy 1 @ 10, buy 1 @ 20, sell 1 @ 15 -> realized (15 - 10) * 1 = 5
    addTrade(
      makeTrade({
        id: '1',
        symbol: 'BTC',
        side: 'buy',
        price: 10,
        quantity: 1,
        timestamp: '2021-01-01T00:00:00.000Z'
      })
    );
    addTrade(
      makeTrade({
        id: '2',
        symbol: 'BTC',
        side: 'buy',
        price: 20,
        quantity: 1,
        timestamp: '2021-01-02T00:00:00.000Z'
      })
    );
    addTrade(
      makeTrade({
        id: '3',
        symbol: 'BTC',
        side: 'sell',
        price: 15,
        quantity: 1,
        timestamp: '2021-01-03T00:00:00.000Z'
      })
    );

    const portfolio = buildPortfolio();
    const btc = portfolio.find(p => p.symbol === 'BTC');
    expect(btc?.quantity).toBe(1);

    const pnl = computePnl({ BTC: 25 });
    // realized = 5, unrealized = (25 - 20) * 1 = 5
    expect(pnl.bySymbol.BTC.realized).toBe(5);
    expect(pnl.bySymbol.BTC.unrealized).toBe(5);
  });

  test('price overrides are applied when computing PnL', () => {
    addTrade(
      makeTrade({
        id: '1',
        symbol: 'BTC',
        side: 'buy',
        price: 40000,
        quantity: 1,
        timestamp: '2021-01-01T00:00:00.000Z'
      })
    );

    const pnlBase = computePnl();
    const pnlOverride = computePnl({ BTC: 45000 });

    expect(pnlBase.bySymbol.BTC.unrealized).toBe(0);
    expect(pnlOverride.bySymbol.BTC.unrealized).toBe(5000);
  });

  test('pure long single symbol uses basePrices for unrealized PnL', () => {
    addTrade(
      makeTrade({
        id: '1',
        symbol: 'BTC',
        side: 'buy',
        price: 35000,
        quantity: 2,
        timestamp: '2021-01-01T00:00:00.000Z'
      })
    );

    const pnl = computePnl(); // uses basePrices.BTC = 40000
    // unrealized = (40k - 35k) * 2 = 10k, no realized since no sells
    expect(pnl.realized).toBe(0);
    expect(pnl.unrealized).toBe(10000);
    expect(pnl.bySymbol.BTC.realized).toBe(0);
    expect(pnl.bySymbol.BTC.unrealized).toBe(10000);
  });

  test('pure long multiple symbols aggregates unrealized PnL', () => {
    // BTC: buy 1 at 35k, base price 40k => +5k
    addTrade(
      makeTrade({
        id: 'btc1',
        symbol: 'BTC',
        side: 'buy',
        price: 35000,
        quantity: 1,
        timestamp: '2021-01-01T00:00:00.000Z'
      })
    );
    // ETH: buy 2 at 1500, base price 2k => (2k - 1.5k) * 2 = +1k
    addTrade(
      makeTrade({
        id: 'eth1',
        symbol: 'ETH',
        side: 'buy',
        price: 1500,
        quantity: 2,
        timestamp: '2021-01-01T00:00:00.000Z'
      })
    );

    const pnl = computePnl();
    expect(pnl.realized).toBe(0);
    expect(pnl.unrealized).toBe(6000); // 5k + 1k
    expect(pnl.bySymbol.BTC.unrealized).toBe(5000);
    expect(pnl.bySymbol.ETH.unrealized).toBe(1000);
  });

  test('realized loss with no remaining position', () => {
    addTrade(
      makeTrade({
        id: '1',
        symbol: 'BTC',
        side: 'buy',
        price: 100,
        quantity: 1,
        timestamp: '2021-01-01T00:00:00.000Z'
      })
    );
    addTrade(
      makeTrade({
        id: '2',
        symbol: 'BTC',
        side: 'sell',
        price: 90,
        quantity: 1,
        timestamp: '2021-01-02T00:00:00.000Z'
      })
    );

    const portfolio = buildPortfolio();
    const btc = portfolio.find(p => p.symbol === 'BTC');
    expect(btc?.quantity).toBe(0);
    expect(btc?.avgEntryPrice).toBeNull();

    const pnl = computePnl();
    expect(pnl.bySymbol.BTC.realized).toBe(-10);
    expect(pnl.bySymbol.BTC.unrealized).toBe(0);
    expect(pnl.realized).toBe(-10);
    expect(pnl.unrealized).toBe(0);
  });

  test('fully closed position with multiple lots and realized loss', () => {
    // Buy 1 @ 10, buy 1 @ 20, sell 2 @ 5 -> realized = (5 - 10) + (5 - 20) = -20
    addTrade(
      makeTrade({
        id: '1',
        symbol: 'BTC',
        side: 'buy',
        price: 10,
        quantity: 1,
        timestamp: '2021-01-01T00:00:00.000Z'
      })
    );
    addTrade(
      makeTrade({
        id: '2',
        symbol: 'BTC',
        side: 'buy',
        price: 20,
        quantity: 1,
        timestamp: '2021-01-02T00:00:00.000Z'
      })
    );
    addTrade(
      makeTrade({
        id: '3',
        symbol: 'BTC',
        side: 'sell',
        price: 5,
        quantity: 2,
        timestamp: '2021-01-03T00:00:00.000Z'
      })
    );

    const portfolio = buildPortfolio();
    const btc = portfolio.find(p => p.symbol === 'BTC');
    expect(btc?.quantity).toBe(0);
    expect(btc?.avgEntryPrice).toBeNull();

    const pnl = computePnl();
    expect(pnl.bySymbol.BTC.realized).toBe(-20);
    expect(pnl.bySymbol.BTC.unrealized).toBe(0);
    expect(pnl.realized).toBe(-20);
    expect(pnl.unrealized).toBe(0);
  });
});

