# GOPU OS — MASTER INTELLIGENCE PLATFORM PLAN
# The Vision: 6 AI Agents running 24/7, zero manual work except Director approvals
# Written Saturday night. Read Monday morning. Execute in order.

---

## THE VISION (In Simple Terms)

```
                    ┌─────────────────────────────┐
                    │     DIRECTOR COMMAND        │
                    │  Final approvals only.      │
                    │  Quotations, Invoices,      │
                    │  Major financial decisions  │
                    └──────────┬──────────────────┘
                               │ Approves
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │   COO    │◄──►│   CFO    │◄──►│   CMO    │
        │Operations│    │ Finances │    │Marketing │
        │ Invoices │    │  Prices  │    │  Emails  │
        │ Shipments│    │   P&L    │    │Campaigns │
        └────┬─────┘    └────┬─────┘    └────┬─────┘
             │               │               │
             ▼               ▼               ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │   CTO    │    │   CTO    │    │   CIO    │
        │  Server  │───►│ Credits  │    │  Leads   │
        │  Health  │    │ → CFO    │    │  Intel   │
        └──────────┘    └──────────┘    └──────────┘
```

**Every agent talks to every other agent. Director only sees approvals.**
**3 Slack briefings daily: 9 AM, 2 PM, 9 PM.**
**When Director approves → invoice/quotation goes to client automatically.**

---

## WHAT ALREADY EXISTS (Do NOT rebuild these)

### ✅ FULLY BUILT
- `autonomousLeadPipeline.js` — Full 6-agent pipeline (CIO→CFO→COO→CMO→CTO→Director)
- `agentMemoryService.js` — Agent-to-agent messaging + memory
- `agentWorkflowService.js` — Agent communication protocol
- `pricingEngineService.js` — CFO pricing with live market prices
- `api/slack/events.ts` — Lead detection, parsing, Slack reply
- `api/export/stages.ts` — 7-stage export pipeline logic
- `api/cron/morning-price-fetch.ts` — 9 AM price fetch + Slack report
- `cioService.js` — Lead scoring (A/B/C tiers), buyer intel queries
- `briefingService.js` — Briefing data structure (tables ready)
- `importerIntelligenceService.js` — Importer database queries

### ⚠️ PARTIALLY BUILT (needs completion)
- CFO → Live market prices (service done, table missing)
- Director approval → invoice send (approval works, email send missing)
- CMO → Social posting (UI done, API calls missing)
- CTO → Credit monitoring (service exists, auto-alert to CFO missing)

### ❌ COMPLETELY MISSING (need to build)
- 2 PM and 9 PM daily Slack briefings (only morning price exists)
- 9 AM intelligent briefing (has price fetch, but no business intel)
- CTO credit expiry → auto-alert CFO → CFO pays → updates CTO
- Cold email automation (CMO sends to buyers CIO finds)
- Follow-up email sequences (3-day, 7-day, 14-day follow-ups)
- One-click Director approval → invoice emails to client
- CIO worldwide buyer intelligence scraping / enrichment
- Paid campaign budget tracking + ROI (CMO)
- Agent self-decision loop (agents act on their own, not just on triggers)

---

## SECTION A — SQL TO RUN MONDAY (Do First — 2 Hours)

URL: https://supabase.com/dashboard/project/ogrmmhlaxfxrtpdzzwti/sql/new
Copy each step from PENDING_SQL.md and run in order.

- [ ] **SQL-1** · `commodity_prices` → CFO live pricing, 9 AM cron
- [ ] **SQL-2** · `lead_intake` → COO leads from Slack + CIO pipeline
- [ ] **SQL-3** · `pricing_requests` → CFO quote saves
- [ ] **SQL-4** · `tasks` → COO workflows
- [ ] **SQL-5** · `ai_agent_runs` → tracks every agent action
- [ ] **SQL-6** · `integration_services` → CTO live status
- [ ] **SQL-7** · `slack_event_dedup` → no duplicate Slack replies
- [ ] **SQL-8** · `founder_approvals` missing columns
- [ ] **SQL-9** · service_role permission grants
- [ ] **SQL-10** · `export_orders` → 7-stage pipeline
- [ ] **SQL-11** · `export_documents` → document checklist
- [ ] **SQL-12** · `export_stage_logs` → pipeline history
- [ ] **SQL-13** · `export_agent_comms` → COO↔CFO↔Director comms

**New tables needed for full agent system:**
- [ ] **SQL-14** · `agent_briefings` — stores 9AM/2PM/9PM briefing content
- [ ] **SQL-15** · `cold_email_sequences` — buyer outreach tracking
- [ ] **SQL-16** · `cio_buyer_intelligence` — worldwide buyer database
- [ ] **SQL-17** · `cto_credit_alerts` — platform credit expiry tracking
- [ ] **SQL-18** · `agent_decisions` — log every autonomous decision each agent makes

