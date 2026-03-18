# Subscription Expiry Cron Job

**Date:** 2026-03-14
**Status:** Approved

## Problem

Active subscriptions that pass their `current_period_end` date are never marked as expired. The existing `mark_expired_subscriptions()` SQL function only targets subscriptions with `auto_renew = FALSE`, so auto-renewing subscriptions whose payment gateway fails to send a webhook remain active indefinitely.

Example: A Basic Monthly subscription ended Mar 02, 2026 but still shows "Active" on Mar 14, 2026 because `auto_renew = TRUE`.

## Solution

Expire ALL active subscriptions past their end date, regardless of `auto_renew` setting. The webhook-driven renewal flow (`renewSubscription()`) resets `current_period_end` to a future date on successful payment, so the cron will never expire a legitimately renewed subscription.

## Changes

### 1. Supabase Migration

**New migration:** `20260314100000_fix_subscription_expiry_cron.sql`

- Replace `mark_expired_subscriptions()` function, removing the `auto_renew = FALSE` condition
- Enable `pg_cron` extension
- Schedule daily execution at 2 AM UTC

### 2. TypeScript Service Fix

**File:** `lib/services/subscriptionService.ts`

Remove `.eq('auto_renew', false)` from `markExpiredSubscriptions()` method.

### 3. API Endpoint (Fallback/Manual Trigger)

**New file:** `app/api/cron/expire-subscriptions/route.ts`

- GET endpoint secured with `CRON_SECRET` via `Authorization: Bearer <secret>` header
- Calls `subscriptionService.markExpiredSubscriptions()`
- Returns count of expired subscriptions

### 4. Immediate Fix

Run `SELECT mark_expired_subscriptions();` after deploying the updated function to expire the stale subscription.

## Architecture

```
Payment Gateway (Stripe/Paystack)
  │
  ├─ Successful renewal webhook ──► renewSubscription() ──► extends current_period_end
  │
  └─ Failed/missing webhook ──► (no action)
                                      │
                                      ▼
pg_cron (daily 2 AM UTC) ──► mark_expired_subscriptions()
                                      │
                                      ▼
                              Marks as 'expired', zeros tokens

/api/cron/expire-subscriptions ──► Same function (manual fallback)
```

## What Does NOT Change

- Webhook handlers for Stripe/Paystack
- `renewSubscription()` flow
- Token middleware
- Pricing or plan logic
