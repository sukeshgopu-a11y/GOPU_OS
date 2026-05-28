import { loadLocalEnv } from "../lib/learningCentreDb.mjs";
import { startResearchIngestionRun } from "../lib/learningCentreCore.mjs";

loadLocalEnv();

try {
  const run = await startResearchIngestionRun();
  console.log(JSON.stringify({ ok: true, run }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, status: error.statusCode || 500, message: error.message }, null, 2));
  process.exit(error.statusCode === 409 ? 0 : 1);
}
