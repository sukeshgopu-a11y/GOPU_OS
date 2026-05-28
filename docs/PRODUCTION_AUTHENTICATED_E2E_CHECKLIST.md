# GOPU OS Authenticated Production E2E Checklist

Run this with a real founder/admin Supabase session after production env is configured.

## Required Setup

- Founder/admin can sign in.
- Latest Supabase migrations are applied.
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `LEAD_ADMIN_EMAIL` or `ADMIN_NOTIFICATION_EMAIL` are configured server-side.
- `SLACK_WEBHOOK_URL` is configured server-side if Slack launch alerts are enabled.
- WhatsApp env is either configured or intentionally disabled for launch.

## Checks

1. Lead creation
   - Open `/export-os/leads/new`.
   - Submit a complete lead.
   - Confirm the lead persists in Supabase.
   - Confirm customer thank-you email is sent.
   - Confirm admin notification email is sent.
   - Confirm a `Lead created` audit log row exists.

2. Shipment creation
   - Open shipment tracking.
   - Create a shipment for a verified buyer.
   - Confirm the shipment persists in Supabase.
   - Confirm a `Shipment created` audit log row exists.

3. Approval request
   - Trigger a founder approval from pricing, shipment delivery, or renewal mark-paid.
   - Confirm the approval request persists in Supabase.
   - Confirm WhatsApp status is `Disabled` when WhatsApp env is empty.
   - Confirm an `Approval requested` audit log row exists.

4. Renewal status update
   - Open Payment Vault renewals.
   - Click Mark Paid.
   - Confirm the action routes to founder approval and does not mark paid directly.
   - Confirm a `Renewal marked paid` audit log row exists.

5. Audit log creation
   - Open `/export-os/access-audit`.
   - Confirm new audit rows show action type, module, actor, description, risk, and timestamp.
