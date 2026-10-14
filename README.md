# API Rate Limiter

A Redis-backed API rate limiter built with Node.js, TypeScript, and Express. It uses a fixed-window algorithm to limit incoming requests by IP address, helping protect APIs against excessive traffic and abuse.

## Features

- **IP-based rate limiting** — tracks requests independently for each client IP address.
- **Redis-backed counters** — stores request counts in Redis for fast access.
- **Fixed-window algorithm** — uses atomic Redis operations to increment counters and set expiration times.
- **Configurable limits** — define the maximum number of requests and the time window.
- **Rate-limit headers** — returns headers describing the request limit and remaining quota.
- **HTTP 429 responses** — rejects requests that exceed the configured limit.
- **Retry information** — provides `Retry-After` and rate-limit reset information.
- **Failure handling** — supports configurable fail-open and fail-closed behavior when Redis operations fail.
- **Automated tests** — uses Vitest and Supertest to test API behavior and rate-limiting rules.

## Tech Stack

- Node.js
- TypeScript
- Express
- Redis
- Docker Compose
- Vitest
- Supertest
- ESLint and Prettier

## How It Works

The middleware identifies each incoming request by its client IP address and uses that IP to build a Redis key.

1. A request reaches the Express middleware.
2. The middleware increments the corresponding Redis counter.
3. Redis sets an expiration on the counter when the first request enters the window.
4. The middleware checks the request count against the configured limit.
5. Requests within the limit continue to the route handler.
6. Requests exceeding the limit receive an HTTP `429 Too Many Requests` response.

Redis executes the counter update and expiration logic through a Lua script, keeping those operations atomic.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Checks whether the API is running. |
| GET | `/api/test` | Demonstrates the rate limiter. |

### Health Check

**Request**

```http
GET /health
```

**Response — `200 OK`**

```json
{
  "status": "ok"
}
```

### Rate-Limited Endpoint

The demonstration endpoint is configured to allow five requests per IP address within a 60-second window.

**Request**

```http
GET /api/test
```

**Successful response — `200 OK`**

```json
{
  "message": "Request successful"
}
```

After the configured limit is exceeded, the middleware returns **`429 Too Many Requests`**.

```json
{
  "error": "Too Many Requests",
  "message": "You have exceeded the request limit. Try again later.",
  "retryAfter": 60
}
```

The `retryAfter` value represents the approximate number of seconds until the current window expires. Its exact value depends on when the request is made.

## Rate-Limit Headers

The middleware returns headers that allow clients to understand their current rate-limit status.

| Header | Description |
|---|---|
| `X-RateLimit-Limit` | Maximum number of requests allowed during the window. |
| `X-RateLimit-Remaining` | Number of requests remaining in the current window. |
| `Retry-After` | Approximate number of seconds to wait after the limit is exceeded. |
| `X-RateLimit-Reset` | Unix timestamp, in seconds, when the current window is expected to reset. |

## Getting Started

### Prerequisites

Make sure you have installed:

- Node.js and npm
- Docker Desktop with Docker Compose, or a running Redis instance
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Teddy-Ndonga/api-rate-limiter.git
cd api-rate-limiter
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
REDIS_URL=redis://localhost:6379
```

The application defaults to port `3000` and connects to Redis at `redis://localhost:6379` when these variables are not provided.

### 4. Start Redis

If the project includes a Docker Compose configuration for Redis, run:

```bash
docker compose up -d
```

Check that the Redis container is running:

```bash
docker compose ps
```

### 5. Start the API

Run the development command configured in `package.json`, for example:

```bash
npm run dev
```

The API should be available at:

- Health check: `http://localhost:3000/health`
- Rate-limited endpoint: `http://localhost:3000/api/test`

The exact development command depends on the scripts configured in the repository.

## Testing

The project uses Vitest for automated testing and Supertest for HTTP integration tests.

Run the test suite once:

```bash
npx vitest run
```

Or use the configured npm test script:

```bash
npm test
```

If `npm test` starts Vitest in watch mode, use `npx vitest run` for a single test run.

The test suite covers:

- Successful health-check responses.
- Requests allowed within the configured limit.
- Rejection of requests exceeding the limit.
- Rate-limit response headers.
- Request allowance after the window expires.
- Independent limits for different IP addresses.
- Fail-open and fail-closed behavior when Redis operations fail.

Redis must be available for tests that exercise the middleware.

## Redis Failure Handling

The middleware supports two failure modes when a Redis rate-limiting operation fails.

### Fail-closed

The default mode. Returns `503 Service Unavailable` when the middleware cannot perform the rate-limit check.

```ts
rateLimiter(redisClient, {
  windowMs: 60_000,
  maxRequests: 5,
  failureMode: 'closed',
});
```

This is appropriate when enforcing the rate limit is more important than allowing requests through without verification.

### Fail-open

Allows the request to proceed if Redis operations fail.

```ts
rateLimiter(redisClient, {
  windowMs: 60_000,
  maxRequests: 5,
  failureMode: 'open',
});
```

This can improve availability when Redis is temporarily unavailable, but requests may proceed without rate limiting during the failure.

## Project Structure

```text
api-rate-limiter/
├── src/
│   ├── middleware/
│   │   └── rateLimiter.ts
│   ├── redis/
│   │   └── client.ts
│   ├── app.ts
│   ├── app.test.ts
│   └── server.ts
├── scripts/
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

This structure describes the main application files; additional configuration and development files may also exist.

## Potential Improvements

Possible future enhancements include:

- API-key-based rate limiting.
- Configurable limits per route or client.
- Different rate-limiting algorithms, such as sliding windows or token buckets.
- Redis connection recovery and health monitoring.
- Rate-limit metrics and monitoring.
- Deployment and live API documentation.

## What This Project Demonstrates

This project demonstrates practical backend engineering concepts, including Express middleware, TypeScript, Redis data operations, atomic Lua scripts, HTTP status codes and headers, failure handling, Docker-based development, and automated integration testing.

