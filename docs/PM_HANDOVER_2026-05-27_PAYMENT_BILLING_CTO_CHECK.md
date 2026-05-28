# GOPU Export OS PM Handover - Payment Billing + CTO Verification Check

Date prepared: 26 May 2026
Review date: 27 May 2026
Prepared for: incoming project manager / implementation owner
Scope: Payment Vault billing-method state, secure payment rules, CTO Supabase final check, Resend verification, and tomorrow QA checklist.

## 1. Executive Summary

The screenshot showing `Billing Method Detail / No Method Connected` is not currently a broken UI state. It is the intended safe default because no live payment provider token has been returned to GOPU Export OS.

The system is designed so GOPU OS must never collect or store raw card numbers, CVV, OTP values, banking passwords, or arbitrary payment credentials. Billing methods should only appear after a gateway returns token metadata such as a token reference, masked card label, expiry metadata, owner, limits, linked vendors, and safe audit events.

For tomorrow, the PM should verify whether this state is still acceptable for MVP or whether the next engineering task should be to connect a real payment provider tokenization flow.

## 2. Screenshot Interpretation

Observed UI:

`Billing Method Detail`
`No Method Connected`
`Connect a billing method through the payment provider. GOPU OS will store token metadata only.`

Meaning:

- No live gateway token exists in frontend state.
- No tokenized billing method has been created in the current session.
- The app is intentionally blocking display of any card/payment method until safe token metadata exists.
- This is aligned with the payment security rule: provider handles raw card entry; GOPU OS stores token metadata only.

What it is not:

- It is not proof that payments are connected.
- It is not a completed billing setup.
- It is not a backend-confirmed payment method.
- It is not a card form.

## 3. Primary Files Reviewed

Main Payment Vault implementation:

- `src/main.jsx`
  - `paymentProviderConnected = false` at line 12035.
  - `billingMethodConnectedSeed` starts at line 12074.
  - `resolveRenewalDecision()` starts at line 12143.
  - `safeRenewalAuditNote()` starts at line 12155.
  - `PaymentVaultDashboard()` starts at line 12159.
  - `connectBillingMethodDemo()` starts at line 12205.
  - `PaymentVaultWorkspace()` starts at line 12337.
  - `BillingVaultOverview()` starts at line 12381.
  - `BillingMethodsPanel()` starts at line 12398.
  - `BillingMethodDetailPanel()` starts at line 12435.
  - `ConnectBillingMethodModal()` starts at line 12512.

Payment Vault styles:

- `src/styles.css`
  - Payment vault tabs around line 15154.
  - Secure payment vault section begins around line 20905.
  - Billing method table starts around line 20978.
  - Connect billing modal starts around line 21145.

CFO payment service:

- `src/services/cfoService.js`
  - Payment Vault summary is demo/service-layer data.
  - Payment rules reinforce: infrastructure-only auto-pay, OTP never stored, supplier/freight/customs/tax never auto-paid.

Supabase/payment schema:

- `supabase/migrations/20260526120000_live_operational_platform.sql`
  - `payment_vault` table starts at line 216.
  - `billing_methods` table starts at line 235.
  - `billing_methods_no_raw_card` constraint at line 247.

CTO integration verification:

- `src/lib/supabaseClient.js`
  - `checkSupabaseConnection()` starts at line 46.
- `src/main.jsx`
  - `CTO_FAST_VERIFICATION_TIMEOUT_MS = 12000` at line 10215.
  - `verifyResendKey()` starts at line 16085.

## 4. Current Payment Vault Behavior

Route areas:

- `/export-os/payment-vault`
- `/export-os/payments`
- `/export-os/finance`
- CFO tab: Payment Vault

Default state:

- `paymentProviderConnected` is hardcoded as `false`.
- `billingMethods` state initializes to `[]` unless `paymentProviderConnected` is true.
- Therefore the Billing Methods tab correctly shows:
  - no connected method,
  - no raw payment details,
  - a call to action to connect through provider tokenization.

Demo connect behavior:

