import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
});

redis.on('error', (error) => {
  console.error('Redis error:', error);
});

async function main() {
  try {
    await redis.connect();

    console.log('\n--- Redis Playground ---');

    // 1. SET and GET
    await redis.set('playground:name', 'Teddy');

    const name = await redis.get('playground:name');
    console.log('SET / GET:', name);

    // 2. INCR
    await redis.set('playground:counter', '0');

    console.log('INCR:', await redis.incr('playground:counter'));
    console.log('INCR:', await redis.incr('playground:counter'));
    console.log('INCR:', await redis.incr('playground:counter'));

    // 3. EXPIRE and TTL
    await redis.set('playground:temporary', 'hello');
    await redis.expire('playground:temporary', 30);

    console.log('TTL:', await redis.ttl('playground:temporary'));

    // 4. Check the temporary value
    console.log('Temporary value:', await redis.get('playground:temporary'));
  } catch (error) {
    console.error('Experiment failed:', error);
    process.exitCode = 1;
  } finally {
    if (redis.isOpen) {
      await redis.quit();
    }
  }
}

main();
