# GOPU OS — Setup Notes

## Supabase Tables (run all in SQL Editor)

### Core Tables (from earlier notes)

```sql
create table cfo_wallet (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  balance numeric default 1000.00,
  auto_topup_threshold numeric default 100.00,
  auto_topup_amount numeric default 500.00,
  transactions jsonb default '[]',
  updated_at timestamptz default now()
);

create table cmo_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  platform text,
  goal_type text,
  target_value int,
  current_value int default 0,
  action text,
  status text default 'pending_budget',
  budget_requested numeric,
  budget_allocated numeric,
  budget_spent numeric default 0,
  slack_channel text,
  slack_thread_ts text,
  slack_user_id text,
  metadata jsonb,
  started_at timestamptz,
  created_at timestamptz default now()
);

create table agent_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  campaign_id uuid,
  from_agent text,
  to_agent text,
  message_type text,
  payload jsonb,
  status text default 'pending',
  processed_at timestamptz,
  created_at timestamptz default now()
);

create table founder_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  title text,
  amount text,
  status text default 'Pending Approval',
  created_at timestamptz default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  action_type text,
  action text,
  module text,
  related_table text,
  related_record_id uuid,
  record_type text,
  record_id uuid,
  actor text,
  actor_role text,
  description text,
  notes text,
  risk_level text default 'Low',
  metadata jsonb,
  created_at timestamptz default now()
);

create table platform_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  platform text,
  platform_key text unique,
  platform_name text,
  logo_key text,
  provider text,
  status text,
  runtime text,
  error_message text,
  last_sync_at timestamptz,
  last_checked_at timestamptz,
  config jsonb,
  metadata jsonb,
  created_at timestamptz default now()
);
```

### CMO Content Pipeline Tables

```sql
-- Main content storage (posts going through the 8-step pipeline)
create table content_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  run_id text unique,
  platform text,
  caption text,
  generated_text text,
  final_text text,
  final_approved_content text,
  image_url text,
  image_prompt text,
  approval_status text default 'pending_approval',
  publish_status text default 'not_published',
  live_post_url text,
  post_url text,
  published_at timestamptz,
  published_at_utc timestamptz,
  publish_attempt_count int default 0,
  last_publish_attempt_at timestamptz,
  last_publish_error text,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Multiple versions of each post (original, improved, premium)
create table content_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  run_id text,
  content_history_id uuid references content_history(id),
  version_type text,
  platform text,
  content text,
  hashtags text[],
  metadata jsonb,
  created_at timestamptz default now()
);

-- AI quality scoring per post
create table content_quality_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  run_id text,
  content_history_id uuid references content_history(id),
  hook_quality int,
  founder_authority int,
  engagement_potential int,
  trust_level int,
  clarity int,
  platform_optimization int,
  overall_score int,
  recommendation text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- AI rewrite history
create table ai_rewrite_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  run_id text,
  content_history_id uuid references content_history(id),
  version_before text,
  version_after text,
  rewrite_type text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- AI content scores
create table ai_content_scores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  run_id text,
  content_history_id uuid references content_history(id),
  score_type text,
  score_value int,
  metadata jsonb,
  created_at timestamptz default now()
);

-- CMO posting schedule settings (per platform)
create table cmo_posting_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  platform text,
  timezone text default 'Asia/Kolkata',
  country text default 'India',
  local_post_time text default '09:00',
  schedule_mode text default 'every_day',
  schedule_days jsonb,
  trigger_window_minutes int default 10,
  platform_integration_connected boolean default false,
  approval_required boolean default true,
  last_triggered_at_utc timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Cron trigger log
create table cmo_schedule_triggers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  posting_setting_id uuid references cmo_posting_settings(id),
  platform text,
  timezone text,
  local_day text,
  local_time text,
  due_at_utc timestamptz,
  triggered_at_utc timestamptz,
  status text default 'queued',
  trigger_source text default 'vercel_cron',
  created_at timestamptz default now()
);
```

### Seed: Default posting schedule (9am IST, every day)

Run this AFTER creating the tables above. Replace the tenant_id with your real one or keep the demo UUID.

```sql
insert into cmo_posting_settings (tenant_id, platform, timezone, local_post_time, schedule_mode, platform_integration_connected)
values
  ('11111111-1111-1111-1111-111111111111', 'LinkedIn', 'Asia/Kolkata', '09:00', 'every_day', false),
  ('11111111-1111-1111-1111-111111111111', 'Instagram', 'Asia/Kolkata', '09:00', 'every_day', false),
  ('11111111-1111-1111-1111-111111111111', 'Facebook', 'Asia/Kolkata', '09:00', 'every_day', false);
```

---

## Environment Variables (Vercel Dashboard → Settings → Environment Variables)

| Variable | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key |
| `SLACK_BOT_TOKEN` | Slack App → OAuth & Permissions → Bot Token (`xoxb-...`) |
| `SLACK_SIGNING_SECRET` | Slack App → Basic Information → Signing Secret |
| `SLACK_WEBHOOK_URL` | Slack App → Incoming Webhooks → Webhook URL |
| `SLACK_CHANNEL_ID` | Right-click channel in Slack → Copy Channel ID |
| `OPENAI_API_KEY` | platform.openai.com → API Keys |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn Developer App → OAuth 2.0 → Access Token |
| `LINKEDIN_ORGANIZATION_ID` | LinkedIn Company Page URL → numeric ID at end |
| `META_ACCESS_TOKEN` | Meta Business Suite → System Users → Generate Token |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Meta Business Suite → Instagram Account ID |
| `FACEBOOK_PAGE_ID` | Facebook Page → About → Page ID |
| `CRON_SECRET` | Any random string — set same in Vercel + used in cron auth header |

---

## Slack App Setup (15 min)

1. api.slack.com/apps → Create New App → From scratch
2. OAuth & Permissions → Bot Token Scopes: `chat:write`, `chat:write.public`, `channels:read`
3. Event Subscriptions → Enable → URL: `https://your-domain.vercel.app/api/slack/events`
   - Subscribe: `message.channels`, `app_mention`
4. Incoming Webhooks → Activate → Add to Workspace → pick channel
5. Install to workspace → copy all tokens to Vercel
6. In Slack: `/invite @your-bot-name`

---

## LinkedIn API Setup (30 min)

1. linkedin.com/developers → Create App → link to your Company Page
2. Products → Request: "Share on LinkedIn" + "Sign In with LinkedIn"
3. OAuth 2.0 → Generate access token (3-legged OAuth needed for posting)
4. Scopes needed: `w_member_social` (personal) or `w_organization_social` (company page)
5. Token expires in 60 days — need to refresh

---

## Meta (Instagram + Facebook) API Setup (45 min)

1. developers.facebook.com → Create App → Business type
2. Add products: Facebook Login, Instagram Graph API
3. Meta Business Suite → System Users → Create system user → Generate token
4. Token permissions: `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`
5. Get your Page ID from Facebook Page → About
6. Get Instagram Business Account ID: Graph API Explorer → `me/accounts` → find instagram_business_account

---

## Cron Health Check

After setting `CRON_SECRET` in Vercel, cron runs daily at 3:30am UTC (9am IST).
To manually trigger: `GET /api/cron/daily-social-trigger` with header `Authorization: Bearer <CRON_SECRET>`

Set `platform_integration_connected = true` in `cmo_posting_settings` for each platform once you've added the API tokens.
