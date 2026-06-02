# API Keys & Setup — Tomorrow's Checklist

## 1. Resend (Transactional Email)
- Sign up at resend.com
- Get API key → add to Vercel as `RESEND_API_KEY`
- Add `FROM_EMAIL` = exports@gopuexports.com
- Verify domain gopuexports.com in Resend dashboard

## 2. WhatsApp via Meta (Director Approvals)
- Go to developers.facebook.com → Create App → Business
- Add WhatsApp product
- Register a new phone number
- Get these and add to Vercel:
  - `META_WHATSAPP_TOKEN` — permanent access token
  - `META_PHONE_NUMBER_ID` — phone number ID from Meta
  - `DIRECTOR_WHATSAPP_NUMBER` — director's number e.g. +919876543210
- I will update api/whatsapp/approval.ts to use Meta API instead of Twilio
- No Twilio needed

## 3. Supabase SQL Tables
- Go to supabase.com → ogrmmhlaxfxrtpdzzwti → SQL Editor
- Run all blocks from PENDING_SQL.md (Steps 0 through 6)
- Tables: export_orders, leads, tasks, founder_approvals, agent_decisions,
  integration_services, agent_briefings, cold_email_sequences,
  cio_buyer_intelligence, cto_credit_alerts, cfo_wallet, cfo_wallet_transactions,
  invoices, invoice_company_snapshot, invoice_buyer_snapshot, invoice_line_items,
  invoice_export_details, invoice_validation_logs, invoice_approval_events,
  invoice_audit_log
- 2026-06-01 check: production `public.invoices` is missing; Supabase connector did not have permission to apply the migration directly.

## 4. Fix Vercel Auto-Deploy
- Vercel → gopu-os-cmo → Settings → Git
- Disconnect and reconnect sukeshgopu-a11y/GOPU_OS
- So future git pushes auto-deploy without manual vercel --prod

## 4A. Domain + Canva Reminders - 2026-06-02
- Fix or verify `os.gopuexports.com` DNS so Safari opens the custom domain reliably.
  - Checked 2026-06-01 after Vercel deployment: Vercel alias exists, but DNS still does not resolve from this machine.
- Confirm CMO Canva production template IDs:
  - Knowledge Carousel
  - Shipment Announcement
  - Market Update
  - Product Spotlight
  - Buyer Education

## 5. Already Have (No Action Needed)
- SLACK_BOT_TOKEN ✅
- SLACK_CHANNEL_ID ✅
- SLACK_WEBHOOK_URL ✅
- SLACK_SIGNING_SECRET ✅
- OPENAI_API_KEY ✅
- SUPABASE_URL ✅
- SUPABASE_SERVICE_ROLE_KEY ✅
- VITE_SUPABASE_URL ✅
- VITE_SUPABASE_ANON_KEY ✅
