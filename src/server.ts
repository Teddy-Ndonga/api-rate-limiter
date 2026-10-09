import app from './app.js';
import redisClient from './redis/client.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await redisClient.connect();

    console.log('Connected to Redis');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
