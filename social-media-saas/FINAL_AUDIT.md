# FINAL AUDIT: social-media-saas vertical slice

Audit date: 2026-05-27  
Scope: `social-media-saas` only. No new product features or UI redesigns were added.

## Exact commands tested

```bash
npm run lint
npm run build
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5432/social_content_saas?schema=public'; npx prisma validate
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5432/social_content_saas?schema=public'; npx prisma migrate status
docker --version
```

Provider/safety smoke command run with `npx tsx -`:

```text
openai-content-missing-key: Missing required environment variable: OPENAI_API_KEY
openai-image-missing-key: Missing required environment variable: OPENAI_API_KEY
r2-missing-env: Missing required environment variable: R2_BUCKET
sharp-poster-bytes: 14321
instagram-missing-secret: Missing required environment variable: META_IG_USER_ID
facebook-missing-secret: Missing required environment variable: META_FACEBOOK_PAGE_ID
linkedin-disabled: LinkedIn publishing is disabled by LINKEDIN_ENABLED=false.
slack-blocks: 6
slack-bad-signature: false
```

## Passed checks

- `npm run lint` passes after Prisma Client generation.
- `npm run build` passes. It runs Prisma generate, compiles the Nest API/worker, and builds the Next web app.
- Prisma schema validates with `npx prisma validate` when `DATABASE_URL` is supplied.
- Admin JWT login is implemented with bcrypt password verification and 12h JWT signing.
- Daily Runs API is protected by `JwtGuard` and returns runs with campaign, variants, approvals, and publish jobs.
- Settings API is protected by `JwtGuard` and returns provider/config status without exposing secret values.
- OpenAI providers fail safely when `OPENAI_API_KEY` is missing; the worker catches generation errors and writes failure audit logs.
- Sharp poster composer works locally; smoke test produced a PNG buffer.
- R2/S3 storage provider uses AWS S3 `PutObjectCommand` and fails before upload when required R2 secrets are missing.
- Slack Block Kit approval message is generated with preview image, platform sections, approve/reject/request changes buttons.
- Slack signature verification checks timestamp freshness and HMAC signature.
- Meta Instagram publisher fails safely when secrets are missing.
- Facebook publisher fails safely when secrets are missing.
- LinkedIn enqueue path respects `LINKEDIN_ENABLED=false`.
- BullMQ queues are wired for daily generation and platform publishing.
- Audit logs exist for generation start, generation failure, variant generation, poster upload, approval request, Slack sent, approval approved/rejected/changes requested, publish start/success/failure, and campaign published.
- No fake live provider success is returned after fixes.

## Failed checks / blockers

- Prisma migrations are missing. There is no `prisma/migrations` directory. The project currently relies on `prisma db push`, which is not production migration history.
- `npx prisma migrate status` could not be completed against local Postgres because no database was running at `localhost:5432`.
- Admin JWT login was code-audited but not runtime-tested because there is no local `.env` and no running Postgres with seeded admin credentials.
- Daily Runs API and Settings API were code-audited but not runtime-tested for the same database/env reason.
- R2 upload was not live-tested because R2 credentials are missing.
- Slack postMessage was not live-tested because Slack bot token/channel/signing secret are missing.
- Meta Instagram/Facebook live publish was not tested because Meta credentials are missing.
- LinkedIn live publish was not tested because `LINKEDIN_ENABLED=false` and LinkedIn credentials are missing.
- Timezone schedule logic is partially safe but not fully production-grade:
  - BullMQ repeatable jobs use `tz` with the selected timezone.
  - Next run is stored as UTC.
  - The schedule helper still has a limited supported country/timezone list and manually derives UTC conversion using `Intl.DateTimeFormat` parts instead of a dedicated timezone library.
- Vercel deployment readiness is not complete:
  - No slice-level `vercel.json`.
  - The architecture depends on a long-running Nest API and BullMQ worker, which are not a natural fit for ordinary Vercel serverless deployment.
  - Redis and worker hosting must be externalized or the worker must run on a separate service.

## Fixed issues

- Fixed Slack signature verification so malformed signatures with different lengths return `false` instead of throwing from `crypto.timingSafeEqual`.
- Fixed publish worker approval bypass risk. Publishing now re-checks that the campaign run and latest approval request are both `approved` before any provider publish call.
- Fixed LinkedIn disabled behavior in the worker. Disabled LinkedIn jobs are marked `skipped`, not `published`.
- Fixed LinkedIn provider direct-call behavior. If `LINKEDIN_ENABLED=false`, it throws a safe error instead of returning a fake external post ID.

## Remaining blockers

- Create real Prisma migrations and stop relying on `db push` for production.
- Provide a real `.env` for the slice and run DB seed:
  - `DATABASE_URL`
  - `REDIS_URL`
  - `JWT_SECRET`
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`
- Start Postgres and Redis, then runtime-test:
  - `POST /auth/login`
  - `GET /campaign-runs`
  - `GET /settings`
  - `PUT /settings/schedule`
  - Slack interactivity callback with a valid signed request.
- Add automated tests for approval gating and provider fail-safe behavior.
- Decide deployment target for API and worker. For production, run the worker on a persistent host/container, not a short-lived request runtime.

## Missing secrets

- `OPENAI_API_KEY`
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_BASE_URL`
- `SLACK_BOT_TOKEN`
- `SLACK_CHANNEL_ID`
- `SLACK_SIGNING_SECRET`
- `META_ACCESS_TOKEN`
- `META_IG_USER_ID`
- `META_FACEBOOK_PAGE_ID`
- `LINKEDIN_ACCESS_TOKEN`
- `LINKEDIN_OWNER_URN`
- Production-grade `JWT_SECRET`

## Production next steps

1. Add proper Prisma migrations and verify `prisma migrate deploy` against staging.
2. Provision managed Postgres and Redis.
3. Seed a real admin account with a strong password.
4. Configure OpenAI, R2, Slack, Meta, and optional LinkedIn secrets.
5. Run end-to-end staging flow: daily job -> OpenAI generation -> Sharp poster -> R2 upload -> Slack approval -> publish queue -> provider publish.
6. Verify audit logs for every start/success/failure/approval/rejection/publish attempt.
7. Host API and BullMQ worker on persistent infrastructure; deploy web separately if using Vercel.
