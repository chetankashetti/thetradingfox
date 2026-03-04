## Portfolio & PnL Backend (Node + Express)

### Overview

This is a small backend service for a single user that:

- **Records trades** (`POST /trades`) with strong validation.
- **Lists trades** (`GET /trades`) for easy inspection.
- **Returns portfolio** (`GET /portfolio`) per symbol using FIFO cost basis.
- **Returns PnL** (`GET /pnl`) split into realized and unrealized, with optional price overrides.

Implementation uses **Node.js + Express + TypeScript**, with an in-memory store and simple JSON persistence (writable file path to be added if needed).

### Assumptions

- Single user; no authentication.
- FIFO cost basis.
- ISO 8601 timestamps.
- Trades are processed ordered by timestamp ascending, then insertion order.
- No short positions: attempts to sell more than the held quantity are rejected.

### Setup

1. Install dependencies (example):

   ```bash
   npm install express zod body-parser
   npm install --save-dev typescript ts-node-dev jest ts-jest @types/node @types/express
   ```

2. Initialize Jest (optional but recommended):

   ```bash
   npx ts-jest config:init
   ```

3. Build and run:

   ```bash
   npm run dev   # runs src/server.ts via ts-node-dev
   # or
   npm run build && npm start
   ```

4. Run tests:

   ```bash
   npm test
   ```

### API

#### POST `/trades`

- **Body**:

  ```json
  {
    "id": "1",
    "symbol": "BTC",
    "side": "buy",
    "price": 40000,
    "quantity": 1,
    "timestamp": "2021-01-01T00:00:00.000Z"
  }
  ```

- **Validation**:
  - All fields required.
  - `symbol` must be one of the known symbols in the price config.
  - `price` and `quantity` must be positive.
  - `side` must be `buy` or `sell`.
  - `timestamp` must be a valid ISO 8601 string.
- **Error codes**:
  - `INVALID_PAYLOAD` for schema errors.
  - `DUPLICATE_TRADE_ID` if `id` already exists.
  - `UNKNOWN_SYMBOL` if symbol is not known.
  - `INSUFFICIENT_POSITION` if selling more than currently held.

#### GET `/trades`

- Returns all trades, sorted by timestamp then insertion order.

#### GET `/portfolio`

- Returns current positions per symbol (shape similar to):

  ```json
  [
    {
      "symbol": "BTC",
      "quantity": 1,
      "avgEntryPrice": 41000,
      "marketPrice": 44000,
      "realizedPnl": 2000,
      "unrealizedPnl": 3000
    }
  ]
  ```

#### GET `/pnl`

- Base prices come from a fixed config, e.g. `{ "BTC": 40000, "ETH": 2000 }`.
- You can override prices via query params:

  ```bash
  curl "http://localhost:3000/pnl?BTC=44000&ETH=2100"
  ```

- Example response:

  ```json
  {
    "method": "FIFO",
    "prices": {
      "BTC": 44000,
      "ETH": 2000
    },
    "realized": 2000,
    "unrealized": 3000,
    "bySymbol": {
      "BTC": {
        "realized": 2000,
        "unrealized": 3000
      }
    }
  }
  ```

### End-to-end example

With the server running on `localhost:3000`, run:

```bash
curl -X POST http://localhost:3000/trades \
  -H "Content-Type: application/json" \
  -d '{"id":"1","symbol":"BTC","side":"buy","price":40000,"quantity":1,"timestamp":"2021-01-01T00:00:00.000Z"}'

curl -X POST http://localhost:3000/trades \
  -H "Content-Type: application/json" \
  -d '{"id":"2","symbol":"BTC","side":"buy","price":42000,"quantity":1,"timestamp":"2021-01-02T00:00:00.000Z"}'

curl -X POST http://localhost:3000/trades \
  -H "Content-Type: application/json" \
  -d '{"id":"3","symbol":"BTC","side":"sell","price":43000,"quantity":1,"timestamp":"2021-01-03T00:00:00.000Z"}'

curl http://localhost:3000/portfolio

curl "http://localhost:3000/pnl?BTC=44000"
```

Expected (conceptually):

- Portfolio: 1 BTC with average entry price 41,000.
- Realized PnL: +2,000.
- Unrealized PnL (BTC = 44,000): +3,000.

