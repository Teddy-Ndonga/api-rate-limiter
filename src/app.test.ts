import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from './app.js';
import redisClient from './redis/client.js';
import express from 'express';
import { rateLimiter } from './middleware/rateLimiter.js';

async function clearRateLimitKeys() {
  const keys: string[] = [];

  for await (const key of redisClient.scanIterator({
    MATCH: 'rate-limit:ip:*',
    COUNT: 100,
  })) {
    keys.push(...key);
  }

  if (keys.length > 0) {
    await redisClient.del(keys);
  }
}

function createLimiterTestApp(windowMs: number, maxRequests: number) {
  const testApp = express();

  // Trust forwarded IPs for isolated tests only.
  testApp.set('trust proxy', true);

  testApp.get(
    '/api/test',
    rateLimiter(redisClient, { windowMs, maxRequests }),
    (_req, res) => {
      res.json({ message: 'Request successful' });
    },
  );

  return testApp;
}

beforeAll(async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
});

beforeEach(async () => {
  await clearRateLimitKeys();
});

afterAll(async () => {
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
});

describe('Express app', () => {
  it('should return 200 from the health endpoint', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('IP-based rate limiter', () => {
  it('should allow the first five requests', async () => {
    for (let i = 0; i < 5; i++) {
      const response = await request(app).get('/api/test');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Request successful',
      });
    }
  });

  it('should reject the sixth request', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).get('/api/test');
    }

    const response = await request(app).get('/api/test');

    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Too Many Requests');
    expect(response.headers['retry-after']).toBeDefined();
  });

  it('should include rate-limit headers', async () => {
    const response = await request(app).get('/api/test');

    expect(response.status).toBe(200);
    expect(response.headers['x-ratelimit-limit']).toBe('5');
    expect(response.headers['x-ratelimit-remaining']).toBe('4');
  });

  it('should allow requests again after the window expires', async () => {
    const testApp = createLimiterTestApp(200, 1);

    const firstResponse = await request(testApp).get('/api/test');
    expect(firstResponse.status).toBe(200);

    const blockedResponse = await request(testApp).get('/api/test');
    expect(blockedResponse.status).toBe(429);

    // Wait for the 200ms window to expire.
    await new Promise((resolve) => setTimeout(resolve, 300));

    const nextResponse = await request(testApp).get('/api/test');
    expect(nextResponse.status).toBe(200);
  });

  it('should track request limits independently for each IP', async () => {
    const testApp = createLimiterTestApp(60_000, 1);

    const firstIp = '192.0.2.10';
    const secondIp = '192.0.2.20';

    const firstRequest = await request(testApp)
      .get('/api/test')
      .set('X-Forwarded-For', firstIp);

    expect(firstRequest.status).toBe(200);

    const blockedRequest = await request(testApp)
      .get('/api/test')
      .set('X-Forwarded-For', firstIp);

    expect(blockedRequest.status).toBe(429);

    const otherIpRequest = await request(testApp)
      .get('/api/test')
      .set('X-Forwarded-For', secondIp);

    expect(otherIpRequest.status).toBe(200);
  });
});
