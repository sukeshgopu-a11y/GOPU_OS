import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "./learningCentreDb.mjs";

export const LEARNING_CENTRE_QUEUE = "learning-centre-research-ingestion";

let connection;
let queue;

export function getRedisConnection() {
  const redisUrl = env("REDIS_URL");
  if (!redisUrl) throw new Error("REDIS_URL is missing. Learning Centre queue cannot start.");
  if (!connection) {
    connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });
  }
  return connection;
}

export function getLearningCentreQueue() {
  if (!queue) {
    queue = new Queue(LEARNING_CENTRE_QUEUE, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 30000 },
        removeOnComplete: 100,
        removeOnFail: 200
      }
    });
  }
  return queue;
}

export async function enqueueResearchCycle(runId, delayMs = 0) {
  const researchQueue = getLearningCentreQueue();
  return researchQueue.add("research-cycle", { runId }, {
    delay: Math.max(0, delayMs),
    jobId: `research-cycle-${runId}-${Date.now()}`
  });
}
