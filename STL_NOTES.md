# STL NOTES — Complete Pending List
# Read this Monday morning. Work through it in order.

---

## SECTION A — SQL TO RUN TOMORROW (Cannot code around these)
## Do these FIRST before anything else. Takes ~2 hours.

URL: https://supabase.com/dashboard/project/ogrmmhlaxfxrtpdzzwti/sql/new

- [ ] **SQL-1** · `commodity_prices` table → unlocks CFO live pricing + 9AM cron
- [ ] **SQL-2** · `lead_intake` table → unlocks COO leads from Slack
- [ ] **SQL-3** · `pricing_requests` table → unlocks CFO quotation saves
- [ ] **SQL-4** · `tasks` table → unlocks COO workflows + task board
- [ ] **SQL-5** · `ai_agent_runs` table → unlocks Director agent tracking
- [ ] **SQL-6** · `integration_services` table → unlocks CTO live status
- [ ] **SQL-7** · `slack_event_dedup` table → stops duplicate Slack replies
- [ ] **SQL-8** · `founder_approvals` — add 12 missing columns → unlocks Director saves
- [ ] **SQL-9** · service_role permission grants → unlocks ALL API writes
- [ ] **SQL-10** · `export_orders` table → unlocks 7-stage export pipeline
- [ ] **SQL-11** · `export_documents` table → unlocks document checklist
- [ ] **SQL-12** · `export_stage_logs` table → unlocks pipeline history
- [ ] **SQL-13** · `export_agent_comms` table → unlocks COO↔CFO↔Director comms

All SQL is written in PENDING_SQL.md — just copy-paste each step.

---

## SECTION B — ENV VARS TO ADD IN VERCEL TOMORROW
## After SQL, do these. Takes ~30 mins.

URL: https://vercel.com → GOPU OS → Settings → Environment Variables

- [ ] **ENV-1** · `SUPABASE_URL` = https://ogrmmhlaxfxrtpdzzwti.supabase.co
- [ ] **ENV-2** · `SUPABASE_SERVICE_ROLE_KEY` = (Supabase → Settings → API)
- [ ] **ENV-3** · `SLACK_BOT_TOKEN` = (Slack API app → OAuth & Permissions)
- [ ] **ENV-4** · `SLACK_CHANNEL_ID` = (right-click channel → Copy Link → last part)
- [ ] **ENV-5** · `SLACK_SIGNING_SECRET` = (Slack API → Basic Information)
- [ ] **ENV-6** · `DATA_GOV_API_KEY` = (register at data.gov.in → free API key)
- [ ] **ENV-7** · `CRON_SECRET` = (run: openssl rand -hex 32)
- [ ] **ENV-8** · `META_ACCESS_TOKEN` = (developers.facebook.com → Graph API Explorer)
- [ ] **ENV-9** · `INSTAGRAM_BUSINESS_ACCOUNT_ID` = (Meta Business → Instagram)
- [ ] **ENV-10** · `FACEBOOK_PAGE_ID` = (Facebook Page → About → Page ID)
- [ ] **ENV-11** · `LINKEDIN_ACCESS_TOKEN` = (LinkedIn Developer Portal → OAuth 2.0)
- [ ] **ENV-12** · `LINKEDIN_ORGANIZATION_ID` = (LinkedIn company URL → last number)

---

## SECTION C — CODE WE CAN FINISH NOW (No SQL needed)
## These are pure code tasks. Do these while waiting for SQL/env vars.

### C1 · CTO Command — Wire live integration status
**Problem:** CTO shows empty panels. `ctoService.js` has `staticRows()` returning [] for
subscriptionWatch, deploymentStatus, architectureMap, technicalAudit, mediaStack etc.
**Fix:** Replace static fallback with real data pulled from `integration_services` Supabase table.
Also build the `/api/cto/health` endpoint returning actual system status.
**Effort:** 3 hrs

### C2 · Dashboard — Replace hardcoded chart data with real DB queries
**Problem:** Revenue charts use `[65, 70, 68, 74, 71, 78]` etc. KPI cards show fixed numbers.
**Fix:** Wire dashboard to Supabase — pull real lead_intake count, pricing_requests totals,
founder_approvals count as KPI numbers.
**Effort:** 4 hrs

### C3 · Export Pipeline — Build COO Stage Tracking UI
**Problem:** 7-stage export flow logic exists in `api/export/stages.ts` but there is
zero UI in COO Command showing order stages, document checklist, or stage progress.
**Fix:** Add "Export Orders" tab in COO Command with:
  - List of active export orders + current stage
  - Stage progress bar (Stage 1 of 7)
  - Document checklist per stage
  - Advance stage button
**Effort:** 8 hrs

### C4 · Auth — Replace demo login with real Supabase auth
**Problem:** Login is `LOCAL_AUTH_EMAIL` hardcoded check. No real session, no password reset.
**Fix:** Wire login form to `supabase.auth.signInWithPassword()`. Add session check on load.
Add "Forgot password" flow via Supabase magic link.
**Effort:** 6 hrs

