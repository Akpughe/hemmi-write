/**
 * Token Balance API
 * GET: Fetch user's current token balance
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/server';
import { tokenService } from '@/lib/services/tokenService';

export async function GET() {
  try {
    const user = await requireAuth();

    // Get token balance and subscription info
    const balance = await tokenService.getUserTokenBalance(user.id);

    return NextResponse.json(
      {
        data: {
          tokens: balance.tokens,
          subscription: balance.subscription,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('[Token Balance API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token balance' },
      { status: 500 }
    );
  }
}
