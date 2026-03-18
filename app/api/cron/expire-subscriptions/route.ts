/**
 * Cron endpoint to expire subscriptions past their end date.
 * Fallback/manual trigger — primary scheduling is via pg_cron.
 * Secured with CRON_SECRET via Authorization: Bearer header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { subscriptionService } from '@/lib/services/subscriptionService';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expiredCount =
      await subscriptionService.markExpiredSubscriptions();

    return NextResponse.json({
      success: true,
      expired_count: expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] expire-subscriptions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
