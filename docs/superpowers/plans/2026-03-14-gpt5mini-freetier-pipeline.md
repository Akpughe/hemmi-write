# GPT-5-mini, Free Tier & Pipeline Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GPT-5-mini as AI provider, create a free tier with 20k signup tokens, and overhaul the research/writing pipeline with source intelligence, rewritten prompts, and argument threading.

**Architecture:** OpenAI SDK added as 4th AI provider alongside Groq/Gemini/Anthropic. Free tier auto-created via DB trigger on signup. New source analysis step between research and writing maps sources to sections. Prompts rewritten for thesis-first, synthesis-oriented output. Argument summaries threaded across chapters via DB persistence.

**Tech Stack:** Next.js 16, OpenAI SDK (`openai` + `@ai-sdk/openai`), Supabase PostgreSQL, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-14-gpt5mini-freetier-prompt-overhaul-design.md`

---

## Chunk 1: GPT-5-mini Model Integration

### Task 1: Install OpenAI dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
npm install openai @ai-sdk/openai
```

- [ ] **Step 2: Add env variable to .env.example**

Add to `.env.example`:
```
OPENAI_API_KEY=your_openai_api_key_here
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: install openai and @ai-sdk/openai dependencies"
```

---

### Task 2: Add OPENAI provider to model config

**Files:**
- Modify: `lib/config/aiModels.ts`

- [ ] **Step 1: Add OPENAI to AIProvider enum**

In `lib/config/aiModels.ts`, add `OPENAI = 'OPENAI'` to the `AIProvider` enum after `ANTHROPIC`.

- [ ] **Step 2: Add OPENAI model config to AI_MODELS**

Add this entry to the `AI_MODELS` record:

```typescript
[AIProvider.OPENAI]: {
  provider: AIProvider.OPENAI,
  model: 'gpt-5-mini',
  label: 'GPT-5 Mini',
  description: 'Fast, cost-effective model for research and writing',
  maxTokens: 16000,
  contextWindow: 400000,
  icon: '🔷',
},
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: Build succeeds. Any file importing `AIProvider` will now have access to `OPENAI`.

- [ ] **Step 4: Commit**

```bash
git add lib/config/aiModels.ts
git commit -m "feat(aiModels): add OPENAI provider with GPT-5-mini config"
```

---

### Task 3: Add OpenAI streaming and non-streaming to aiService

**Files:**
- Modify: `lib/services/aiService.ts`

- [ ] **Step 1: Add OpenAI import and initialization**

At the top of `lib/services/aiService.ts`, add:

```typescript
import OpenAI from 'openai';
```

In the constructor, after the Anthropic initialization block, add:

```typescript
// Initialize OpenAI if API key exists
if (process.env.OPENAI_API_KEY) {
  this.openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}
```

Add the private field alongside the others:

```typescript
private openai: OpenAI | null = null;
```

- [ ] **Step 2: Add `streamOpenAICompletion` method**

Add after `streamClaudeCompletion`:

```typescript
/**
 * OpenAI streaming implementation
 */
private async *streamOpenAICompletion(
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): AsyncGenerator<StreamChunk> {
  if (!this.openai) {
    throw new Error('OpenAI API key not configured');
  }

  const modelConfig = AI_MODELS[AIProvider.OPENAI];
  console.log(`[OpenAI] Starting generation with model: ${modelConfig.model}, max_completion_tokens: ${maxTokens}`);

  const openaiMessages = messages.map((msg) => ({
    role: msg.role as 'system' | 'user' | 'assistant',
    content: msg.content,
  }));

  const stream = await this.openai.chat.completions.create({
    messages: openaiMessages,
    model: modelConfig.model,
    temperature,
    max_completion_tokens: maxTokens,
    stream: true,
    stream_options: { include_usage: true },
  });

  let lastFinishReason: string | null = null;
  let outputTokens = 0;

  for await (const chunk of stream) {
    const choice = chunk.choices[0];
    const content = choice?.delta?.content;
    const finishReason = choice?.finish_reason;

    if (finishReason) {
      lastFinishReason = finishReason;
      console.log(`[OpenAI] Stream finished with reason: ${finishReason}`);
    }

    if (chunk.usage) {
      outputTokens = chunk.usage.completion_tokens || 0;
    }

    if (content) {
      yield { content, done: false, finishReason: null };
    }
  }

  const wasTruncated = lastFinishReason === 'length';

  if (wasTruncated) {
    console.error(`[OpenAI] WARNING: Content was TRUNCATED due to token limit!`);
    console.error(`[OpenAI] Requested: ${maxTokens} tokens, Used: ${outputTokens} tokens`);
  } else {
    console.log(`[OpenAI] Generation completed. Tokens used: ${outputTokens}/${maxTokens}`);
  }

  yield {
    content: '',
    done: true,
    finishReason: lastFinishReason as any,
    truncated: wasTruncated,
    tokensUsed: outputTokens,
  };
}
```

- [ ] **Step 3: Add `getOpenAICompletion` non-streaming method**

Add after `getClaudeCompletion`:

```typescript
/**
 * OpenAI non-streaming completion
 */
