import { Worker } from "bullmq";
import { loadLocalEnv } from "../lib/learningCentreDb.mjs";
import { getRedisConnection, LEARNING_CENTRE_QUEUE } from "../lib/learningCentreQueue.mjs";
import { runResearchCycle } from "../lib/learningCentreCore.mjs";

loadLocalEnv();

const worker = new Worker(
  LEARNING_CENTRE_QUEUE,
  async (job) => {
    if (job.name !== "research-cycle") return { ok: false, status: "unknown_job" };
    return runResearchCycle(job.data.runId);
  },
  {
    connection: getRedisConnection(),
    concurrency: 1,
    lockDuration: 10 * 60 * 1000
  }
);

worker.on("completed", (job, result) => {
  console.log("[learning-centre-worker] completed", JSON.stringify({ jobId: job.id, result }));
});

worker.on("failed", (job, error) => {
  console.error("[learning-centre-worker] failed", JSON.stringify({ jobId: job?.id, error: error.message }));
});

process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});
