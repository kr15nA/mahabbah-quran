# Operational Runbook: Automated Recurring Billing Cron

**Document ID:** OPS-CRON-RECURRING-001  
**Sprint Baseline:** COVERAGE-SPRINT-04 (`OPS-BASE-001`)  
**Status:** IMPLEMENTED & DEPLOYMENT-READY (Business Schedule Pending)

---

## 1. Overview & Architecture

The recurring billing automation engine generates monthly student fee invoices for active configurations and assignments across the active academic year.

- **Endpoint Path:** `/api/cron/recurring-billing`
- **Supported HTTP Methods:** `GET`, `POST`
- **Authentication Scheme:** `Authorization: Bearer <CRON_SECRET>` (strictly constant-time comparison)
- **Centralized Env Helper:** `getCronSecret()` in `lib/config/env.ts`
- **Idempotency Guarantee:** Backed by database unique constraints on `finance_billing_runs` (`academic_year_id`, `fee_type_id`, `period`) and `finance_invoices` (`student_id`, `fee_type_id`, `period`). Re-running for the same period will safely skip existing invoices and produce zero duplicates.

---

## 2. Environment Variables & Credentials

| Variable | Description | Security Requirement |
|---|---|---|
| `CRON_SECRET` | Shared secret token authorizing invocation | Minimum 32-character high-entropy secret. Never commit to repository or expose to frontend. |

### Configuration Rules:
1. In Vercel / deployment environment, set `CRON_SECRET` under Project Settings > Environment Variables.
2. In local development or testing, add `CRON_SECRET=your_secure_random_token` to `.env.local`.
3. If `CRON_SECRET` is missing on the server, the endpoint fails closed immediately with HTTP `500` without exposing error stack traces or environment variables.

---

## 3. Authentication & Security Boundary

1. **Header Format:**
   ```http
   Authorization: Bearer <CRON_SECRET>
   ```
2. **Forbidden Query Authentication:**
   - Any request passing tokens via query parameters (`?secret=...`, `?token=...`, `?cron_secret=...`) is strictly rejected with HTTP `400 Bad Request`.
3. **Timing-Safe Comparison:**
   - Implemented via `crypto.timingSafeEqual` over matching buffer byte lengths to prevent side-channel timing attacks.
4. **Middleware Bypass:**
   - The path `/api/cron` is registered in `middleware.ts` as a public route bypass, allowing the cron route handler to perform its own authoritative cryptographic Bearer verification without requiring user session cookies (`mq_session`).

---

## 4. Operational Invocation & Parameters

### Request Options:
- **Default Execution (Current Month):**
  If no `period` parameter is provided, the endpoint automatically calculates the target period using the current date in Asia/Jakarta timezone (`UTC+7`, format `YYYY-MM`).
- **Explicit Period Execution:**
  Pass `?period=YYYY-MM` in query string or `{ "period": "YYYY-MM" }` in JSON body (POST).

### Example Curl Commands:

#### Dry Run / Manual Trigger via Terminal:
```bash
# Execute for current period
curl -s -X POST https://your-domain.com/api/cron/recurring-billing \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json"

# Execute for explicit period (e.g. 2026-10)
curl -s -X POST https://your-domain.com/api/cron/recurring-billing?period=2026-10 \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

#### Successful Response (HTTP 200):
```json
{
  "success": true,
  "period": "2026-10",
  "processedRules": 2,
  "generatedInvoices": 15,
  "skippedDuplicates": 0,
  "errors": []
}
```

#### Re-run Response (Idempotent, Zero Duplicates):
```json
{
  "success": true,
  "period": "2026-10",
  "processedRules": 2,
  "generatedInvoices": 0,
  "skippedDuplicates": 15,
  "errors": []
}
```

---

## 5. Deployment & Scheduler Setup

### Vercel Cron Configuration:
> **Important:** Do NOT guess or invent an arbitrary cron execution time. The exact business schedule (e.g., 1st day of month vs 25th day of month, exact hour UTC/WIB) is pending formal business and finance department approval.

When business schedule approval is finalized, configure `vercel.json` as follows:
```json
{
  "crons": [
    {
      "path": "/api/cron/recurring-billing",
      "schedule": "<APPROVED_CRON_SCHEDULE>"
    }
  ]
}
```
*Note: Vercel Cron automatically includes `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is configured in project environment variables.*

### External Scheduler Alternative (e.g. GitHub Actions, AWS EventBridge, Cloudflare Workers):
- Create a scheduled job (cron).
- Send HTTP POST to `https://<domain>/api/cron/recurring-billing`.
- Set header: `Authorization: Bearer <CRON_SECRET>`.

---

## 6. Failure Modes & Incident Handling

| HTTP Code | Cause | Action |
|---|---|---|
| `400` | Query parameter token used or malformed period string (`!YYYY-MM`) | Verify scheduler sends token in Authorization header, and period is `YYYY-MM`. |
| `401` | Missing or mismatched `CRON_SECRET` | Verify scheduler secret matches server environment `CRON_SECRET`. |
| `422` | No active academic year found encompassing the target period | Verify active academic year is configured in Admin Academic Year settings for that date range. |
| `500` | `CRON_SECRET` missing on server or unexpected runtime exception | Verify environment variable exists; check server error logs for DB timeout. |

### Observability & Audit Trail:
- Each run writes a system audit record to `audit_logs` with:
  - `action`: `CRON_RECURRING_BILLING_COMPLETED`
  - `entityType`: `RECURRING_BILLING`
  - `metadata`: Contains `period`, `academicYearId`, `processedRules`, `generatedInvoices`, `skippedDuplicates`, `errorsCount`, `startedAt`, `completedAt`.
- Detailed per-rule execution metrics can also be inspected directly in the Admin portal at `/admin/keuangan/tagihan/berulang`.