SQL for new tables (run after PENDING_SQL.md Steps 0-4):

```sql
-- Agent briefings (3x daily Slack briefings)
create table if not exists public.agent_briefings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  briefing_type text not null, -- 'morning_9am' | 'afternoon_2pm' | 'evening_9pm'
  scheduled_at timestamptz,
  sent_at timestamptz,
  slack_ts text,
  content jsonb default '{}'::jsonb,
  summary text,
  leads_count integer default 0,
  pending_approvals integer default 0,
  revenue_pending numeric default 0,
  created_at timestamptz default now()
);

-- Cold email sequences (CMO buyer outreach)
create table if not exists public.cold_email_sequences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  lead_id uuid,
  buyer_name text,
  buyer_email text,
  company_name text,
  country text,
  product text,
  sequence_stage integer default 1, -- 1=intro, 2=3day followup, 3=7day followup, 4=14day
  status text default 'Pending', -- Pending | Sent | Opened | Replied | Unsubscribed | Won
  sent_at timestamptz,
  opened_at timestamptz,
  replied_at timestamptz,
  next_followup_at timestamptz,
  email_subject text,
  email_body text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CIO worldwide buyer intelligence
create table if not exists public.cio_buyer_intelligence (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  buyer_name text,
  company_name text,
  country text,
  city text,
  email text,
  phone text,
  website text,
  products_interested text[],
  annual_import_volume text,
  tier text default 'C', -- A | B | C
  lead_score integer default 5,
  source text, -- 'slack' | 'email' | 'cio_research' | 'manual'
  status text default 'New', -- New | Contacted | Qualified | Won | Lost
  notes text,
  last_contacted_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CTO credit/subscription alerts
create table if not exists public.cto_credit_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  platform text not null, -- 'openai' | 'vercel' | 'supabase' | 'resend' | 'twilio'
  alert_type text, -- 'credit_low' | 'credit_critical' | 'subscription_expiring' | 'paid'
  current_balance text,
  threshold_amount text,
  due_date date,
  estimated_days_left integer,
  cfo_notified_at timestamptz,
  paid_at timestamptz,
  paid_amount numeric,
  status text default 'Open', -- Open | CFO_Notified | Paid | Dismissed
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Agent autonomous decisions log
create table if not exists public.agent_decisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  agent text not null, -- 'COO' | 'CFO' | 'CMO' | 'CTO' | 'CIO'
  decision_type text, -- 'pricing' | 'email_send' | 'campaign_budget' | 'lead_score' | 'credit_alert'
  decision_summary text,
  confidence numeric default 0.8,
  requires_director boolean default false,
  director_notified_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  input_data jsonb default '{}'::jsonb,
  output_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Grants for all new tables
grant select, insert, update on public.agent_briefings to authenticated, service_role;
grant select, insert, update on public.cold_email_sequences to authenticated, service_role;
grant select, insert, update on public.cio_buyer_intelligence to authenticated, service_role;
grant select, insert, update on public.cto_credit_alerts to authenticated, service_role;
grant select, insert, update on public.agent_decisions to authenticated, service_role;

notify pgrst, 'reload schema';
```

---

## SECTION B — ENV VARS (Monday, 30 mins after SQL)