- `Connect Billing Method` opens `ConnectBillingMethodModal`.
- The modal simulates provider token metadata.
- `connectBillingMethodDemo()` creates a tokenized method in local React state only.
- It does not connect to Stripe, Razorpay, bank, card processor, or real payment gateway.
- It writes a safe audit row saying raw card number, CVV, OTP, and banking credentials were not stored.

Important PM note:

The connected billing method shown after using the modal is a demo tokenized object, not a real payment provider token.

## 5. Security Rules That Must Not Be Broken

Do not add any field for:

- full card number,
- CVV,
- OTP value,
- banking password,
- internet banking credentials,
- UPI PIN,
- raw payment API secret in browser UI.

The system may store/display:

- provider name,
- token reference,
- masked reference,
- expiry month/year,
- billing owner,
- linked trusted vendors,
- monthly limit,
- per-transaction limit,
- auto-renew flag,
- risk state,
- safe audit note.

OTP rule:

- Founder receives OTP externally.
- Founder securely shares OTP with CFO.
- CFO enters OTP once into the provider/payment flow.
- GOPU OS may log the OTP challenge event.
- GOPU OS must never store, log, reuse, auto-read, or AI-process the OTP value.

## 6. Payment Rules Currently Represented

Auto-payment is intended only for trusted infrastructure vendors:

- OpenAI
- Supabase
- Vercel
- Cloudflare
- Resend
- WhatsApp API
- Domain / SSL Provider

Amount logic in `resolveRenewalDecision()`:

- No tokenized method: blocked.
- Inactive or expired token: blocked.
- Unknown/high-risk vendor: blocked.
- Amount <= INR 1,000 and within method/rule limit: auto-renew ready.
- Amount <= INR 1,500: CFO + COO confirmation required.
- Amount > INR 1,500: Director review required.

Never auto-pay:

- suppliers,
- freight,
- customs,
- taxes,
- salaries,
- refunds,
- arbitrary invoices,
- unknown vendors.

## 7. Current CTO / Supabase State

Supabase project found:

- Project ref: `fqepkwnjdlmauskofafd`
- Project name: `gopu-exports`
- Project status reported by Supabase connector: `ACTIVE_HEALTHY`

Frontend env:

- `.env` and `.env.local` exist locally.
- `.gitignore` excludes `.env` and `.env.local`.
- `.env.example` contains placeholder variables for public/publishable Supabase keys.

Important current behavior:

- `checkSupabaseConnection()` now checks Supabase auth session first.
- If no app session exists, CTO should show `Verification Required` / auth required rather than incorrectly claiming live tenant data.
- After authenticated session exists, it queries `platform_health`.

PM must verify tomorrow:

- CTO should not show fake Supabase connected state before login/session validation.
- CTO should clearly explain whether the blocker is env, auth session, RLS, table access, or network.

## 8. Current Resend Verification State

Earlier issue:

- Resend was previously like other generic integrations: it could sit in pending/manual verification instead of performing a concrete check.

Current implementation:

- `CTO_FAST_VERIFICATION_TIMEOUT_MS = 12000`.
- `verifyResendKey()` verifies a pasted Resend key by calling the Resend domains API.
- Bad/invalid Resend key test returned quickly in about 639 ms.
- Build passed after change.

Expected behavior:

- If key is missing: show clear error.
- If key is too short: show clear error.
- If key does not start with `re_`: show clear Resend format error.
- If API rejects key: show failure with response status.
- If API succeeds: show connected, but email sending remains approval-gated.
- No verification should hang for 30 seconds or more.

PM note:

The direct browser call may still be limited by CORS or provider policy in some environments. If that happens, the correct next engineering step is a backend verification endpoint, not pretending the key is connected.

## 9. Current Slack / WhatsApp Rule

User direction:

- Daily briefing and daily update should use WhatsApp.
- Everything else should use Slack.

Current state:

- CTO integration rows include WhatsApp and Slack.
- WhatsApp is still webhook/setup pending.
- Slack is still workspace/setup pending.

Tomorrow PM should verify that future workflow rules follow:

- WhatsApp: daily briefing, daily update, overdue founder escalation only if explicitly required.
- Slack: routine internal alerts, workflow updates, non-daily notifications, team coordination.

## 10. Tomorrow QA Checklist