private async getOpenAICompletion(
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  if (!this.openai) {
    throw new Error('OpenAI API key not configured');
  }

  const openaiMessages = messages.map((msg) => ({
    role: msg.role as 'system' | 'user' | 'assistant',
    content: msg.content,
  }));

  const completion = await this.openai.chat.completions.create({
    messages: openaiMessages,
    model: AI_MODELS[AIProvider.OPENAI].model,
    temperature,
    max_completion_tokens: maxTokens,
  });

  return completion.choices[0]?.message?.content || '';
}
```

- [ ] **Step 4: Route OPENAI in streamChatCompletion and getChatCompletion**

In `streamChatCompletion`, add before the `else` block:

```typescript
} else if (provider === AIProvider.OPENAI) {
  yield* this.streamOpenAICompletion(messages, temperature, maxTokens);
}
```

In `getChatCompletion`, add before the `else` block:

```typescript
} else if (provider === AIProvider.OPENAI) {
  return this.getOpenAICompletion(messages, temperature, maxTokens);
}
```

- [ ] **Step 5: Add OPENAI to getAvailableProviders**

In `getAvailableProviders()`, add:

```typescript
if (this.openai) {
  available.push(AIProvider.OPENAI);
}
```

- [ ] **Step 6: Add `getEffectiveProvider` helper**

Add as a public static method:

```typescript
/**
 * Get effective provider based on user's plan type
 * Free users are restricted to OPENAI (GPT-5-mini)
 */
static getEffectiveProvider(
  requestedProvider: AIProvider,
  userPlanType: string | null
): AIProvider {
  if (userPlanType === 'free') {
    return AIProvider.OPENAI;
  }
  return requestedProvider;
}
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add lib/services/aiService.ts
git commit -m "feat(aiService): add OpenAI GPT-5-mini streaming and non-streaming support"
```

---

## Chunk 2: Free Tier Database & Token Service

### Task 4: Create free tier database migration

**Files:**
- Create: `supabase/migrations/20260314000000_free_tier_signup.sql`

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260314000000_free_tier_signup.sql`:

```sql
-- ============================================================================
-- FREE TIER: Auto-create free subscription on user signup
-- ============================================================================

-- Step 1: Update CHECK constraints to allow free tier values
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_type_check
  CHECK (plan_type IN ('basic', 'pro', 'premium', 'one_time', 'free'));

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_payment_gateway_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_payment_gateway_check
  CHECK (payment_gateway IN ('paystack', 'stripe', 'none'));

-- Step 2: Make payment-related columns nullable for free tier
ALTER TABLE subscriptions ALTER COLUMN currency DROP NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN amount_paid DROP NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN payment_gateway DROP NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN current_period_end DROP NOT NULL;

-- Step 3: Update handle_new_user trigger to create free subscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Create free subscription with 20k tokens
  INSERT INTO public.subscriptions (
    user_id,
    plan_type,
    billing_cycle,
    token_allocation,
    tokens_remaining,
    currency,
    amount_paid,
    payment_gateway,
    status,
    auto_renew,
    current_period_start,
    current_period_end
  ) VALUES (
    NEW.id,
    'free',
    NULL,
    20000,
    20000,
    NULL,
    NULL,
    NULL,
    'active',
    FALSE,
    NOW(),
    NULL
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Backfill existing users with no subscription
INSERT INTO subscriptions (
  user_id, plan_type, token_allocation, tokens_remaining,
  status, auto_renew, current_period_start
)
SELECT
  up.id, 'free', 20000, 20000,
  'active', FALSE, NOW()
FROM user_profiles up
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.user_id = up.id
);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260314000000_free_tier_signup.sql
git commit -m "feat(db): add free tier migration with 20k signup tokens and user backfill"
```

---

### Task 5: Update token service for free plan

**Files:**
- Modify: `lib/services/tokenService.ts`

- [ ] **Step 1: Add free plan to getTokenAllocationForPlan**

In `getTokenAllocationForPlan`, add a case before the `default` in the switch:

```typescript
case 'free':
  return 20000;
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add lib/services/tokenService.ts
git commit -m "feat(tokenService): add free plan token allocation support"
```

---

### Task 6: Expire free subscription on paid plan purchase

**Files:**
- Modify: `lib/services/subscriptionService.ts`

- [ ] **Step 1: Add free subscription expiration before new subscription insert**

In `lib/services/subscriptionService.ts`, find the `createOrRenewSubscription` method. Locate the section that creates a new subscription (around line 144, the comment "Create subscription record"). Before the `.insert()` call, add:

```typescript
// Expire any existing free subscription before creating paid one
// (unique index idx_one_active_subscription allows only one active sub per user)
const { error: expireError } = await supabase
  .from('subscriptions')
  .update({ status: 'expired', cancelled_at: new Date().toISOString() })
  .eq('user_id', params.userId)
  .eq('plan_type', 'free')
  .eq('status', 'active');

if (expireError) {
  console.warn('[SubscriptionService] Failed to expire free subscription:', expireError);
  // Non-fatal — the insert may still succeed if no free sub exists
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add lib/services/subscriptionService.ts
git commit -m "feat(subscriptions): expire free subscription when user upgrades to paid plan"
```

---

### Task 7: Update token middleware with new operation types and estimators

**Files:**
- Modify: `lib/middleware/tokenMiddleware.ts`

- [ ] **Step 1: Extend operationType union**

Change the `operationType` parameter in the `deductTokens` function from:

```typescript
operationType: 'research' | 'structure' | 'chapter' | 'chat' | 'generate',
```

to:

