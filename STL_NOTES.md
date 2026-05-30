# STL NOTES — Read This First Thing Monday Morning
# Last updated: Saturday night — Full audit done, ready to execute

---

## HONEST ANSWER: Can We Finish Monday?

**Partially — YES. Fully — NO.**

| Goal | Achievable Monday? |
|---|---|
| Platform goes LIVE with real data | ✅ YES — 2 hrs SQL work |
| Slack lead flow works end-to-end | ✅ YES — already coded |
| CFO live prices + morning cron | ✅ YES — add API key |
| COO + Director working | ✅ YES — after SQL |
| CMO social posting ONLINE | ⚠️ PARTIAL — needs Meta/LinkedIn API keys |
| Export pipeline UI | ❌ NOT Monday — 30 hrs work |
| Real auth (login system) | ❌ NOT Monday — 20 hrs work |
| PDF generation | ❌ NOT Monday — 10 hrs work |
| Full 100% completion | ❌ 147 hrs total (~3–4 weeks) |

**Monday realistic goal: Get from 62% → 80% and have a LIVE working platform.**

---

## MONDAY MORNING — DO THIS IN ORDER

### HOUR 1–2: Run SQL in Supabase (CRITICAL — unlocks everything)

URL: https://supabase.com/dashboard/project/ogrmmhlaxfxrtpdzzwti/sql/new

Run each step from PENDING_SQL.md in order:

- [ ] **STEP 0** — `commodity_prices` table → unlocks CFO pricing, morning cron
- [ ] **STEP 1** — `lead_intake`, `tasks`, `ai_agent_runs`, `slack_event_dedup` → unlocks Slack + COO + Director
- [ ] **STEP 2** — Add 12 missing columns to `founder_approvals` → unlocks Director approvals
- [ ] **STEP 3** — Grant `service_role` permissions → unlocks all API writes
- [ ] **STEP 4** — `export_orders`, `export_documents`, `export_stage_logs`, `export_agent_comms` → unlocks export pipeline

After these 5 steps: platform goes from 62% → ~80% instantly.

---

### HOUR 2–3: Add Env Vars in Vercel (CRITICAL)

URL: https://vercel.com/dashboard → GOPU OS project → Settings → Environment Variables

**Must add:**
- [ ] `SUPABASE_URL` = `https://ogrmmhlaxfxrtpdzzwti.supabase.co`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = (from Supabase → Settings → API → service_role key)
- [ ] `SLACK_BOT_TOKEN` = (from Slack API app)
- [ ] `SLACK_CHANNEL_ID` = (your #exports-command-center channel ID)
- [ ] `SLACK_SIGNING_SECRET` = (from Slack API app → Basic Information)
- [ ] `DATA_GOV_API_KEY` = (register free at data.gov.in → get API key → live prices at 9 AM)
- [ ] `CRON_SECRET` = (any random string — run: `openssl rand -hex 32`)

**For CMO to go ONLINE (social posting):**
- [ ] `META_ACCESS_TOKEN` = (Meta Business → Graph API Explorer)
- [ ] `INSTAGRAM_BUSINESS_ACCOUNT_ID` = (Meta Business → Instagram account ID)
- [ ] `FACEBOOK_PAGE_ID` = (Facebook Page → About → Page ID)
- [ ] `LINKEDIN_ACCESS_TOKEN` = (LinkedIn Developer Portal → OAuth 2.0)
- [ ] `LINKEDIN_ORGANIZATION_ID` = (LinkedIn Company Page URL — last number)

---

### HOUR 3: Test the Full Flow

After SQL + env vars, test this in Slack:
```
New lead: 10 MT Red Chilli, buyer Ahmed Trading from Dubai, need FOB quote
```

Expected in 30 seconds:
- ✅ Bot replies with price, delivery time, approval status
- ✅ COO Command → shows the lead
- ✅ CFO Command → shows pricing request
- ✅ Director Command → shows approval pending
- ✅ Every morning at 9 AM IST → Slack gets price report

---

## CMO — Will It Be Online Monday?

**Depends on API keys.**

| CMO Feature | Status | What's Needed |
|---|---|---|
| UI / Dashboard | ✅ LIVE NOW | Nothing |
| Content calendar | ✅ LIVE NOW | Nothing |
| Post approval flow | ✅ LIVE NOW | Nothing |
| **Actually post to Instagram** | ⚠️ Needs key | `META_ACCESS_TOKEN` + `INSTAGRAM_BUSINESS_ACCOUNT_ID` |
| **Actually post to Facebook** | ⚠️ Needs key | `META_ACCESS_TOKEN` + `FACEBOOK_PAGE_ID` |
| **Actually post to LinkedIn** | ⚠️ Needs key | `LINKEDIN_ACCESS_TOKEN` + `LINKEDIN_ORGANIZATION_ID` |
| Analytics (real data) | ❌ Not yet | Needs 20 hrs build |

**If you add the 5 social API keys Monday morning → CMO social posting goes LIVE same day.**

Getting Meta access token takes ~30 mins:
1. Go to developers.facebook.com → My Apps → your app
2. Tools → Graph API Explorer
3. Generate token with permissions: `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`
4. Convert to long-lived token (60 days)

---

## WHAT'S 100% DONE (No Work Needed)

- ✅ Premium design system (glass, gradients, animations)
- ✅ All 18 module UIs built and navigable
- ✅ Slack lead detection + parsing + pricing reply
- ✅ COO task management logic
- ✅ CFO pricing engine (with reference prices)
- ✅ Director approval queue UI + logic
- ✅ Morning price cron (9 AM IST) — just needs DATA_GOV_API_KEY
- ✅ Export pipeline logic (api/export/stages.ts)
- ✅ Invoice builder / template
- ✅ Notification center
- ✅ All API endpoints (16 built, in vercel.json)
- ✅ PENDING_SQL.md — full migration guide written

---

## WHAT REMAINS AFTER MONDAY (Future Sprints)

| Item | Hours | Priority |
|---|---|---|
| Export pipeline UI (COO stage view) | 30 hrs | HIGH |
| Real Supabase auth (replace demo login) | 20 hrs | HIGH |
| Live analytics (real DB data in charts) | 25 hrs | MEDIUM |
| PDF invoice/document generation | 10 hrs | MEDIUM |
| CMO real social analytics | 20 hrs | MEDIUM |
| CTO live integration status | 15 hrs | LOW |
| WhatsApp integration | 15 hrs | LOW |
| E2E testing + security audit | 30 hrs | HIGH (before launch) |
| **TOTAL REMAINING** | **165 hrs** | **~4 weeks** |

---

## SUMMARY FOR MONDAY

**Start here → finish in 3 hours → platform is LIVE:**

1. Run SQL STEPS 0–4 in Supabase (2 hrs)
2. Add env vars in Vercel (30 mins)
3. Test Slack lead flow (15 mins)
4. Add social API keys if you want CMO online (30 mins)

**After Monday the platform will:**
- Capture every Slack lead automatically
- Run COO → CFO → Director pipeline
- Send morning price report at 9 AM daily
- Allow Director approvals in real-time
- Post to Instagram/Facebook/LinkedIn (if keys added)

**Platform will NOT have (needs future sprints):**
- Real login/auth system
- Live charts with real DB data
- Export stage tracking UI
- PDF generation

---

*Notes saved Saturday night. Resume Monday morning from HOUR 1.*
