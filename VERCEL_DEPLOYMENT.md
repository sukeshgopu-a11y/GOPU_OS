# GOPU OS Vercel Production Deployment

Production runtime target:
- Vercel for the frontend and serverless API routes.
- Supabase Postgres/Auth for database and authentication.
- Upstash Redis or another external Redis for queues/workers.
- Supabase Storage for object storage.
- Slack incoming webhook for alerts.
- OpenAI for AI generation.
- Meta for Facebook/Instagram integrations.
- LinkedIn is optional.

Docker is not required for production/runtime. Keep Docker files only for optional local development or for a separately hosted worker service.

## Vercel Env Vars

Set these in Vercel Project Settings -> Environment Variables.

Frontend-safe:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Server-side only:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
CRON_TRIGGER_WINDOW_MINUTES=5
RESEND_API_KEY=
RESEND_FROM_EMAIL=
LEAD_ADMIN_EMAIL=
SLACK_WEBHOOK_URL=
OPENAI_API_KEY=
REDIS_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
SUPABASE_STORAGE_BUCKET=cmo-generated-assets
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=
META_PAGE_ID=
META_INSTAGRAM_BUSINESS_ACCOUNT_ID=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_ORGANIZATION_URN=
```

Do not create `VITE_` variables for service role keys, Resend keys, Slack webhooks, optional R2 secrets, OpenAI keys, Meta secrets, or LinkedIn secrets.

## Supabase Setup

1. Apply all Supabase migrations in `supabase/migrations`.
2. Confirm RLS is enabled on production tables.
3. Confirm `cmo_posting_settings` includes:
   - `timezone`
   - `local_post_time`
   - `schedule_mode`
   - `schedule_days`
   - `trigger_window_minutes`
   - `last_triggered_at_utc`
4. Confirm `cmo_schedule_triggers` exists.
5. Create or verify founder/admin users in Supabase Auth.
6. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only to Vercel server env.

The Vercel cron endpoint uses the service role key server-side so it can read schedule settings safely without exposing privileged credentials to the frontend.

## Supabase Storage Setup

Supabase Storage is the official GOPU OS storage provider. Use the `cmo-generated-assets` bucket for:
- poster assets
- generated images
- approval previews
- published post media

Set the bucket name in server/runtime env:

```bash
SUPABASE_STORAGE_BUCKET=cmo-generated-assets
```

The storage layer should upload generated assets to Supabase Storage and use Supabase public object URLs for previews and downstream publishing payloads. Future Step 4 verification should log:
- `storage_upload_test_started`
- `storage_upload_test_succeeded`
- `storage_upload_test_failed`

Historical `r2_upload_*` audit logs should remain untouched as old verification records.

## Upstash Redis Setup

Use Upstash Redis or another managed Redis reachable from production workers.

For BullMQ workers, prefer the Redis TCP URL:

```bash
REDIS_URL=rediss://default:<password>@<host>:<port>
```

The existing BullMQ worker flow in `social-media-saas/apps/api/src/worker` should run as a separate long-running worker process, not inside Vercel serverless functions.

Vercel Cron should only trigger schedule checks. It should not run long workers, browser automation, video rendering, publishing loops, or retry processors.

Recommended production worker hosts:
- Railway worker service
- Render background worker
- Fly.io machine
- ECS/Fargate task
- Any VM/container runner with persistent process support

## Optional Future Cloudflare R2 Setup

R2 is optional/future only. Do not treat R2 credentials as required while Supabase Storage is the active provider.

If GOPU OS is intentionally migrated to R2 later, set server-side env:

```bash
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_PUBLIC_BASE_URL=
```

Use S3-compatible SDK configuration in backend/worker code. Do not expose R2 secret keys client-side.

## Slack Webhook Setup

1. Create a Slack incoming webhook for the founder/operations channel.
2. Add it to Vercel as `SLACK_WEBHOOK_URL`.
3. Do not commit the webhook value.
4. Verify using the server route or existing Slack test script.

Slack failures must remain non-blocking for core GOPU OS actions.

## Meta Setup

For Facebook/Instagram publishing and metrics:

```bash
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=
META_PAGE_ID=
META_INSTAGRAM_BUSINESS_ACCOUNT_ID=
```

Use production app review and permission approval before enabling live publishing. Keep founder approval gates before posting.

## LinkedIn Optional Setup

LinkedIn is optional. If enabled, configure:

```bash
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_ORGANIZATION_URN=
```

If these are empty, LinkedIn should remain disabled or approval-queue-only.

## Cron Setup

`vercel.json` defines:

```json
{
  "crons": [
    {
      "path": "/api/cron/content-scheduler",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

The endpoint is:

```text
/api/cron/content-scheduler
```

Behavior:
- Checks `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is configured.
- Reads `cmo_posting_settings` from Supabase.
- Uses each row's selected IANA timezone.
- Converts the local scheduled day/time to UTC.
- Decides due schedules using UTC-normalized logic.
- Does not rely on Vercel timezone.
- Does not rely on browser/device timezone.
- Inserts due rows into `cmo_schedule_triggers`.
- Updates `last_triggered_at_utc` to avoid duplicate triggers.
- Does not publish content directly.

Vercel Cron runs only on production deployments. The `*/5 * * * *` schedule requires a Vercel plan that supports that frequency. If your Vercel plan only supports daily cron, use an external scheduler or upgrade the plan.

## Production Test Steps

1. Deploy to Vercel production.
2. Confirm required env vars exist in Vercel.
3. Apply Supabase migrations.
4. Create one `cmo_posting_settings` row with:
   - valid `tenant_id`
   - platform
   - timezone
   - local post time a few minutes ahead
   - `schedule_mode='every_day'`
   - `trigger_window_minutes=5`
5. Trigger manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<deployment-domain>/api/cron/content-scheduler
```

6. Confirm response shows `status: checked`.
7. At the scheduled local time window, confirm `due` becomes greater than `0`.
8. Confirm `cmo_schedule_triggers` receives a row.
9. Confirm `last_triggered_at_utc` updates on the matching `cmo_posting_settings` row.
10. Confirm Slack test route works if `SLACK_WEBHOOK_URL` is configured.
11. Confirm lead email route works if Resend env is configured.
12. Confirm the external worker can connect to `REDIS_URL`.

## Known Limitations

- Vercel serverless functions are not safe for long-running BullMQ workers.
- Vercel Cron is a trigger only. It should not perform heavy generation, rendering, publishing loops, or queue processing.
- BullMQ workers must run on a persistent worker host connected to external Redis.
- Vercel Cron frequency depends on the Vercel plan.
- If `SUPABASE_SERVICE_ROLE_KEY` is missing, the cron endpoint reports `not_configured` and does not run.
- If `SLACK_WEBHOOK_URL` is missing, Slack remains disabled without breaking core actions.
- If Meta or LinkedIn env is missing, social publishing should remain disabled or approval-queue-only.