```typescript
operationType: 'research' | 'structure' | 'chapter' | 'chat' | 'generate'
  | 'source_analysis' | 'query_decomposition' | 're_ranking' | 'argument_summary',
```

- [ ] **Step 2: Add SOURCE_ANALYSIS to MIN_TOKENS**

```typescript
export const MIN_TOKENS = {
  RESEARCH: 1000,
  SOURCE_ANALYSIS: 1500,
  STRUCTURE: 1000,
  CHAPTER: 2000,
  CHAT: 500,
  DEFAULT: 1000,
} as const;
```

- [ ] **Step 3: Add new estimation functions**

Add at the bottom of the file, before the `checkPremiumFairUse` function:

```typescript
export function estimateSourceAnalysisTokens(params: {
  sourceCount: number;
}): number {
  return (params.sourceCount * 900) + 500 + 4000;
}

export function estimateQueryDecompositionTokens(): number {
  return 2000;
}

export function estimateReRankingTokens(params: {
  candidateCount: number;
}): number {
  return params.candidateCount * 100 + 500;
}

export function estimateArgumentSummaryTokens(): number {
  return 1500;
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add lib/middleware/tokenMiddleware.ts
git commit -m "feat(tokenMiddleware): add new operation types and estimation functions for pipeline"
```

---

## Chunk 3: Source Intelligence Layer

### Task 8: Create source analysis database tables

**Files:**
- Create: `supabase/migrations/20260314000001_source_analysis_tables.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260314000001_source_analysis_tables.sql`:

```sql
-- ============================================================================
-- SOURCE INTELLIGENCE: Analysis, mappings, and argument summaries
-- ============================================================================

-- Source analysis results
CREATE TABLE source_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES writing_projects(id) ON DELETE CASCADE,
  analysis JSONB NOT NULL,
  model_used TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_source_analysis_project ON source_analysis(project_id);

-- Section-to-source mappings
CREATE TABLE section_source_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES writing_projects(id) ON DELETE CASCADE,
  structure_id UUID NOT NULL REFERENCES document_structures(id) ON DELETE CASCADE,
  mappings JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_section_mappings_project ON section_source_mappings(project_id);
CREATE INDEX idx_section_mappings_structure ON section_source_mappings(structure_id);

-- Chapter argument summaries
CREATE TABLE chapter_argument_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES writing_projects(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES document_sections(id) ON DELETE CASCADE,
  chapter_heading TEXT NOT NULL,
  thesis_advanced TEXT NOT NULL,
  key_evidence TEXT[] NOT NULL,
  connection_to_next TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_argument_summaries_project ON chapter_argument_summaries(project_id);
CREATE INDEX idx_argument_summaries_section ON chapter_argument_summaries(section_id);

-- RLS
ALTER TABLE source_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_source_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_argument_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own source analysis"
  ON source_analysis FOR SELECT
  USING (project_id IN (SELECT id FROM writing_projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own source analysis"
  ON source_analysis FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM writing_projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own section mappings"
  ON section_source_mappings FOR SELECT
  USING (project_id IN (SELECT id FROM writing_projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own section mappings"
  ON section_source_mappings FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM writing_projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own argument summaries"
  ON chapter_argument_summaries FOR SELECT
  USING (project_id IN (SELECT id FROM writing_projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own argument summaries"
  ON chapter_argument_summaries FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM writing_projects WHERE user_id = auth.uid()));

-- Updated_at triggers
CREATE TRIGGER update_source_analysis_updated_at
  BEFORE UPDATE ON source_analysis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260314000001_source_analysis_tables.sql
git commit -m "feat(db): add source_analysis, section_source_mappings, and chapter_argument_summaries tables"
```

---

### Task 9: Create source analysis types

**Files:**
- Create: `lib/types/sourceAnalysis.ts`

- [ ] **Step 1: Write the types file**

Create `lib/types/sourceAnalysis.ts`:

```typescript
export interface AnalyzedSource {
  sourceId: string;
  keyClaims: string[];
  methodology: string;
  keyFindings: string;
  limitations: string;
  themes: string[];
  bestUsedFor: string;
  yearCategory: 'recent' | 'established' | 'seminal';
}

export interface ThematicCluster {
  themeId: string;
  label: string;
  sourceIds: string[];
  consensusView: string;
  tensions: string;
}

export interface SourceAnalysis {
  sources: AnalyzedSource[];
  thematicClusters: ThematicCluster[];
  researchGaps: string[];
  suggestedCentralArgument: string;
}

export interface SectionMapping {
  sectionHeading: string;
  relevantSourceIds: string[];
  sectionThesis: string;
  argumentRole: 'establishes_context' | 'builds_evidence' | 'addresses_counterarguments' | 'synthesizes';
  suggestedApproach: string;
}

export interface ChapterArgumentSummary {
  chapterHeading: string;
  thesisAdvanced: string;
  keyEvidence: string[];
  connectionToNext: string;
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add lib/types/sourceAnalysis.ts
git commit -m "feat(types): add source analysis, section mapping, and argument summary types"
```

---

### Task 10: Create source analysis service

**Files:**
- Create: `lib/services/sourceAnalysisService.ts`

- [ ] **Step 1: Write the service**

Create `lib/services/sourceAnalysisService.ts`. This service takes research sources and calls GPT-5-mini to produce a structured analysis.

