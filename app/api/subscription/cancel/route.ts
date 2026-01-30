/**
 * Cancel Subscription API
 * POST: Cancel user's active subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/server';
import { subscriptionService } from '@/lib/services/subscriptionService';
import { paymentService } from '@/lib/services/paymentService';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Missing subscriptionId' },
        { status: 400 }
      );
    }

    // Get subscription to verify ownership and get gateway info
    const subscription = await subscriptionService.getActiveSubscription(
      user.id
    );

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    if (subscription.id !== subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription not found or not owned by user' },
        { status: 403 }
      );
    }

    // Cancel at payment gateway if there's a gateway subscription ID
    if (subscription.gatewaySubscriptionId) {
      try {
        await paymentService.cancelSubscription(
          subscription.paymentGateway,
          subscription.gatewaySubscriptionId
        );
      } catch (gatewayError) {
        console.error(
          '[Cancel Subscription] Gateway cancellation error:',
          gatewayError
        );
        // Continue with database cancellation even if gateway fails
      }
    }

    // Cancel in database
    const cancelledSubscription = await subscriptionService.cancelSubscription(
      subscriptionId,
      user.id
    );

    return NextResponse.json(
      {
        data: {
          subscription: cancelledSubscription,
          message: 'Subscription cancelled successfully',
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('[Cancel Subscription API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
