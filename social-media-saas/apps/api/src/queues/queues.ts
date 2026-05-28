import { Queue, QueueOptions, type ConnectionOptions } from 'bullmq';
import { optionalEnv } from '../env';

export const dailyQueueName = 'daily-campaign-generation';
export const publishQueueName = 'platform-publishing';

export function redisConnection(): ConnectionOptions {
  const url = new URL(optionalEnv('REDIS_URL', 'redis://localhost:6379'));
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    maxRetriesPerRequest: null
  } as ConnectionOptions;
}

export function queueOptions(): QueueOptions {
  return {
    connection: redisConnection()
  };
}

export function createDailyQueue() {
  return new Queue(dailyQueueName, queueOptions());
}

export function createPublishQueue() {
  return new Queue(publishQueueName, queueOptions());
}