```typescript
import { aiService, AIProvider } from '@/lib/services/aiService';
import { SourceAnalysis } from '@/lib/types/sourceAnalysis';
import { ResearchSource } from '@/lib/types/document';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/server';

export class SourceAnalysisService {
  /**
   * Analyze research sources to extract claims, themes, clusters, and gaps
   */
  async analyzeSources(params: {
    sources: ResearchSource[];
    topic: string;
    documentType: string;
    academicLevel: string;
    projectId: string;
    provider?: AIProvider;
  }): Promise<SourceAnalysis> {
    const { sources, topic, documentType, academicLevel, projectId, provider } = params;
    const effectiveProvider = provider || AIProvider.OPENAI;

    const sourcesText = sources.map((s, i) => {
      const parts = [`Source ${i + 1}: "${s.title}"`];
      if (s.author) parts.push(`Author: ${s.author}`);
      if (s.publishedDate) parts.push(`Published: ${s.publishedDate}`);
      if (s.excerpt) parts.push(`Excerpt: ${s.excerpt}`);
      return parts.join('\n');
    }).join('\n\n---\n\n');

    const systemMessage = `You are an academic research analyst. Return ONLY valid JSON, no markdown fences or extra text.`;

    const userMessage = `Analyze these ${sources.length} sources for a ${academicLevel} ${documentType} on "${topic}".

For each source, extract:
1. Key claims (2-3 specific, citable claims)
2. Methodology (study type, sample, approach — or "N/A" if not empirical)
3. Key finding (one sentence)
4. Limitations (one sentence)
5. Thematic tags (short labels like "impact-of-X", "methodology-Y")
6. Best used for (how this source supports the paper)
7. Year category: "recent" (last 3 years), "established" (3-10 years), "seminal" (10+ years or foundational)

Then identify:
- Thematic clusters: groups of sources addressing the same question
- Within each cluster: consensus view and tensions/disagreements
- Research gaps: what questions remain unanswered by these sources?
- A suggested central argument this paper could advance

SOURCES:
${sourcesText}

Return JSON matching this schema:
{
  "sources": [{ "sourceId": "source-1", "keyClaims": [...], "methodology": "...", "keyFindings": "...", "limitations": "...", "themes": [...], "bestUsedFor": "...", "yearCategory": "recent|established|seminal" }],
  "thematicClusters": [{ "themeId": "theme-1", "label": "...", "sourceIds": [...], "consensusView": "...", "tensions": "..." }],
  "researchGaps": ["..."],
  "suggestedCentralArgument": "..."
}`;

    const response = await aiService.getChatCompletion(
      effectiveProvider,
      [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      0.3,
      4000
    );

    // Parse JSON from response (strip markdown fences if present)
    const jsonStr = response.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis: SourceAnalysis = JSON.parse(jsonStr);

    // Save to database
    try {
      const supabase = await createServiceRoleSupabaseClient();
      await supabase.from('source_analysis').insert({
        project_id: projectId,
        analysis: analysis as any,
        model_used: effectiveProvider,
        tokens_used: Math.ceil(response.length * 1.33),
      });
    } catch (err) {
      console.error('[SourceAnalysis] Failed to save to DB:', err);
    }

    return analysis;
  }

  /**
   * Map sources to sections after structure generation
   */
  async mapSourcesToSections(params: {
    analysis: SourceAnalysis;
    sections: Array<{ heading: string; description?: string; keyPoints?: string[] }>;
    topic: string;
    projectId: string;
    structureId: string;
    provider?: AIProvider;
  }): Promise<import('@/lib/types/sourceAnalysis').SectionMapping[]> {
    const { analysis, sections, topic, projectId, structureId, provider } = params;
    const effectiveProvider = provider || AIProvider.OPENAI;

    const sectionsText = sections.map((s, i) =>
      `Section ${i + 1}: "${s.heading}"\nDescription: ${s.description || 'N/A'}\nKey points: ${(s.keyPoints || []).join(', ')}`
    ).join('\n\n');

    const clustersText = analysis.thematicClusters.map(c =>
      `Theme "${c.label}": sources [${c.sourceIds.join(', ')}], consensus: ${c.consensusView}`
    ).join('\n');

    const systemMessage = `You are an academic planning assistant. Return ONLY valid JSON, no markdown fences.`;

    const userMessage = `Map research sources to document sections for a paper on "${topic}".

THEMATIC CLUSTERS:
${clustersText}

AVAILABLE SOURCES (by ID):
${analysis.sources.map(s => `${s.sourceId}: "${s.keyClaims[0]}" — best for: ${s.bestUsedFor}`).join('\n')}

SECTIONS:
${sectionsText}

For each section, determine:
1. Which 3-7 sources are most relevant (by sourceId)
2. A specific thesis for that section
3. Its argumentative role: "establishes_context", "builds_evidence", "addresses_counterarguments", or "synthesizes"
4. A suggested approach (e.g., "organize by theme", "compare and contrast X and Y")

Return JSON array:
[{ "sectionHeading": "...", "relevantSourceIds": [...], "sectionThesis": "...", "argumentRole": "...", "suggestedApproach": "..." }]`;

    const response = await aiService.getChatCompletion(
      effectiveProvider,
      [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      0.3,
      3000
    );

    const jsonStr = response.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    const mappings = JSON.parse(jsonStr);

    // Save to database
    try {
      const supabase = await createServiceRoleSupabaseClient();
      await supabase.from('section_source_mappings').insert({
        project_id: projectId,
        structure_id: structureId,
        mappings: mappings,
      });
    } catch (err) {
      console.error('[SourceAnalysis] Failed to save mappings to DB:', err);
    }

    return mappings;
  }
}

export const sourceAnalysisService = new SourceAnalysisService();
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add lib/services/sourceAnalysisService.ts
git commit -m "feat(sourceAnalysis): add source analysis and section mapping service"
```

