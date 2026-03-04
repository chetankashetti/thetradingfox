import express, { Request, Response, NextFunction } from 'express';
import { json } from 'body-parser';
import { z } from 'zod';
import { Trade } from './types';
import { errorHandler } from './middleware/errorHandler';
import { validateBody } from './middleware/validate';
import { createTrade, listTrades } from './domain/tradeService';
import { buildPortfolio } from './domain/portfolioService';
import { computePnl } from './domain/pnlService';

const app = express();
app.use(json());

const TradeInputSchema = z.object({
  id: z.string().min(1),
  symbol: z.string().min(1),
  side: z.enum(['buy', 'sell']),
  price: z.number().positive(),
  quantity: z.number().positive(),
  timestamp: z.string().datetime()
});

app.post(
  '/trades',
  validateBody<Trade>(TradeInputSchema),
  (req: Request, res: Response, next: NextFunction) => {
  try {
    const trade = req.body as Trade;
    const stored = createTrade(trade);
    res.status(201).json(stored);
  } catch (err) {
    next(err);
  }
  }
);

app.get('/trades', (_req: Request, res: Response) => {
  res.json(listTrades());
});

app.get('/portfolio', (_req: Request, res: Response) => {
  const portfolio = buildPortfolio();
  res.json(portfolio);
});

app.get('/pnl', (req: Request, res: Response) => {
  const overrides: Record<string, number> = {};
  for (const [key, value] of Object.entries(req.query)) {
    const num = Number(value);
    if (!isNaN(num)) {
      overrides[key] = num;
    }
  }
  const pnl = computePnl(overrides);
  res.json(pnl);
});

app.use(errorHandler);

const port = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

export default app;

