/**
 * Token Usage History API
 * GET: Fetch user's token usage history
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Get query parameters for pagination
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createServerSupabaseClient();

    // Fetch usage history
    const { data: usage, error, count } = await supabase
      .from('token_usage')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Token Usage API] Error:', error);
      throw error;
    }

    // Get total usage stats
    const { data: stats } = await supabase
      .from('token_usage')
      .select('tokens_used')
      .eq('user_id', user.id);

    const totalUsed = stats?.reduce((sum, record) => sum + record.tokens_used, 0) || 0;

    return NextResponse.json(
      {
        data: {
          usage: usage || [],
          pagination: {
            total: count || 0,
            limit,
            offset,
            hasMore: (count || 0) > offset + limit,
          },
          stats: {
            totalTokensUsed: totalUsed,
          },
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('[Token Usage API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token usage history' },
      { status: 500 }
    );
  }
}