---

### Task 11: Create source analysis API route

**Files:**
- Create: `app/api/write/analyze-sources/route.ts`

- [ ] **Step 1: Write the API route**

Create `app/api/write/analyze-sources/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sourceAnalysisService } from '@/lib/services/sourceAnalysisService';
import { AIProvider } from '@/lib/config/aiModels';
import { AIService } from '@/lib/services/aiService';
import { tokenService } from '@/lib/services/tokenService';
import {
  checkTokenBalance,
  deductTokens,
  estimateSourceAnalysisTokens,
  MIN_TOKENS,
} from '@/lib/middleware/tokenMiddleware';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { projectId, topic, documentType, academicLevel } = await request.json();

    if (!projectId || !topic || !documentType) {
      return NextResponse.json(
        { error: 'projectId, topic, and documentType are required' },
        { status: 400 }
      );
    }

    // Fetch sources for this project
    const supabase = await createServerSupabaseClient();
    const { data: sources, error: sourcesError } = await supabase
      .from('research_sources')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true });

    if (sourcesError || !sources || sources.length === 0) {
      return NextResponse.json(
        { error: 'No research sources found for this project' },
        { status: 400 }
      );
    }

    // Check tokens
    const estimatedTokens = estimateSourceAnalysisTokens({ sourceCount: sources.length });
    const tokenCheckError = await checkTokenBalance(user.id, estimatedTokens, MIN_TOKENS.SOURCE_ANALYSIS);
    if (tokenCheckError) return tokenCheckError;

    // Determine effective provider based on user plan
    const balance = await tokenService.getUserTokenBalance(user.id);
    const planType = balance.subscription?.planType || 'free';
    const provider = AIService.getEffectiveProvider(AIProvider.OPENAI, planType);

    // Run analysis
    const analysis = await sourceAnalysisService.analyzeSources({
      sources: sources.map(s => ({
        id: s.id,
        title: s.title,
        url: s.url,
        author: s.author || undefined,
        publishedDate: s.published_date || undefined,
        excerpt: s.excerpt,
        score: s.relevance_score ? Number(s.relevance_score) : undefined,
        selected: s.is_selected,
      })),
      topic,
      documentType,
      academicLevel: academicLevel || 'undergraduate',
      projectId,
      provider,
    });

    // Deduct tokens
    await deductTokens(user.id, estimatedTokens, 'source_analysis', {
      projectId,
      sourceCount: sources.length,
    });

    return NextResponse.json({ analysis });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[AnalyzeSources] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze sources' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add app/api/write/analyze-sources/route.ts
git commit -m "feat(api): add source analysis endpoint"
```

---

## Chunk 4: Prompt Overhaul — Structure & Chapter Generation

### Task 12: Create query decomposition service

**Files:**
- Create: `lib/services/queryDecompositionService.ts`

- [ ] **Step 1: Write the service**

Create `lib/services/queryDecompositionService.ts`:

```typescript
import { aiService, AIProvider } from '@/lib/services/aiService';

export interface DecomposedQuery {
  originalTopic: string;
  subQueries: string[];
  expandedTerms: Record<string, string[]>;
}

export class QueryDecompositionService {
  async decompose(params: {
    topic: string;
    documentType: string;
    instructions?: string;
    provider?: AIProvider;
  }): Promise<DecomposedQuery> {
    const { topic, documentType, instructions, provider } = params;
    const effectiveProvider = provider || AIProvider.OPENAI;

    const prompt = `Decompose this academic research topic into 3-5 targeted search queries and expand key terms with academic synonyms.

Topic: "${topic}"
Document type: ${documentType}
${instructions ? `Additional context: ${instructions}` : ''}

Return JSON:
{
  "subQueries": ["query 1 targeting specific facet", "query 2 targeting different facet", ...],
  "expandedTerms": { "original term": ["synonym 1", "academic equivalent", ...] }
}

Rules:
- Each sub-query should target a different facet (theoretical, empirical, methodological, contextual)
- Expanded terms should include field-specific academic terminology
- Sub-queries should be specific enough to find relevant academic papers
- Return ONLY valid JSON, no markdown fences`;

    try {
      const response = await aiService.getChatCompletion(
        effectiveProvider,
        [
          { role: 'system', content: 'You are an academic search specialist. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        0.3,
        1500
      );

      const jsonStr = response.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      return {
        originalTopic: topic,
        subQueries: parsed.subQueries || [topic],
        expandedTerms: parsed.expandedTerms || {},
      };
    } catch (error) {
      console.error('[QueryDecomposition] Failed, falling back to original topic:', error);
      return {
        originalTopic: topic,
        subQueries: [topic],
        expandedTerms: {},
      };
    }
  }
}

export const queryDecompositionService = new QueryDecompositionService();
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add lib/services/queryDecompositionService.ts
git commit -m "feat(queryDecomposition): add academic query decomposition service"
```

---

### Task 13: Rewrite structure generation prompt

**Files:**
- Modify: `app/api/write/structure/route.ts`

