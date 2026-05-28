# Resend End-to-End Delivery Verification

Use this as the CTO final check for live email delivery.

## Required server-side environment

Set these in `.env.local` for local verification or in the deployment/server environment:

```env
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=GOPU Export OS <verified@yourdomain.com>
RESEND_TEST_TO=recipient@example.com
RESEND_E2E_DEADLINE_MS=30000
```

Do not create `VITE_RESEND_API_KEY`. Resend keys must never be exposed to browser code.

If `RESEND_FROM_EMAIL` uses `onboarding@resend.dev`, Resend only allows sending to the email address attached to the Resend account. For other recipients, use a verified domain sender.

## Run

```bash
npm run verify:resend
```

## Pass condition

The script must:

1. Send a real email through `POST https://api.resend.com/emails`.
2. Receive a Resend email ID.
3. Retrieve the sent email through `GET https://api.resend.com/emails/:id`.
4. Confirm `last_event=delivered` within 30 seconds.

## Failure meanings

- `RESEND_E2E_BLOCKED`: required env is missing or invalid.
- `RESEND_E2E_SEND_FAILED`: Resend rejected the send request.
- `RESEND_E2E_RETRIEVE_FAILED`: the sent email ID could not be retrieved.
- `RESEND_E2E_DELIVERY_FAILED`: Resend returned a failed delivery state such as bounced, complained, or suppressed.
- `RESEND_E2E_NOT_CONFIRMED_WITHIN_DEADLINE`: the send was accepted, but delivery was not confirmed within the configured verification window.

No password, OTP, PIN, API key, or full recipient list is printed by the verifier.
