// @ts-nocheck
import { agentHeartbeatJobs, agentLinkMap, tomorrowReminders } from "../../src/services/agentHeartbeatService.js";

export const config = { api: { bodyParser: false } };

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, message: "GET only" });
  }

  const byAgent = agentHeartbeatJobs.reduce((acc: Record<string, number>, job: any) => {
    acc[job.agent] = (acc[job.agent] || 0) + 1;
    return acc;
  }, {});

  return res.status(200).json({
    ok: true,
    mode: "Vercel cron + webhook heartbeat",
    generated_at: new Date().toISOString(),
    total_jobs: agentHeartbeatJobs.length,
    by_agent: byAgent,
    jobs: agentHeartbeatJobs,
    links: agentLinkMap,
    reminders: tomorrowReminders
  });
}
