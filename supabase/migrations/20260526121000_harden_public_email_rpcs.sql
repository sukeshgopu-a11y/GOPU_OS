-- Harden existing website email-delivery RPCs.
-- Browser roles must not execute SECURITY DEFINER functions directly.

revoke execute on function public.record_inquiry_email_delivery(uuid, text, boolean, timestamp with time zone, text, boolean, timestamp with time zone, text) from public, anon, authenticated;
revoke execute on function public.record_quote_email_delivery(uuid, text, boolean, timestamp with time zone, text, boolean, timestamp with time zone, text) from public, anon, authenticated;