### C5 · Settings — Add real persistence
**Problem:** Settings page has full UI (company profile, registrations, LUT, doc defaults)
but saves only to local state — refreshing loses everything.
**Fix:** Wire all settings save buttons to `companyService.js` which already has
`saveCompanyProfile()`, `saveCompanyRegistration()` etc. — they just need Supabase tables.
**Effort:** 3 hrs (after SQL)

### C6 · Analytics/Reports — Wire real data into charts
**Problem:** All SVG charts use hardcoded point arrays.
**Fix:** Pull from `lead_intake`, `pricing_requests`, `founder_approvals` for real counts.
Show: leads per week, quote conversion rate, top products, top buyers.
**Effort:** 5 hrs

### C7 · CMO — Build real social posting endpoints
**Problem:** CMO UI has full post approval flow but `/api/cmo/publishing/` endpoints
don't actually call Meta Graph API or LinkedIn API.
**Fix:** Wire `api/cron/daily-social-trigger.ts` (already exists) to:
  - POST to Facebook Page via Graph API
  - POST to Instagram via Content Publishing API
  - POST to LinkedIn via Share API
**Effort:** 5 hrs (needs ENV-8 to ENV-12)

### C8 · CFO Market Prices — Enter real prices via UI
**Problem:** CFO → Market Prices tab exists and works, but no prices entered yet.
**Fix:** After SQL-1, open CFO → Market Prices tab and enter today's actual purchase prices
for all 13 commodities. Every quote immediately uses real prices.
**Effort:** 15 mins (after SQL)

### C9 · Notifications — Add real-time push
**Problem:** Notification center shows data from DB but no push/badge when new items arrive.
**Fix:** Add Supabase real-time subscription in notification center component.
Badge count updates live without refresh.
**Effort:** 2 hrs

### C10 · Invoice — Add PDF download
**Problem:** Invoice builder creates the invoice UI perfectly but no PDF export.
**Fix:** Add `window.print()` with print-specific CSS already in styles.css (`.invoice-document`).
Or add jsPDF/html2pdf for proper PDF download button.
**Effort:** 2 hrs

### C11 · WhatsApp integration
**Problem:** `whatsappApprovalService.js` and `whatsappCommandService.js` exist but
there is no `/api/whatsapp/` endpoint and no Twilio/WhatsApp Cloud API connection.
**Fix:** Build `/api/whatsapp/approval` endpoint using Twilio or WhatsApp Business Cloud API.
Wire Director approvals to also notify via WhatsApp message.
**Effort:** 8 hrs

### C12 · COO Export Pipeline — Document status updates
**Problem:** Document checklist in export pipeline has no way to mark docs as Ready/Submitted.
**Fix:** Add status toggle buttons on each document row in export_documents checklist.
Write to `export_documents` table on click.
**Effort:** 2 hrs (after SQL)

---

## SECTION D — WHAT'S ALREADY 100% DONE (No work needed)

- ✅ Premium design system (glass, gradients, 12 animations)
- ✅ Slack lead detection + parsing + pricing engine reply
- ✅ COO task management service + UI
- ✅ CFO pricing engine (reference prices working)
- ✅ Director approval queue UI + approve/reject/escalate actions
- ✅ Morning price cron (9 AM IST) — code complete
- ✅ 7-stage export logic (api/export/stages.ts)
- ✅ Invoice builder template UI
- ✅ Notification center UI
- ✅ Learning centre UI + run/stop/findings
- ✅ All 30 API endpoints deployed on Vercel
- ✅ CMO content calendar + approval queue UI
- ✅ Command palette (Ctrl+K)
- ✅ Mobile bottom nav
- ✅ Shipment tracker UI

---

## PRIORITY ORDER FOR TODAY/TOMORROW

### TODAY (can start now — no SQL needed):
1. C3 — Export Pipeline COO UI (8 hrs) ← biggest value
2. C4 — Real Supabase auth (6 hrs) ← security
3. C7 — CMO real posting endpoints (5 hrs) ← revenue
4. C6 — Analytics real data (5 hrs) ← visibility
5. C10 — Invoice PDF download (2 hrs) ← quick win
6. C9 — Notifications real-time (2 hrs) ← quick win

### TOMORROW MORNING (after SQL + env vars):
7. C8 — Enter real CFO market prices (15 mins)
8. C5 — Settings persistence (3 hrs)
9. C1 — CTO live status (3 hrs)
10. C2 — Dashboard real data (4 hrs)
11. C11 — WhatsApp integration (8 hrs)
12. C12 — Document status updates (2 hrs)

---

## COMPLETION FORECAST

| After | % Complete |
|---|---|
| Now (design done) | 62% |
| + SQL steps run | 72% |
| + Env vars added | 76% |
| + C3 Export UI | 80% |
| + C4 Auth | 83% |
| + C7 CMO posting | 86% |
| + C6 Analytics | 88% |
| + C1 CTO live | 90% |
| + C2 Dashboard | 92% |
| + C10 PDF + C9 Notifs | 94% |
| + C11 WhatsApp | 97% |
| + Testing + QA | 100% |

**Total remaining: ~55 hrs of code + 2.5 hrs of SQL/env setup**
**At full pace: 2 days to 90%, 1 more week to 100%**

---

*Updated: Saturday night. Start Section A first thing Monday.*
