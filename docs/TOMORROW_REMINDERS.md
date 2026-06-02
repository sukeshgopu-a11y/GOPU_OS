# Tomorrow Reminders - 2026-06-02

1. Fix or verify `os.gopuexports.com` DNS so the custom domain resolves reliably.
   - Checked 2026-06-01 after Vercel deployment: Vercel alias exists, but DNS still does not resolve from this machine.
2. Confirm production Canva template IDs for CMO templates:
   - Knowledge Carousel
   - Shipment Announcement
   - Market Update
   - Product Spotlight
   - Buyer Education
3. Run the Supabase invoice table migration in production SQL editor:
   - `invoices`
   - `invoice_company_snapshot`
   - `invoice_buyer_snapshot`
   - `invoice_line_items`
   - `invoice_export_details`
   - `invoice_validation_logs`
   - `invoice_approval_events`
   - `invoice_audit_log`
   - Connector check on 2026-06-01 was blocked by Supabase permission.
