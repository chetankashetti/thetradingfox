export type Side = 'buy' | 'sell';

export interface Trade {
  id: string;
  symbol: string;
  side: Side;
  price: number;
  quantity: number;
  timestamp: string; // ISO 8601 string
}

export interface Lot {
  quantity: number;
  price: number;
}

export interface Position {
  symbol: string;
  quantity: number;
  avgEntryPrice: number | null;
  marketPrice?: number;
  realizedPnl?: number;
  unrealizedPnl?: number;
}

export interface PnlBySymbol {
  realized: number;
  unrealized: number;
}

export interface PnlResponse {
  method: 'FIFO';
  prices: Record<string, number>;
  realized: number;
  unrealized: number;
  bySymbol: Record<string, PnlBySymbol>;
}

