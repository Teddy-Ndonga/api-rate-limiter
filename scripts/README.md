# Redis Playground

This folder contains a small script for experimenting with Redis commands before implementing the rate limiter.

## Redis Commands

- **SET** — Stores a key-value pair in Redis.
- **GET** — Retrieves the value associated with a key.
- **INCR** — Increments a numeric value by one. Useful for counting API requests.
- **EXPIRE** — Sets a time-to-live (TTL) for a key, after which Redis automatically deletes it.
- **TTL** — Returns the remaining lifetime of a key in seconds.

## Implementation

The `redis-playground.ts` script demonstrates these commands:

1. **SET and GET:** Stores and retrieves a sample name.
2. **INCR:** Initializes a counter and increments it three times to simulate counting requests.
3. **EXPIRE and TTL:** Sets a 30-second expiration on a temporary key and checks its remaining lifetime.
4. **GET:** Retrieves the temporary value before it expires.

The script connects to Redis using `REDIS_URL`, falling back to `redis://localhost:6379` when the environment variable is not set. It also handles errors and closes the Redis connection when finished.

## Running the Script

Make sure Redis is running, then execute:

```bash
npm run redis:playground
```

The output shows the results of each command, helping demonstrate how Redis can store data, track request counts, and automatically expire keys—concepts used in the API rate limiter.