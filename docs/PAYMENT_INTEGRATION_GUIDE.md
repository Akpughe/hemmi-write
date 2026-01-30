# Payment System Integration Guide

This document provides step-by-step instructions for integrating the payment and token system into your Hemmi AI application.

## Table of Contents
1. [Setup & Installation](#setup--installation)
2. [Database Migration](#database-migration)
3. [Environment Variables](#environment-variables)
4. [Integrate Token Checking into AI Routes](#integrate-token-checking-into-ai-routes)
5. [Add Components to UI](#add-components-to-ui)
6. [Testing](#testing)
7. [Deployment Checklist](#deployment-checklist)

---

## Setup & Installation

### 1. Install Required Packages

```bash
npm install stripe date-fns
```

### 2. Run Database Migrations

```bash
# Apply migrations in order
supabase migration up
```

Or if using Supabase CLI:

```bash
# Push migrations to Supabase
supabase db push
```

### 3. Regenerate Database Types

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/database.types.ts
```

---

## Database Migration

The migration files are located in:
- `supabase/migrations/20250117000000_payment_subscription_system.sql`
- `supabase/migrations/20250117000001_payment_rls_policies.sql`

**Important:** After running migrations, insert default pricing data by running the INSERT statements in the first migration file.

---

## Environment Variables

Add these variables to your `.env.local`:

```env
# Paystack (for NGN and some USD payments)
PAYSTACK_SECRET_KEY=sk_test_xxx  # Replace with your key
PAYSTACK_PUBLIC_KEY=pk_test_xxx  # Replace with your key
PAYSTACK_WEBHOOK_SECRET=whsec_xxx  # Optional, for webhook verification

# Stripe (for international USD payments)
STRIPE_SECRET_KEY=sk_test_xxx  # Replace with your key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx  # Replace with your key
STRIPE_WEBHOOK_SECRET=whsec_xxx  # Get this from Stripe dashboard

# App URL (for payment redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Update for production
```

**Production Setup:**
1. Replace all `_test_` keys with `_live_` keys
2. Update `NEXT_PUBLIC_APP_URL` to your production domain
3. Configure webhooks in Paystack and Stripe dashboards:
   - Paystack: `https://yourdomain.com/api/webhooks/paystack`
   - Stripe: `https://yourdomain.com/api/webhooks/stripe`

---

## Integrate Token Checking into AI Routes

Each AI generation route needs token checking. Here's the pattern:

### Example: `/app/api/write/generate-chapter/route.ts`

```typescript
import { requireAuth } from '@/lib/supabase/server';
import {
  checkTokenBalance,
  deductTokens,
  estimateChapterTokens,
  calculateActualTokens,
} from '@/lib/middleware/tokenMiddleware';

export async function POST(request: NextRequest) {
  try {
    // 1. ADD: Authenticate user
    const user = await requireAuth();

    const body = await request.json();
    const { chapter, sources, previousChaptersText, projectId } = body;

    // Validation...

    // 2. ADD: Estimate token usage
    const estimatedTokens = estimateChapterTokens({
      targetWordCount: chapter.estimatedWordCount || 5000,
      sourceCount: sources.length,
      hasContext: !!previousChaptersText,
    });

    console.log(`[Generate Chapter] Estimated tokens: ${estimatedTokens}`);

    // 3. ADD: Check token balance
    const tokenCheckError = await checkTokenBalance(user.id, estimatedTokens);
    if (tokenCheckError) {
      return tokenCheckError; // Return 402 Payment Required
    }

    // 4. EXISTING: Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let contentBuffer = "";

          // Existing streaming logic...
          for await (const chunk of aiService.streamChatCompletion(...)) {
            if (chunk.content) {
              contentBuffer += chunk.content;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            }

            if (chunk.done) {
              // 5. ADD: Calculate actual tokens and deduct
              const actualTokens = calculateActualTokens(contentBuffer);

              console.log(`[Generate Chapter] Deducting ${actualTokens} tokens`);

              await deductTokens(user.id, actualTokens, 'chapter', {
                projectId,
                chapterName: chapter.heading,
                wordCount: contentBuffer.split(/\s+/).length,
                estimatedTokens,
              });

              // Existing completion logic...
            }
          }

          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Handle other errors...
  }
}
```

### Routes to Update

Apply the same pattern to these routes:

1. **`/app/api/write/research/route.ts`**
   ```typescript
   import { estimateResearchTokens } from '@/lib/middleware/tokenMiddleware';

   const estimatedTokens = estimateResearchTokens({
     sourceCount: sources.length,
     depth: 'deep', // or based on user selection
   });
   ```

2. **`/app/api/write/structure/route.ts`**
   ```typescript
   import { estimateStructureTokens } from '@/lib/middleware/tokenMiddleware';

   const estimatedTokens = estimateStructureTokens({
     documentType,
     targetWordCount,
   });
   ```

3. **`/app/api/write/generate/route.ts`**
   - Similar to generate-chapter

4. **`/app/api/chat/route.ts`**
   ```typescript
   import { estimateChatTokens } from '@/lib/middleware/tokenMiddleware';

   const estimatedTokens = estimateChatTokens({
     messageLength: message.length,
     historyLength: messages.length,
     hasResearch: withResearch,
   });
   ```

### Error Handling on Frontend

When a route returns 402 Payment Required, show the paywall modal:

```typescript
// Example in your component
const handleGenerate = async () => {
  try {
    const response = await fetch('/api/write/generate-chapter', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.status === 402) {
      const error = await response.json();
      // Show paywall modal
      setShowPaywall(true);
      setPaywallMessage(error.message);
      return;
    }

    // Handle success...
  } catch (error) {
    console.error(error);
  }
};
```

---

## Add Components to UI

### 1. Add Token Balance to Header/Sidebar

```typescript
// In your header or sidebar component
import { TokenBalance } from '@/app/components/subscription/token-balance';

export function Header() {
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <header>
      {/* Other header content */}

      <TokenBalance
        variant="compact"
        onLowBalance={() => setShowPaywall(true)}
      />

      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
      />
    </header>
  );
}
```

### 2. Add Paywall Modal

```typescript
import { PaywallModal } from '@/app/components/subscription/paywall-modal';

// In your main app or workspace component
const [showPaywall, setShowPaywall] = useState(false);

// Show when API returns 402 or token balance is low
```

### 3. Add Subscription Management Page

Create `/app/workspace/subscription/page.tsx`:

```typescript
import { SubscriptionStatus } from '@/app/components/subscription/subscription-status';
import { TokenBalance } from '@/app/components/subscription/token-balance';

export default function SubscriptionPage() {
  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <h1 className="text-3xl font-bold">Subscription & Billing</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <TokenBalance variant="full" />
        <SubscriptionStatus />
      </div>

      {/* Add usage history, invoices, etc. */}
    </div>
  );
}
```

---

## Testing

### Test Webhooks Locally

Use Stripe CLI and ngrok:

```bash
# Stripe
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# For Paystack, use ngrok
ngrok http 3000
# Then configure webhook URL in Paystack dashboard
```

### Test Payment Flow

1. Go to `/pricing`
2. Select a plan and currency
3. Click "Get Started"
4. Complete payment with test card:
   - Stripe: `4242 4242 4242 4242`
   - Paystack: Use test keys and test cards from their docs

### Test Token Deduction

1. Subscribe to a plan
2. Check token balance in UI
3. Generate content (chapter, research, etc.)
4. Verify tokens are deducted
5. Check `token_usage` table in database

---

## Deployment Checklist

### Before Going Live

- [ ] Replace all test API keys with production keys
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Configure production webhooks in Paystack and Stripe dashboards
- [ ] Test webhook endpoints are accessible (not blocked by firewall)
- [ ] Verify RLS policies are enabled on all payment tables
- [ ] Run database migrations on production
- [ ] Insert pricing configuration data
- [ ] Test complete payment flow in production (with real small amount)
- [ ] Set up monitoring/alerts for failed payments
- [ ] Create admin dashboard for pricing config updates (optional)

### Webhook URLs for Production

Configure these in your payment gateway dashboards:

- **Paystack**: `https://yourdomain.com/api/webhooks/paystack`
  - Events to enable: `charge.success`, `subscription.create`, `subscription.disable`

- **Stripe**: `https://yourdomain.com/api/webhooks/stripe`
  - Events to enable: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`

### Monitoring

Monitor these tables for issues:
- `payment_history` - Check for failed payments
- `subscriptions` - Check for expiring/past_due subscriptions
- `token_usage` - Monitor usage patterns

---

## Support & Troubleshooting

### Common Issues

**Issue:** Webhooks not being received
- **Solution:** Check webhook URL is publicly accessible, verify webhook secrets match

**Issue:** Token deduction not working
- **Solution:** Check `token_usage` table permissions, verify RLS policies allow inserts via SECURITY DEFINER function

**Issue:** Pricing not loading on frontend
- **Solution:** Verify pricing_config table has data, check `/api/pricing` endpoint returns correctly

**Issue:** User can't see their subscription
- **Solution:** Check RLS policies on subscriptions table, verify user is authenticated

### Getting Help

- Check server logs for detailed error messages
- Review Supabase logs for database errors
- Check Stripe/Paystack dashboard for payment issues
- Review webhook delivery logs in payment gateway dashboards

---

## Phase 7: Subscription Expiry Cron Job

Create a Supabase Edge Function or use `pg_cron`:

```sql
-- Schedule daily job to mark expired subscriptions
SELECT cron.schedule(
  'mark-expired-subscriptions',
  '0 2 * * *', -- Run at 2 AM UTC daily
  $$
  UPDATE subscriptions
  SET status = 'expired', tokens_remaining = 0
  WHERE status = 'active'
  AND auto_renew = false
  AND current_period_end < NOW();
  $$
);
```

Or create a Next.js API route and call it with a cron service (e.g., Vercel Cron, GitHub Actions):

```typescript
// app/api/cron/expire-subscriptions/route.ts
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const count = await subscriptionService.markExpiredSubscriptions();

  return NextResponse.json({ expired: count }, { status: 200 });
}
```

---

## Conclusion

Your payment system is now fully integrated! Users can:
- ✅ Subscribe to plans
- ✅ Top up tokens
- ✅ View token balance
- ✅ Get blocked when tokens run out
- ✅ Manage subscriptions
- ✅ Make payments in NGN or USD

Next steps:
- Add usage analytics
- Create admin dashboard for pricing updates
- Implement referral system (optional)
- Add invoicing/receipts via email
