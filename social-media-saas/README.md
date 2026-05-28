# Social Media Content Automation SaaS

First working vertical slice for daily social content automation.

The slice does one thing:

1. Register a BullMQ repeatable job for 8:00 AM IST.
2. Generate captions, hashtags, and image prompts for Instagram, Facebook, and LinkedIn.
3. Generate one base poster image.
4. Stamp a logo onto the poster with Sharp.
5. Upload the final poster to S3-compatible storage, intended for Cloudflare R2.
6. Send a Slack Block Kit approval message.
7. On Slack approval, enqueue idempotent publish jobs for Instagram, Facebook, and LinkedIn if enabled.
8. Log every meaningful step to `audit_logs`.

## Folder Structure

```text
social-media-saas/
  apps/
    api/
      src/
        auth/                 JWT login and guard
        audit/                audit log writer
        campaign-runs/        protected run status API
        providers/            OpenAI, R2, Sharp, Slack, Meta, LinkedIn adapters
        queues/               BullMQ queue setup and repeatable scheduler
        settings/             protected provider status API
        slack/                Slack interactivity webhook and signature verification
        worker/               generation and publish workers
        app.module.ts
        main.ts
    web/
      app/                    Next.js routes: Daily Runs and Settings
      components/             inline JWT auth gate
      lib/                    API client
  prisma/
    schema.prisma             exactly 8 tables
    seed.ts                   admin user and one campaign
  docker-compose.yml
  Dockerfile
```

## Local Boot

1. Create env file:

```bash
cp .env.example .env
```

2. Fill real credentials in `.env`.

3. Start the stack:

```bash
docker compose up --build
```

4. Open:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`

5. Login with:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Local Development Without Docker

Run Postgres and Redis locally, then:

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev:api
npm run dev:worker
npm run dev:web
```

Run those three dev commands in separate terminals.

## Environment Variables

```env
NODE_ENV=development
API_PORT=4000
WEB_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000

DATABASE_URL=postgresql://postgres:postgres@postgres:5432/social_content_saas?schema=public
REDIS_URL=redis://redis:6379
JWT_SECRET=replace-with-a-long-random-secret
ADMIN_EMAIL=admin@gopuexports.com
ADMIN_PASSWORD=change-this-admin-password

DEFAULT_PRODUCT_FOCUS=Indian spices export authority
DAILY_JOB_CRON_UTC=30 2 * * *
OPENAI_API_KEY=
OPENAI_CONTENT_MODEL=gpt-4o-mini
OPENAI_IMAGE_MODEL=gpt-image-1
IMAGE_PROVIDER=openai

R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=social-posters
R2_PUBLIC_BASE_URL=https://cdn.example.com/social-posters
LOGO_PATH=

SLACK_BOT_TOKEN=
SLACK_CHANNEL_ID=
SLACK_SIGNING_SECRET=
SLACK_APPROVAL_WEBHOOK_URL=http://localhost:4000/slack/interactivity

META_GRAPH_VERSION=v19.0
META_ACCESS_TOKEN=
META_IG_USER_ID=
META_FACEBOOK_PAGE_ID=

LINKEDIN_ENABLED=false
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_OWNER_URN=
```

## Slack Setup

Create a Slack app with:

- Bot token scope: `chat:write`
- Interactivity endpoint: `https://your-api-host/slack/interactivity`
- Signing secret copied into `SLACK_SIGNING_SECRET`
- Channel ID copied into `SLACK_CHANNEL_ID`

The webhook verifies Slack signatures using `v0:{timestamp}:{rawBody}` HMAC SHA256 and rejects stale or invalid requests.

## Publishing Notes

- Instagram uses Meta Graph API two-step image publishing.
- Facebook publishes a page photo through Meta Graph API.
- LinkedIn is implemented behind `LINKEDIN_ENABLED`. When disabled, LinkedIn publish jobs are not enqueued.
- Publish jobs use a unique `idempotency_key` of `runId:platform` to avoid double-posting on retries.

## Validation

```bash
npm run lint
npm run build
```

The lint script is a TypeScript validation pass for the Nest API and Next app. The build script generates Prisma Client, compiles the API worker/API, and builds Next.js.

## Country and Timezone Schedule

The Settings page includes a country selector, timezone selector, posting time selector, save button, and next run preview.

The saved database schedule is the source of truth:

- `campaigns.schedule_country`
- `campaigns.schedule_timezone`
- `campaigns.posting_time_local`
- `campaigns.next_run_at_utc`

The scheduler uses the selected timezone when registering the BullMQ repeatable job. Device, browser, server, and travel timezone are not used for business posting logic.

Examples:

- India / `Asia/Kolkata` / `08:00` stores the next UTC run for 8:00 AM India time.
- UAE / `Asia/Dubai` / `08:00` stores the next UTC run for 8:00 AM UAE time.

`DAILY_JOB_CRON_UTC` is only used as a fallback when no database schedule is saved.

Every schedule change writes a `posting_schedule_changed` row in `audit_logs`.
