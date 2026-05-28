# Learning Centre

The Learning Centre UI starts a read-only public research ingestion run. Internally the system writes to `research_ingestion_runs`, `research_findings`, `executive_knowledge`, and `executive_intelligence_reports`.

## Setup

This project uses Supabase SQL migrations only. Do not use Prisma commands for Learning Centre setup.

Apply the SQL migration to the active Supabase database before starting a run:

- Supabase SQL Editor: open `supabase/migrations/20260527162207_learning_centre_research_ingestion.sql`, paste it into the SQL Editor, and run it against the live GOPU OS project.
- Supabase CLI: apply the same SQL migration to the linked project using the existing Supabase CLI workflow for this repository.

After the migration is applied, seed the executive topics:

```bash
npm run learning-centre:seed
```

Check setup health:

```bash
curl http://127.0.0.1:8787/api/learning-centre/setup
```

The setup check reports `migration_applied`, `missing_tables`, `redis_configured`, and `worker_ready`. The worker needs `REDIS_URL`; if it is missing, the worker refuses to start with a clear error.

## Start

Use the dashboard button or call:

```bash
curl -X POST http://127.0.0.1:8787/api/learning-centre/start
```

Run the worker separately:

```bash
npm run learning-centre:worker
```

## Stop

Use the dashboard button or call:

```bash
curl -X POST http://127.0.0.1:8787/api/learning-centre/stop
```

Setting `STOP_LEARNING_CENTRE=true` also stops the active run gracefully after the current job drains.

## Confidence Score

`confidence_score` is the model's self-assessment of source relevance and applicability. It is a soft signal only, not a verified truth score.

## Cost And Rate Limits

Each 15-minute cycle can use one web search call, one page fetch, one summarization call, and one embedding call. Tune `LEARNING_CENTRE_CYCLE_MINUTES`, `LEARNING_CENTRE_CONSOLIDATION_EVERY_N`, and provider limits before production use.