- [ ] **Step 1: Add imports and model routing**

At the top of the file, add:

```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { tokenService } from '@/lib/services/tokenService';
import { AIService } from '@/lib/services/aiService';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/server';
```

- [ ] **Step 2: Add dynamic model selection function**

After the imports, add:

```typescript
const getStructureModel = (planType: string) => {
  if (planType === 'free') {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    return openai('gpt-5-mini');
  }
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
  return groq('openai/gpt-oss-120b');
};
```

- [ ] **Step 3: Rewrite `generateStructurePrompt` function**

Replace the `generateStructurePrompt` function body. The new prompt uses thesis-first, source-aware planning. It should accept an optional `sourceAnalysis` parameter with the thematic clusters and suggested argument from the source analysis step:

Key changes to the prompt:
- Add `RESEARCH INTELLIGENCE` section with thematic clusters, research gaps, and suggested central argument (when available)
- Change `PLANNING TASK` to require articulating the central argument first, then designing chapters that each advance it
- Add `argumentRole` requirement for each section
- Add `sectionThesis` requirement for each section
- Remove the generic "Create a detailed structure" framing
- Keep level-specific chapter counts and word count guidance

- [ ] **Step 4: Update the POST handler to fetch plan type and pass to model selection**

In the POST handler, after `requireAuth()`, add:

```typescript
const balance = await tokenService.getUserTokenBalance(user.id);
const planType = balance.subscription?.planType || 'free';
```

Change `groq("openai/gpt-oss-120b")` in the `generateObject` call to `getStructureModel(planType)`.

- [ ] **Step 5: Fetch source analysis if available**

After getting the request body, before generating the structure, add:

```typescript
// Fetch source analysis if available for this project
let sourceAnalysis = null;
if (projectId) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('source_analysis')
    .select('analysis')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (data) sourceAnalysis = data.analysis;
}
```

Pass `sourceAnalysis` to the prompt function.

- [ ] **Step 6: After structure generation, trigger source-to-section mapping**

After the structure is generated and saved to DB, if source analysis exists, call:

```typescript
if (sourceAnalysis && insertedStructure) {
  try {
    const { sourceAnalysisService } = await import('@/lib/services/sourceAnalysisService');
    await sourceAnalysisService.mapSourcesToSections({
      analysis: sourceAnalysis,
      sections: result.object.sections,
      topic,
      projectId,
      structureId: insertedStructure.id,
      provider: AIService.getEffectiveProvider(AIProvider.OPENAI, planType),
    });
    console.log('[Structure] Source-to-section mapping completed');
  } catch (mappingError) {
    console.error('[Structure] Source mapping failed (non-fatal):', mappingError);
  }
}
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add app/api/write/structure/route.ts
git commit -m "feat(structure): rewrite prompt for thesis-first source-aware planning with dynamic model routing"
```

---

### Task 14: Rewrite chapter generation prompt

**Files:**
- Modify: `app/api/write/generate-chapter/route.ts`

- [ ] **Step 1: Add imports**

Add at the top:

```typescript
import { tokenService } from '@/lib/services/tokenService';
import { AIService } from '@/lib/services/aiService';
import { createServerSupabaseClient } from '@/lib/supabase/server';
```

- [ ] **Step 2: Rewrite `getSystemMessage` function**

Replace with a compact version that moves humanization into the system message:

```typescript
function getSystemMessage(
  academicLevel: AcademicLevel,
  isAbstract: boolean = false
): string {
  const levelConfig = ACADEMIC_LEVEL_CONFIGS[academicLevel];

  if (isAbstract) {
    return `You are an expert academic writer specializing in ${levelConfig.label.toLowerCase()}-level research papers.
Write a concise, well-structured abstract as a single cohesive paragraph.
Follow standard abstract conventions (background, objectives, methodology, findings, conclusions).
Do NOT include citations in the abstract. Write directly without preamble.`;
  }

  return `You are an expert academic writer. Your writing demonstrates:
- ${levelConfig.analysisStyle}
- Technical depth: ${levelConfig.technicalDepth}
- ${levelConfig.citationsPerSection} citations per major point
- Natural sentence variation (mix short, medium, long)
- Active voice (70-80%)
- Specific data points and examples over vague claims
- No em-dashes — use commas, parentheses, or colons
- None of these words: "Furthermore", "Moreover", "delve", "landscape", "tapestry", "multifaceted", "myriad", "plethora"
- No 3+ AI-flagged phrases per paragraph

Write with authority. Every claim must be supported by evidence.`;
}
```

- [ ] **Step 3: Rewrite `generateChapterPrompt` to use argument threading and mapped sources**

