import express from 'express';
import { rateLimiter } from './middleware/rateLimiter.js';
import redisClient from './redis/client.js';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
  });
});

app.get(
  '/api/test',
  rateLimiter(redisClient, {
    windowMs: 60_000,
    maxRequests: 5,
  }),
  (_req, res) => {
    res.json({
      message: 'Request successful',
    });
  },
);

export default app;
