import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { referralService } from '@/lib/services/referralService';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const referralsLimit = parseInt(searchParams.get('referralsLimit') || '20', 10);
    const referralsOffset = parseInt(searchParams.get('referralsOffset') || '0', 10);
    const pointsLimit = parseInt(searchParams.get('pointsLimit') || '20', 10);
    const pointsOffset = parseInt(searchParams.get('pointsOffset') || '0', 10);

    const [referralsData, pointsData] = await Promise.all([
      referralService.getUserReferrals(user.id, referralsLimit, referralsOffset),
      referralService.getPointsHistory(user.id, pointsLimit, pointsOffset),
    ]);

    return NextResponse.json({
      data: {
        referrals: referralsData.referrals,
        referralsPagination: {
          total: referralsData.total,
          limit: referralsLimit,
          offset: referralsOffset,
          hasMore: referralsOffset + referralsLimit < referralsData.total,
        },
        pointsHistory: pointsData.points,
        pointsPagination: {
          total: pointsData.total,
          limit: pointsLimit,
          offset: pointsOffset,
          hasMore: pointsOffset + pointsLimit < pointsData.total,
        },
      },
    });
  } catch (error) {
    console.error('[API /referral/stats] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referral stats' },
      { status: 500 }
    );
  }
}
