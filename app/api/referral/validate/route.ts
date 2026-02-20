import { NextRequest, NextResponse } from 'next/server';
import { referralService } from '@/lib/services/referralService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const referralCode = await referralService.getReferralCodeByCode(code);

    return NextResponse.json({
      data: {
        valid: !!referralCode,
      },
    });
  } catch (error) {
    console.error('[API /referral/validate] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to validate referral code' },
      { status: 500 }
    );
  }
}
