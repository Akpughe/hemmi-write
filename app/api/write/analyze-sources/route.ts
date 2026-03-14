import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sourceAnalysisService } from '@/lib/services/sourceAnalysisService';
import { AIProvider, AIService } from '@/lib/services/aiService';
import {
  checkTokenBalance,
  deductTokens,
  estimateSourceAnalysisTokens,
  MIN_TOKENS,
} from '@/lib/middleware/tokenMiddleware';
import { tokenService } from '@/lib/services/tokenService';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await requireAuth();

    const body = await request.json();
    const { projectId, topic, documentType, academicLevel } = body;

    if (!projectId || !topic || !documentType) {
      return NextResponse.json(
        { error: 'projectId, topic, and documentType are required' },
        { status: 400 }
      );
    }

    // 2. Fetch sources from database
    const supabase = await createServerSupabaseClient();
    const { data: sources, error: fetchError } = await supabase
      .from('research_sources')
      .select('*')
      .eq('project_id', projectId);

    if (fetchError) {
      console.error('[AnalyzeSources] Failed to fetch sources:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch research sources' },
        { status: 500 }
      );
    }

    if (!sources || sources.length === 0) {
      return NextResponse.json(
        { error: 'No research sources found for this project' },
        { status: 404 }
      );
    }

    // 3. Check token balance
    const estimatedTokens = estimateSourceAnalysisTokens({ sourceCount: sources.length });
    const tokenCheckError = await checkTokenBalance(
      user.id,
      estimatedTokens,
      MIN_TOKENS.SOURCE_ANALYSIS
    );
    if (tokenCheckError) {
      return tokenCheckError;
    }

    // 4. Determine AI provider based on plan type
    const balance = await tokenService.getUserTokenBalance(user.id);
    const planType = balance.subscription?.planType || 'free';
    const provider = AIService.getEffectiveProvider(AIProvider.OPENAI, planType);

    // 5. Run source analysis
    const analysis = await sourceAnalysisService.analyzeSources({
      projectId,
      topic,
      documentType,
      academicLevel: academicLevel || 'undergraduate',
      sources: sources.map((s) => ({
        id: s.id,
        title: s.title,
        url: s.url,
        excerpt: s.excerpt || undefined,
        author: s.author || undefined,
        publishedDate: s.published_date || undefined,
        fullContent: s.full_content || undefined,
      })),
      provider,
    });

    // 6. Deduct tokens
    const actualTokens = estimatedTokens;
    await deductTokens(user.id, actualTokens, 'source_analysis', {
      projectId,
      sourceCount: sources.length,
      topic,
      documentType,
    });

    console.log(
      `[AnalyzeSources] Success - Deducted ${actualTokens} tokens for ${sources.length} sources`
    );

    return NextResponse.json({ analysis });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('[AnalyzeSources] API error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during source analysis' },
      { status: 500 }
    );
  }
}
