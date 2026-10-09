import type { Request, Response, NextFunction } from 'express';
import type { RedisClientType } from 'redis';

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
}

const RATE_LIMIT_SCRIPT = `
  local current = redis.call('INCR', KEYS[1])

  if current == 1 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
  end

  local ttl = redis.call('PTTL', KEYS[1])

  return { current, ttl }
`;

export function rateLimiter(
  redis: RedisClientType,
  options: RateLimiterOptions,
) {
  const { windowMs, maxRequests } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
      const key = `rate-limit:ip:${ip}`;

      const result = (await redis.eval(RATE_LIMIT_SCRIPT, {
        keys: [key],
        arguments: [String(windowMs)],
      })) as [number, number];

      const [current, ttl] = result;
      const remaining = Math.max(0, maxRequests - current);

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);

      if (current > maxRequests) {
        res.setHeader('Retry-After', Math.max(1, Math.ceil(ttl / 1000)));

        res.setHeader(
          'X-RateLimit-Reset',
          Math.ceil((Date.now() + ttl) / 1000),
        );

        res.status(429).json({
          error: 'Too Many Requests',
          message: 'You have exceeded the request limit. Try again later.',
          retryAfter: Math.max(1, Math.ceil(ttl / 1000)),
        });

        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