The new prompt structure:
1. ARGUMENT THREAD section (central argument, previous chapter summary, this chapter's thesis, next chapter preview)
2. SOURCES FOR THIS CHAPTER (only mapped sources with pre-analyzed data)
3. THEMATIC CONTEXT (relevant cluster summary)
4. SYNTHESIS INSTRUCTIONS
5. CHAPTER REQUIREMENTS (word count, citations, subsections)

Key changes:
- Accept `argumentSummaries` parameter (previous chapter summaries from DB)
- Accept `sectionMapping` parameter (mapped sources and thesis for this section)
- Accept `sourceAnalysis` parameter (thematic clusters)
- Format sources with pre-analyzed key findings, methodology, and "use for" guidance
- Replace raw source dump with mapped sources only
- Add explicit synthesis instructions (organize by themes, signal phrases, analyze after evidence)
- Remove the 50+ lines of humanization from user prompt (now in system message)
- Remove the 4x repeated word count instructions — state once clearly

- [ ] **Step 4: Update POST handler to fetch argument summaries and section mappings**

Before generating the chapter, fetch from DB:

```typescript
// Fetch previous chapter argument summaries
const supabase = await createServerSupabaseClient();
let argumentSummaries: any[] = [];
let sectionMapping: any = null;
let sourceAnalysis: any = null;

if (projectId) {
  // Get argument summaries from previous chapters
  const { data: summaries } = await supabase
    .from('chapter_argument_summaries')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (summaries) argumentSummaries = summaries;

  // Get section mapping for this chapter
  const { data: mappingData } = await supabase
    .from('section_source_mappings')
    .select('mappings')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (mappingData?.mappings) {
    const allMappings = Array.isArray(mappingData.mappings) ? mappingData.mappings : [];
    sectionMapping = allMappings.find(
      (m: any) => m.sectionHeading === chapter.heading
    );
  }

  // Get source analysis
  const { data: analysisData } = await supabase
    .from('source_analysis')
    .select('analysis')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (analysisData) sourceAnalysis = analysisData.analysis;
}
```

- [ ] **Step 5: Add model restriction for free users**

After auth, get the user's plan:

```typescript
const balance = await tokenService.getUserTokenBalance(user.id);
const planType = balance.subscription?.planType || 'free';
const provider = AIService.getEffectiveProvider(
  (aiProvider as AIProvider) || DEFAULT_AI_PROVIDER,
  planType
);
```

Use `provider` instead of the current `(aiProvider as AIProvider) || DEFAULT_AI_PROVIDER`.

- [ ] **Step 6: After streaming completes, save argument summary**

After the `if (chunk.done)` block where tokens are deducted, add argument summary extraction:

```typescript
// Extract argument summary for cross-chapter threading
if (projectId && !isAbstract && contentBuffer.length > 100) {
  try {
    const summaryProvider = AIService.getEffectiveProvider(AIProvider.OPENAI, planType);
    const summaryResponse = await aiService.getChatCompletion(
      summaryProvider,
      [
        { role: 'system', content: 'Extract a brief argument summary. Return only valid JSON.' },
        { role: 'user', content: `Summarize what this chapter established:
1. The thesis it advanced (one sentence)
2. Key evidence presented with author citations (2-3 items)
3. How it connects to what comes next (one sentence)

Chapter: ${chapter.heading}
Content: ${contentBuffer.substring(0, 8000)}

Return JSON: { "thesisAdvanced": "...", "keyEvidence": ["...", "..."], "connectionToNext": "..." }` },
      ],
      0.2,
      500
    );

    const summaryJson = summaryResponse.replace(/\`\`\`json?\n?/g, '').replace(/\`\`\`\n?/g, '').trim();
    const summary = JSON.parse(summaryJson);

    const dbSupabase = await createServiceRoleSupabaseClient();
    await dbSupabase.from('chapter_argument_summaries').insert({
      project_id: projectId,
      section_id: chapter.id || null,
      chapter_heading: chapter.heading,
      thesis_advanced: summary.thesisAdvanced,
      key_evidence: summary.keyEvidence,
      connection_to_next: summary.connectionToNext,
    });

    // Deduct tokens for summary extraction
    await deductTokens(user.id, 1500, 'argument_summary', { projectId, chapterName: chapter.heading });
  } catch (summaryError) {
    console.error('[Generate Chapter] Argument summary extraction failed (non-fatal):', summaryError);
  }
}
```

- [ ] **Step 7: Update Perplexity enrichment query to be targeted**

Replace the generic Perplexity query with one that uses the section mapping:

```typescript
const perplexityQuery = sectionMapping
  ? `Find recent empirical evidence about "${sectionMapping.sectionThesis}".
Focus on: ${(chapter.keyPoints ?? []).map((kp: string, i: number) => `${i + 1}. ${kp}`).join('\n')}
Specifically look for: data, statistics, case studies, and research findings from the last 3 years.
Do NOT provide general background — focus on specific evidence and data points.`
  : `Provide comprehensive factual information about "${chapter.heading}" in the context of ${topic}.
Focus on these key points:
${(chapter.keyPoints ?? []).map((kp: string, i: number) => `${i + 1}. ${kp}`).join('\n')}
Include relevant data, statistics, examples, and authoritative information with citations.`;
```

- [ ] **Step 8: Add post-generation quality monitoring**

After streaming completes and argument summary is saved, add:

```typescript
// Post-generation quality monitoring (non-blocking, logging only)
if (contentBuffer.length > 100) {
  const { countEmDashes } = await import('@/lib/config/humanization');
  const { checkForBannedPhrases, detectChatGPTFingerprint } = await import('@/lib/config/humanization');

  const emDashCount = countEmDashes(contentBuffer);
  const bannedPhrases = checkForBannedPhrases(contentBuffer);
  const fingerprint = detectChatGPTFingerprint(contentBuffer);
  const citationCount = (contentBuffer.match(/\([A-Z][a-z]+(?:\s*(?:&|and)\s*[A-Z][a-z]+)*,\s*\d{4}\)/g) || []).length;

  console.log(`[Quality Monitor] Chapter ${chapterIndex + 1}:`,
    `Words: ${totalWords}/${targetWordCount},`,
    `Em-dashes: ${emDashCount},`,
    `Banned phrases: ${bannedPhrases.length},`,
    `ChatGPT fingerprint: ${fingerprint.hasFingerprint ? 'YES' : 'no'},`,
    `Citations: ${citationCount}`
  );
}
```

- [ ] **Step 9: Verify build**

```bash
npm run build
```

- [ ] **Step 10: Commit**

```bash
git add app/api/write/generate-chapter/route.ts
git commit -m "feat(chapters): rewrite prompt with argument threading, mapped sources, synthesis instructions, and quality monitoring"
```

---

## Chunk 5: Research Route Enhancement & Compact Humanization

### Task 15: Enhance research route with query decomposition

**Files:**
- Modify: `app/api/write/research/route.ts`

- [ ] **Step 1: Add imports**

Add at the top:

```typescript
import { queryDecompositionService } from '@/lib/services/queryDecompositionService';
import { tokenService } from '@/lib/services/tokenService';
import { AIService } from '@/lib/services/aiService';
import { AIProvider } from '@/lib/config/aiModels';
```

- [ ] **Step 2: Add query decomposition before search**

After the token check passes and before `searchService.searchParallel()`, add:

```typescript
// Get user plan for free-tier optimizations
const balance = await tokenService.getUserTokenBalance(user.id);
const planType = balance.subscription?.planType || 'free';
const effectiveProvider = AIService.getEffectiveProvider(AIProvider.OPENAI, planType);

// Free tier: limit sources to 10
const effectiveNumSources = planType === 'free' ? Math.min(numSources, 10) : numSources;

// Decompose research topic into targeted sub-queries
let searchTopic = topic;
try {
  const decomposed = await queryDecompositionService.decompose({
    topic,
    documentType,
    instructions,
    provider: effectiveProvider,
  });

  if (decomposed.subQueries.length > 1) {
    // Use the first sub-query as main topic, pass others as additional queries
    searchTopic = decomposed.subQueries[0];
    console.log(`[Research] Decomposed into ${decomposed.subQueries.length} sub-queries`);
    console.log(`[Research] Primary: ${searchTopic}`);
  }

  // Deduct tokens for query decomposition
  await deductTokens(user.id, 2000, 'query_decomposition', { projectId, topic });
} catch (decompError) {
  console.error('[Research] Query decomposition failed (non-fatal):', decompError);
  // Fall back to original topic
}
```

- [ ] **Step 3: Use effectiveNumSources in the search call**

Replace `numSources` with `effectiveNumSources` in the `searchService.searchParallel()` call.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add app/api/write/research/route.ts
git commit -m "feat(research): add query decomposition and free-tier source limits"
```

---

### Task 16: Add compact humanization system message helper

**Files:**
- Modify: `lib/utils/humanizationPrompt.ts`

- [ ] **Step 1: Add compact system message function**

Add a new export function:

```typescript
/**
 * Get compact humanization rules for system messages
 * Used in chapter generation where humanization should be in system message, not user prompt
 */
export function getCompactHumanizationSystemRules(academicLevel: AcademicLevel): string {
  const levelConfig = ACADEMIC_LEVEL_CONFIGS[academicLevel];

  return `Your writing demonstrates:
- ${levelConfig.analysisStyle}
- Natural sentence variation (mix short, medium, long)
- Active voice (70-80%)
- Specific data points and examples over vague claims
- No em-dashes — use commas, parentheses, or colons
- None of these words: "Furthermore", "Moreover", "delve", "landscape", "tapestry", "multifaceted", "myriad", "plethora", "pivotal", "crucial"
- No 3+ AI-flagged phrases per paragraph

Write with authority. Every claim supported by evidence.`;
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add lib/utils/humanizationPrompt.ts
git commit -m "feat(humanization): add compact system message helper for chapter generation"
```

---

### Task 17: Apply migration and verify end-to-end

**Files:** None (verification only)

- [ ] **Step 1: Apply database migrations**

```bash
npx supabase db push
```

Or if using Supabase CLI:
```bash
supabase migration up
```

Expected: Both migrations apply successfully.

- [ ] **Step 2: Full build verification**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Lint check**

```bash
npm run lint
```

Expected: No new lint errors introduced.

- [ ] **Step 4: Manual smoke test**

Start the dev server:
```bash
npm run dev
```

Test the following flows:
1. New user signup → verify free subscription created in Supabase dashboard (subscriptions table)
2. Research endpoint with GPT-5-mini for free user → verify sources returned
3. Source analysis endpoint → verify analysis saved to source_analysis table
4. Structure generation → verify section mappings created
5. Chapter generation → verify argument summary saved after completion

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: verify all pipeline changes build and pass lint"
```

---

## Summary

| Chunk | Tasks | What it delivers |
|-------|-------|-----------------|
| 1: GPT-5-mini | 1-3 | OpenAI SDK installed, model config, streaming/non-streaming, free tier restriction |
| 2: Free Tier | 4-7 | DB migration, 20k signup tokens, upgrade path, token middleware updates |
| 3: Source Intelligence | 8-11 | DB tables, types, source analysis service, API route |
| 4: Prompt Overhaul | 12-14 | Query decomposition, rewritten structure prompt, rewritten chapter prompt with argument threading |
| 5: Integration | 15-17 | Research route enhancement, compact humanization, migration + verification |
