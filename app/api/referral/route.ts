import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { referralService } from '@/lib/services/referralService';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [code, stats, config] = await Promise.all([
      referralService.getOrCreateReferralCode(user.id),
      referralService.getUserReferralStats(user.id),
      referralService.getReferralConfig(),
    ]);

    return NextResponse.json({
      data: {
        referralCode: code,
        stats,
        config,
      },
    });
  } catch (error) {
    console.error('[API /referral] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referral data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, points } = body;

    if (action === 'redeem_tokens') {
      if (!points || typeof points !== 'number' || points <= 0) {
        return NextResponse.json(
          { error: 'Invalid points amount' },
          { status: 400 }
        );
      }

      const result = await referralService.redeemPointsForTokens(user.id, points);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        data: {
          success: true,
          tokensAwarded: result.tokensAwarded,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[API /referral] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process referral action' },
      { status: 500 }
    );
  }
}