- [ ] `SUPABASE_URL` = https://ogrmmhlaxfxrtpdzzwti.supabase.co
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = (Supabase → Settings → API → service_role)
- [ ] `SLACK_BOT_TOKEN` = (Slack API → OAuth & Permissions)
- [ ] `SLACK_CHANNEL_ID` = (your #exports-command-center channel ID)
- [ ] `SLACK_SIGNING_SECRET` = (Slack API → Basic Information)
- [ ] `DATA_GOV_API_KEY` = (data.gov.in → register free → API key)
- [ ] `CRON_SECRET` = (run: openssl rand -hex 32)
- [ ] `OPENAI_API_KEY` = (platform.openai.com → API keys) ← for agent intelligence
- [ ] `RESEND_API_KEY` = (resend.com → free tier → API key) ← for cold emails
- [ ] `META_ACCESS_TOKEN` = (developers.facebook.com → Graph API Explorer)
- [ ] `INSTAGRAM_BUSINESS_ACCOUNT_ID` = (Meta Business → Instagram)
- [ ] `FACEBOOK_PAGE_ID` = (Facebook Page → About → Page ID)
- [ ] `LINKEDIN_ACCESS_TOKEN` = (LinkedIn Developer Portal → OAuth 2.0)
- [ ] `LINKEDIN_ORGANIZATION_ID` = (LinkedIn company URL → last number)

---

## SECTION C — CODE TO BUILD (Priority Order)

### PRIORITY 1 — THREE DAILY BRIEFINGS (Slack 9AM / 2PM / 9PM)
**What:** Every day at 9 AM, 2 PM, and 9 PM IST, all 5 agents compile a briefing
and send one Slack message to Director covering:
- How many leads came in (and from where)
- How many quotations are pending Director approval
- How much money is pending (receivables)
- Which invoices need to go out
- Leads lost and why
- Agent actions taken since last briefing
- What needs Director attention

**Files to create:**
- `api/cron/briefing-9am.ts` — morning intel briefing
- `api/cron/briefing-2pm.ts` — afternoon update
- `api/cron/briefing-9pm.ts` — evening summary
- Add to vercel.json: schedules `30 3 * * *`, `30 8 * * *`, `30 15 * * *`

**Status:** briefingService.js tables ready, cron logic NOT built
**Effort:** 6 hrs

---

### PRIORITY 2 — DIRECTOR ONE-CLICK APPROVAL → EMAIL TO CLIENT
**What:** Director sees approval card in Slack or panel. Clicks Approve.
System automatically: generates invoice PDF → emails to buyer → updates COO pipeline → notifies CFO.
No manual steps after Director clicks.

**Files to update:**
- `api/slack/approval.ts` — add invoice generation + email send after approval
- `api/lead-email/notify.ts` — already exists, wire to approval trigger
- Add: quotation email template in Resend format

**Status:** Approval exists. Email endpoint exists. Wire them together.
**Effort:** 4 hrs

---

### PRIORITY 3 — CMO COLD EMAIL + FOLLOW-UP SEQUENCES
**What:** When CIO finds or scores a buyer:
1. CMO auto-drafts intro email (product intro, company, pricing range)
2. Sends via Resend API
3. If no reply in 3 days → follow-up 1
4. If no reply in 7 days → follow-up 2 (different angle)
5. If no reply in 14 days → final follow-up or mark lost

**Files to create:**
- `api/cmo/email/send-sequence.ts` — trigger sequence for a buyer
- `api/cmo/email/followup-check.ts` — cron: check who needs follow-up
- Add to vercel.json: `0 6 * * *` (daily check for due follow-ups)

**Status:** cold_email_sequences table (add via SQL-15). Resend API key needed.
**Effort:** 8 hrs

---

### PRIORITY 4 — CTO CREDIT MONITORING → CFO AUTO-ALERT
**What:** CTO checks platform credits/subscriptions daily.
When any platform (OpenAI, Vercel, Supabase, Resend) is below threshold:
1. CTO creates alert in `cto_credit_alerts`
2. Sends Slack message to CFO channel: "OpenAI credits at $5.40 — need recharge"
3. CFO sees it in CFO Command → Payment Requirements tab
4. CFO logs payment → CTO confirms status updated

**Files to create:**
- `api/cron/cto-credit-check.ts` — daily check of platform balances
- Add to vercel.json: `0 7 * * *` (7 AM daily check)

**Status:** ctoService.js has subscriptionWatch but returns empty. Need real API checks.
**Effort:** 5 hrs

---

### PRIORITY 5 — CIO BUYER INTELLIGENCE
**What:** CIO builds a database of worldwide importers/buyers.
Sources: trade directories, existing leads, manual import.
Scores each buyer A/B/C. Sends top A-tier buyers to CMO for cold email.
Updates Director briefing with pipeline quality score.

**Files to create:**
- `api/cio/buyers.ts` — CRUD for cio_buyer_intelligence table
- `api/cio/score.ts` — re-score all buyers on demand
- `api/cio/enrich.ts` — enrich buyer with web research (optional, needs OpenAI)

**Status:** cioService.js has scoring logic, no API endpoints, no database
**Effort:** 6 hrs

---

### PRIORITY 6 — EXPORT PIPELINE UI IN COO (Stage Tracking)
**What:** COO Command shows each export order as a visual pipeline card:
Stage 1 → 2 → 3 → ... → 7. Which documents are ready, which are pending.
COO clicks "Advance Stage" → system notifies CFO (invoice), Director (approval).

**Files to update:** `src/main.jsx` — add "Export Orders" tab in COO Command
**Status:** Backend `api/export/stages.ts` done. UI is missing.
**Effort:** 8 hrs

---

### PRIORITY 7 — REAL AUTH (Replace Demo Login)
**What:** Real Supabase email/password login. Session persists.
Founder logs in once, stays logged in. Password reset via email.

**Files to update:** `src/main.jsx` login section
**Effort:** 6 hrs

---

### PRIORITY 8 — ANALYTICS WITH REAL DATA
**What:** Dashboard KPI cards show real numbers from DB:
- Total leads this month (from lead_intake)
- Total revenue pending (from pricing_requests)  
- Quotes sent vs won (conversion rate)
- Top product, top buyer country

**Files to update:** `src/main.jsx` MetricGrid + chart components
**Effort:** 5 hrs

---

### PRIORITY 9 — INVOICE PDF + EMAIL SEND
**What:** Invoice builder generates PDF. "Send to Client" button emails via Resend.
**Files to update:** `src/main.jsx` invoice builder, wire to `api/lead-email/notify.ts`
**Effort:** 3 hrs

---

### PRIORITY 10 — CMO REAL SOCIAL POSTING
**What:** CMO scheduled posts actually go to Instagram, Facebook, LinkedIn.
**Files to update:** `api/cron/daily-social-trigger.ts` — already exists, add real API calls
**Effort:** 5 hrs (needs ENV-8 to ENV-12)

---

## SECTION D — FULL 24/7 AGENT LOOP (The End Game)

This is what makes the platform fully autonomous. After all above is done:

```
Every 5 minutes — Slack sync (already running)
Every morning 9 AM IST:
  1. morning-price-fetch → gets live commodity prices → updates CFO pricing
  2. briefing-9am → all agents compile overnight summary → Slack to Director
  3. cto-credit-check → checks all platform balances → alerts CFO if low
  4. followup-check → checks cold email sequences → sends due follow-ups
  5. cio-score → re-scores all buyers in CIO database

Every afternoon 2 PM IST:
  1. briefing-2pm → mid-day update → leads in, quotes out, money status

Every evening 9 PM IST:
  1. briefing-9pm → full day summary → lost leads + why, won + amount
  2. daily-social-trigger → CMO posts on Instagram/Facebook/LinkedIn

On every Slack lead message (real-time):
  1. CIO scores lead (A/B/C tier)
  2. CFO prices it (live market prices)
  3. COO checks operational readiness
  4. CMO drafts intro email (ready to send on approval)
  5. CTO verifies all systems healthy
  6. Director gets Slack approval card (one tap = done)

On Director approval:
  1. Invoice/quotation generated
  2. Email sent to buyer via Resend
  3. COO pipeline updated (Stage 2: Order Confirmed)
  4. CFO records expected receivable
  5. CMO starts follow-up sequence
  6. All agents notified

On no reply from buyer (3/7/14 days):
  1. CMO sends follow-up automatically
  2. Director briefing notes it
  3. After 14 days → mark as cold → CIO re-scores

On CTO credit low:
  1. CTO sends Slack alert to CFO
  2. CFO sees in Payment Requirements tab
  3. CFO logs payment → CTO marks resolved
```

---

## COMPLETION FORECAST AFTER ALL ITEMS

| After | % | What works |
|---|---|---|
| Right now | 62% | All UI, Slack lead detection, pricing |
| SQL done | 72% | Real data saves, all agents can write |
| Env vars done | 76% | Slack live, morning cron live |
| Priority 1 (briefings) | 80% | 3x daily briefings to Slack |
| Priority 2 (one-click approval) | 83% | Director approves → client gets invoice |
| Priority 3 (cold email) | 86% | CMO running buyer outreach 24/7 |
| Priority 4 (CTO credits) | 88% | Platform self-monitors, CFO auto-alerted |
| Priority 5 (CIO buyers) | 90% | Worldwide buyer database live |
| Priority 6 (export UI) | 92% | COO stage tracking visible |
| Priority 7 (auth) | 93% | Real login |
| Priority 8-10 | 96% | Analytics, PDF, Social |
| Testing + QA | 100% | Production ready |

**Total remaining work: ~56 hrs of code + 2.5 hrs SQL/env setup**
**Realistic timeline: 5–7 working days to 100%**

---

## WHAT TO BUILD TODAY (Right Now, No SQL Needed)

**Start with these — no dependencies:**

1. `api/cron/briefing-9am.ts` — morning intel briefing (build the template)
2. `api/cron/briefing-2pm.ts` — afternoon update
3. `api/cron/briefing-9pm.ts` — evening summary
4. `api/cio/buyers.ts` — CIO buyer CRUD API
5. Wire Director approval → email send in `api/slack/approval.ts`
6. Export Pipeline UI tab in COO Command

Say "start with [number]" and we build it right now.

---

*Master plan locked Saturday night. This is the intelligence platform. Execute Monday.*
