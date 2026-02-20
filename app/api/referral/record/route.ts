import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { referralService } from '@/lib/services/referralService';

export async function POST(request: NextRequest) {
  try {
    let user = null;
    
    // First try to get user from Authorization header (for OAuth callback flow)
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      // Create a Supabase client with the access token
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabaseWithToken = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });
      const { data } = await supabaseWithToken.auth.getUser();
      user = data.user;
    }
    
    // Fallback to cookie-based auth
    if (!user) {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
    }

    if (!user) {
      console.log('[API /referral/record] No user found, unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[API /referral/record] User authenticated:', user.id);

    const body = await request.json();
    const { referralCode } = body;

    console.log('[API /referral/record] Referral code received:', referralCode);

    if (!referralCode || typeof referralCode !== 'string') {
      return NextResponse.json(
        { error: 'Referral code is required' },
        { status: 400 }
      );
    }

    // Check if user was already referred
    const wasReferred = await referralService.wasUserReferred(user.id);
    console.log('[API /referral/record] Was user already referred?', wasReferred);
    
    if (wasReferred) {
      return NextResponse.json({
        data: { success: false, reason: 'already_referred' },
      });
    }

    // Record the referral
    console.log('[API /referral/record] Recording referral signup...');
    const success = await referralService.recordReferralSignup(
      referralCode,
      user.id
    );
    console.log('[API /referral/record] Referral signup result:', success);

    return NextResponse.json({
      data: { success },
    });
  } catch (error) {
    console.error('[API /referral/record] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to record referral' },
      { status: 500 }
    );
  }
}
