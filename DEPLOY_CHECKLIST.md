# GOPU OS — Desktop Deploy Checklist
> Do this when you're on desktop. Takes ~30 minutes total.

---

## STEP 1 — Trigger Vercel Redeploy (2 min)

My latest commits are in GitHub but Vercel isn't auto-deploying. Do one of:

**Option A — Vercel Dashboard:**
1. Go to vercel.com → gopu-os-cmo project → Deployments
2. Tap the top deployment → "..." → Redeploy

**Option B — Vercel CLI (if installed):**
```bash
vercel --prod
```

---

## STEP 2 — Add Env Vars in Vercel (10 min)

Go to: Vercel → gopu-os-cmo → Settings → Environment Variables

Add these (all environments: Production + Preview + Development):

| Variable | Value |
|---|---|
| `SLACK_BOT_TOKEN` | xoxb-... from Slack app |
| `SLACK_CHANNEL_ID` | C0B692ZMGSZ (your channel) |
| `SLACK_SIGNING_SECRET` | from Slack app settings |
| `RESEND_API_KEY` | re_... from resend.com |
| `FROM_EMAIL` | exports@gopuexports.com |
| `OPENAI_API_KEY` | sk-... from OpenAI |
| `TWILIO_ACCOUNT_SID` | AC... from Twilio console |
| `TWILIO_AUTH_TOKEN` | from Twilio console |
| `TWILIO_WHATSAPP_FROM` | whatsapp:+14155238886 |
| `DIRECTOR_WHATSAPP_NUMBER` | whatsapp:+91XXXXXXXXXX |
| `SUPABASE_URL` | https://ogrmmhlaxfxrtpdzzwti.supabase.co |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_URL` | same as SUPABASE_URL |

After adding all vars → **Redeploy** once more.

---

## STEP 3 — Run SQL in Supabase (15 min)

Go to: supabase.com → ogrmmhlaxfxrtpdzzwti → SQL Editor

Run each block from **PENDING_SQL.md** in order (Steps 0 through 6).

Tables needed:
- `export_orders`
- `leads`
- `tasks`
- `founder_approvals`
- `agent_decisions`
- `integration_services`
- `agent_briefings`
- `cold_email_sequences`
- `cio_buyer_intelligence`
- `cto_credit_alerts`
- `cfo_wallet`
- `cfo_wallet_transactions`

---

## STEP 4 — Test Live App (5 min)

Visit: https://os.gopuexports.com (or gopu-os-cmo.vercel.app)

Check:
- [ ] CTO page → all integrated services show LIVE
- [ ] Slack "Send Report" button → message arrives in Slack
- [ ] Director Approvals → Approve/Reject works
- [ ] COO tasks → create and update task
- [ ] CFO wallet → balance shows

---

## WHAT WAS BUILT TONIGHT (Summary)

### APIs Created
- `api/cfo/dashboard.ts` — revenue, receivables, margins
- `api/cfo/receivables.ts` — payment tracking
- `api/cfo/margin-analytics.ts` — margin by product/country
- `api/cfo/wallet.ts` + `api/cfo/wallet/topup.ts` — creative budget wallet
- `api/coo/summary.ts` — ops overview
- `api/coo/tasks.ts` — task CRUD
- `api/director/approvals.ts` — founder approval wall
- `api/cto/health.ts` — integration health check
- `api/cto/payment-requirements.ts` — credit alerts
- `api/cto/provider-env/reveal.ts` — show actual API key value
- `api/cio/research.ts` — AI buyer research (GPT-4o-mini)
- `api/cio/summary.ts` — buyer intelligence overview
- `api/whatsapp/approval.ts` — send WhatsApp to Director
- `api/whatsapp/webhook.ts` — handle APPROVE/REJECT replies

### UI Fixes
- CTO provider page: reads real server-side env status (not import.meta.env)
- CTO: Vercel shows LIVE when deployed, LOCAL DEV on localhost
- CTO: Slack/Twilio/Resend/OpenAI show LIVE based on actual resolved keys
- CTO: Configured fields show •••••••••• with View/Hide button (reveals real key)
- Settings page: all 4 broken buttons now work (password, sessions, Slack test, save)
- Bulk actions fixed: Approve All, Reject All, Mark Completed, Escalate
- Alignment/spacing CSS overhaul
- Premium invoice CSS (white background, gradient bar)
- PWA manifest + apple touch icon meta tags