Run this checklist in order.

1. Start a fresh dev server after env is loaded:

```powershell
npm run dev -- --port 5175
```

2. Open:

```text
http://127.0.0.1:5175/export-os/payment-vault
```

3. Go to `Billing Methods`.

Expected before connecting:

- Summary says payment provider not connected.
- Billing method table says no tokenized billing method connected.
- Detail panel says no method connected.
- No raw card fields are visible in the normal page.

4. Click `Connect Billing Method`.

Expected:

- Modal opens.
- It should feel like provider tokenization metadata, not a real internal card vault.
- If demo fields exist, confirm they are labelled as secure/provider/demo and do not imply GOPU stores raw card credentials.

5. Submit demo/tokenized method.

Expected:

- Billing method appears in table.
- Detail panel updates to token reference/masked reference.
- Audit log records safe metadata only.
- No OTP/card/CVV value appears anywhere.

6. Test renewal decision logic with seeded vendors.

Expected:

- Trusted infra vendors under cap can be ready/conditional.
- Unknown vendor is blocked.
- Amount above INR 1,500 requires Director review.

7. Open CTO:

```text
/export-os/executives/cto
```

Expected:

- Supabase panel explains actual state.
- If not signed in, it should say auth/session verification is required.
- If signed in and RLS/table access passes, it should show live connected.

8. Open Integration Vault / Resend.

Expected:

- Resend verification completes or fails in less than 12 seconds.
- Invalid key returns clear failure.
- No fake connected state is shown.

9. Run build:

```powershell
npm run build
```

Expected:

- Build passes.
- Large chunk warning may remain; it is not blocking.

## 11. Known Gaps / Next Engineering Tasks

Payment provider:

- Real provider integration is not connected.
- Need decide Stripe vs Razorpay vs other gateway.
- Need backend endpoint for creating setup intent/tokenized method.
- Need webhook for provider token lifecycle events.
- Need backend audit table writes for billing method connected/rotated/disabled events.

Payment security:

- Keep raw card/OTP/password data out of frontend and database.
- Confirm provider token metadata schema matches final chosen provider.
- Confirm token rotation and token disable flows.

Supabase:

- Confirm final auth flow before using CTO live data as production truth.
- Check RLS policies for real tenant/user membership, not only demo tenant behavior.
- Check that public/publishable key never has write access beyond intended policies.

Resend:

- Direct API verification is implemented, but production should move verification to backend to avoid CORS/provider browser limitations.
- Sending domain verification should be added after key verification.
- Buyer-facing email sending must remain approval-gated.

Notifications:

- Implement WhatsApp vs Slack routing rule in workflow/event layer.
- WhatsApp for daily briefing/update.
- Slack for normal internal alerts and workflow movement.

UX:

- Confirm Billing Method empty state does not look like a broken screen.
- Add a short explanation near the empty-state detail panel if PM/user still thinks it is broken.
- Confirm mobile version of Payment Vault Billing Methods tab has no overflow.

## 12. Handover Risks

High:

- Real payment provider is not connected yet.
- Do not let demo tokenization be mistaken for real payment readiness.
- Do not store raw payment data under pressure to "make it work fast".

Medium:

- CTO Supabase live check now depends on authenticated app session before claiming live tenant data.
- Resend direct verification may need backend proxy if browser/provider blocks request.

Low:

- Payment Vault display logic is mostly in one large `src/main.jsx`, which makes future maintenance harder.
- Consider extracting Payment Vault components later, but do not refactor during stabilization unless necessary.

## 13. Recommendation To Next PM

Treat tomorrow as a stabilization/verification day, not a feature expansion day.

Recommended order:

1. Verify Payment Vault empty state and demo token flow.
2. Confirm no forbidden payment secrets are stored or displayed.
3. Confirm CTO Supabase status is honest after login/session check.
4. Confirm Resend verification returns in under 12 seconds.
5. Decide real payment provider integration path.
6. Write a small ticket for backend payment-token creation and webhook handling.
7. Write a small ticket for Slack/WhatsApp routing rules.

Do not mark billing methods as live until a real provider returns token metadata and backend audit confirms it.

