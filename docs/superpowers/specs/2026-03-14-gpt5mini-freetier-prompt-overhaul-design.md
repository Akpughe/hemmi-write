# Design: GPT-5-mini Integration, Free Tier & Research/Writing Pipeline Overhaul

**Date**: 2026-03-14
**Status**: Draft
**Branch**: `affect-effect-2`

---

## 1. Overview

Three interconnected improvements to Hemmi Write:

1. **GPT-5-mini model** — Add OpenAI's GPT-5-mini as a new AI provider, available to all users, and the only option for free-tier users
2. **Free tier with 20k signup tokens** — Auto-create a "free" subscription on signup with 20,000 one-time tokens
3. **Research & writing pipeline overhaul** — New source intelligence layer, rewritten prompts for research/structure/chapter generation, and argument threading across chapters

---

## 2. GPT-5-mini Model Integration

### 2.1 Technical Specs

- **Model ID**: `gpt-5-mini`
- **Context window**: 400,000 tokens
- **Pricing**: $0.125/M input, $1.00/M output, $0.025/M cached
- **Released**: August 7, 2025
- **Key difference**: Uses `max_completion_tokens` instead of `max_tokens` (GPT-5 series requirement)

### 2.2 Changes

**Install OpenAI SDK:**
```bash
npm install openai
```

**`lib/config/aiModels.ts`** — Add new provider:
```typescript
export enum AIProvider {
  GROQ = 'GROQ',
  GEMINI = 'GEMINI',
  ANTHROPIC = 'ANTHROPIC',
  OPENAI = 'OPENAI',  // NEW
}

// Add to AI_MODELS:
[AIProvider.OPENAI]: {
  provider: AIProvider.OPENAI,
  model: 'gpt-5-mini',
  label: 'GPT-5 Mini',
  description: 'Fast, cost-effective model for research and writing',
  maxTokens: 16000,
  contextWindow: 400000,
  icon: '🔷',
}
```

**`lib/services/aiService.ts`** — Add OpenAI streaming and non-streaming:
- Import `OpenAI` from `openai` SDK
- Initialize in constructor if `OPENAI_API_KEY` exists
- Add `streamOpenAICompletion()` — streaming via `openai.chat.completions.create({ stream: true })`
- Add `getOpenAICompletion()` — non-streaming
- Use `max_completion_tokens` parameter instead of `max_tokens` for GPT-5 series
- Route `AIProvider.OPENAI` in `streamChatCompletion()` and `getChatCompletion()`

**Free tier model restriction:**
- In `aiService.ts`, add a helper: `getEffectiveProvider(requestedProvider, userPlanType)`
- If `planType === 'free'` → return `AIProvider.OPENAI` regardless of requested provider
- Paid users can select any provider including OPENAI

**Environment variable:**
- Add `OPENAI_API_KEY` to `.env.example` and deployment config

### 2.3 Structure Generation Routing Fix

Currently `app/api/write/structure/route.ts` calls `groq("openai/gpt-oss-120b")` directly, bypassing `aiService`. This must be routed through `aiService` so free-tier model restrictions apply.

**Change**: Install `@ai-sdk/openai` and add OpenAI as a provider to the Vercel AI SDK setup. This allows `generateObject()` to work with GPT-5-mini, maintaining the same structured output reliability as the current Groq integration. Select the provider dynamically based on the user's plan type:

```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { createGroq } from '@ai-sdk/groq';

const getStructureModel = (planType: string) => {
  if (planType === 'free') {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai('gpt-5-mini');
  }
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
  return groq('openai/gpt-oss-120b');
};
```

---

## 3. Free Tier — 20k Signup Tokens

### 3.1 Database Migration

New migration file: `supabase/migrations/YYYYMMDDHHMMSS_free_tier_signup.sql`

**Step 1: Update CHECK constraints** to allow free tier values:

```sql
-- Allow 'free' plan type
ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_plan_type_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_type_check
  CHECK (plan_type IN ('basic', 'pro', 'premium', 'one_time', 'free'));

-- Allow 'none' payment gateway for free tier
ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_payment_gateway_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_payment_gateway_check
  CHECK (payment_gateway IN ('paystack', 'stripe', 'none'));

-- Make payment-related columns nullable for free tier
ALTER TABLE subscriptions ALTER COLUMN currency DROP NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN amount_paid DROP NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN payment_gateway DROP NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN current_period_end DROP NOT NULL;
```

**Step 2: Modify `handle_new_user()` trigger** to auto-create a free subscription:

```sql
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
    NULL,       -- No currency for free tier
    NULL,       -- No payment
    NULL,       -- No gateway
    'active',
    FALSE,
    NOW(),
    NULL        -- Never expires, just depletes
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 3: Add RLS policies** for new tables (see Section 4.3).

### 3.2 Upgrade Path: Free → Paid

When a free user purchases a paid plan:
1. The existing Stripe/Paystack webhook handler creates a new subscription record
2. The `idx_one_active_subscription` unique index will conflict with the existing free subscription
3. **Fix**: Before inserting the paid subscription, the webhook handler must expire the free subscription:

```sql
-- In the subscription creation flow (stripeService.ts / paystackService.ts):
-- Expire any existing free subscription before creating paid one
UPDATE subscriptions
SET status = 'expired', cancelled_at = NOW()
WHERE user_id = $userId AND plan_type = 'free' AND status = 'active';
```

This must be added to both `lib/services/stripeService.ts` and `lib/services/paystackService.ts` subscription creation logic.

### 3.3 Free Tier User Experience & Token Budget

The enhanced pipeline costs ~70k tokens for a full paper. Free users (20k tokens) won't complete a full paper — by design. Their 20k tokens allow:
- ~1 research operation with 10 sources (≈ 8k tokens — reduced source count for free tier)
- ~1 source analysis (≈ 5k tokens)
- ~1 structure generation (≈ 3k tokens)
- ~1 short chapter (≈ 4k tokens remaining)

**Free tier pipeline optimization**: For free users, skip re-ranking (saves ~3k tokens) and limit research to 10 sources instead of 15 (saves ~4k). Argument summaries are skipped since free users likely generate only 1-2 chapters.

### 3.4 Token Service Updates

**`lib/services/tokenService.ts`:**
- Add `free` case to `getTokenAllocationForPlan()` returning `20000`
- `getPriceForPlan('free', ...)` returns `0`

**`lib/middleware/tokenMiddleware.ts`:**
- No changes needed — the existing `checkTokenBalance()` will naturally find the free subscription and check its token balance
- When tokens deplete to 0, the "insufficient tokens" response triggers with upgrade messaging

### 3.5 Existing User Backfill

For users who already signed up without free tokens:

```sql
-- Backfill: Create free subscriptions for users with NO subscription records at all
-- Excludes users with any subscription (active, expired, cancelled, or one_time)
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

Users with expired/cancelled paid subscriptions are NOT backfilled — they already experienced the product.

---

## 4. Source Intelligence Layer (New Pipeline Step)

### 4.1 Problem

Currently ALL research sources are dumped into every chapter prompt:
- A Literature Review chapter gets methodology-focused sources it doesn't need
- A Methodology chapter gets theoretical sources it doesn't need
- Sources come as raw excerpts with no analysis — the LLM must figure out what each source says AND write at the same time
- No thematic organization — sources appear in the order they were found

### 4.2 Solution: Two-Step Source Intelligence

#### Step A: Source Analysis (after research, before structure)

**New file**: `lib/services/sourceAnalysisService.ts`
**New API route**: `app/api/write/analyze-sources/route.ts`

A single GPT-5-mini call that analyzes all research sources and produces:

```typescript
interface SourceAnalysis {
  sources: AnalyzedSource[];
  thematicClusters: ThematicCluster[];
  researchGaps: string[];
  suggestedCentralArgument: string;
}

interface AnalyzedSource {
  sourceId: string;
  keyClaims: string[];           // 2-3 key claims extracted
  methodology: string;            // Study type, sample size, approach
  keyFindings: string;            // Primary finding in one sentence
  limitations: string;            // Notable limitations
  themes: string[];               // Theme IDs this source belongs to
  bestUsedFor: string;            // "Supporting arguments about X"
  yearCategory: 'recent' | 'established' | 'seminal';
}

interface ThematicCluster {
  themeId: string;
  label: string;                  // "Impact of X on Y"
  sourceIds: string[];
  consensusView: string;          // What sources agree on
  tensions: string;               // Where sources disagree
}
```

**Prompt for source analysis:**
```
You are an academic research analyst. Analyze these sources for a [level] [document type] on "[topic]".

For each source, extract:
1. Key claims (2-3 specific, citable claims)
2. Methodology (study type, sample, approach)
3. Key finding (one sentence)
4. Limitations
5. Thematic tags

Then identify:
- Thematic clusters (groups of sources addressing the same question)
- Within each cluster: what do sources agree on? Where do they disagree?
- Research gaps (what questions remain unanswered?)
- A suggested central argument this paper could advance

SOURCES:
[source data with titles, authors, excerpts, full content where available]
```

**Token cost**: ~15-20k tokens total (input: ~12-15k for 15 source excerpts with metadata + prompt; output: ~3-5k for structured analysis). For free-tier users with 10 sources: ~10-13k tokens.

#### Step B: Source-to-Section Mapping (during structure generation)

After the structure is generated, a follow-up GPT-5-mini call maps sources to sections:

```typescript
interface SectionMapping {
  sectionHeading: string;
  relevantSourceIds: string[];    // 3-7 most relevant sources
  sectionThesis: string;          // What this section argues
  argumentRole: 'establishes_context' | 'builds_evidence' | 'addresses_counterarguments' | 'synthesizes';
  suggestedApproach: string;      // "Organize by theme, compare X and Y"
}
```

**Results stored in**: New `source_analysis` table and `section_source_mappings` table in the database, linked to `writing_projects`.

### 4.3 Database Schema

```sql
-- Source analysis results (document-style: all data in JSONB)
CREATE TABLE source_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES writing_projects(id) ON DELETE CASCADE,
  analysis JSONB NOT NULL,           -- Full SourceAnalysis object (sources, clusters, gaps, central argument)
  model_used TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Section-to-source mappings
CREATE TABLE section_source_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES writing_projects(id) ON DELETE CASCADE,
  structure_id UUID NOT NULL REFERENCES document_structures(id) ON DELETE CASCADE,
  mappings JSONB NOT NULL,           -- Array of SectionMapping objects
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chapter argument summaries (for cross-chapter threading)
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

-- RLS policies
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
```

**Argument summary storage**: After each chapter completes streaming, the API saves a summary to `chapter_argument_summaries`. Before generating the next chapter, the route fetches all previous summaries for the project and includes them in the prompt context. This is a DB-persisted approach (not client-side) so it survives page reloads.

---

## 5. Prompt Overhaul

### 5.1 Research Query Improvement

**Current problem**: Generic query expansion that doesn't decompose the research question.

**New approach — query decomposition + academic term expansion:**

Before calling `searchService.searchParallel()`, add a GPT-5-mini call that:

1. **Decomposes** the topic into 3-5 faceted sub-queries:
   - Population/context facet
   - Key variable/intervention facet
   - Outcome/effect facet
   - Theoretical/framework facet
   - Methodological facet

2. **Expands** each sub-query with field-specific terminology:
   - "student performance" → also search "academic achievement", "learning outcomes", "educational attainment"

3. **Re-ranks** after search: A follow-up GPT-5-mini call scores the top 25 results by relevance to the actual research question (not just keyword overlap)

**Where this lives**: Enhanced `lib/utils/queryExpansion.ts` + new `lib/services/queryDecompositionService.ts`

**Token cost**: ~2k for decomposition, ~3k for re-ranking = ~5k total

### 5.2 Structure Prompt Rewrite

**Current problems:**
- Wall of text with competing instructions
- Generic academic skeleton (Introduction → Lit Review → Methodology)
- No connection between sources and outline
- Sources listed but not analyzed

**New prompt — thesis-first, source-aware:**

```
You are planning a [level] [document type] on "[topic]".

RESEARCH INTELLIGENCE:
Central argument suggestion: [from source analysis]
Thematic clusters found:
[cluster summaries with source counts]
Research gaps identified:
[gaps]

PLANNING TASK:
1. First, articulate the CENTRAL ARGUMENT this paper will advance based on the research intelligence above
2. Design a structure where each chapter advances this argument — every chapter must have a clear argumentative role
3. For each chapter, specify:
   - Its argumentative role (establishes context / builds evidence / addresses counterarguments / synthesizes)
   - Which thematic clusters from the research it draws on
   - The specific thesis for that chapter
   - How it connects to the previous and next chapters

ACADEMIC LEVEL: [level]
- [level-specific requirements: citations per section, depth, word counts]

CONSTRAINTS:
- Each chapter must build on the previous — no chapter should be independently readable
- The structure should follow naturally from what the sources say, not a generic template
- If sources reveal an unexpected angle or tension, the structure should reflect that

[Compact humanization hint — 2 lines max]
```

### 5.3 Chapter Generation Prompt Rewrite

**Current problems:**
1. ALL sources raw-dumped into every chapter (15+ sources, raw excerpts)
2. No thesis or argument thread
3. ~60% of prompt is humanization instructions, ~40% writing guidance
4. No synthesis instructions — LLM defaults to source-by-source summarization
5. Word count instructions repeated 4 times

**New chapter prompt — argument-threaded, mapped sources, synthesis-first:**

```
ROLE: You are a [level] academic writer constructing [chapter heading] of a [document type].

ARGUMENT THREAD:
- Paper's central argument: [from structure]
- Previous chapter established: [running argument summary, 2-3 sentences]
- THIS chapter's thesis: [from section mapping]
- This chapter's argumentative role: [establishes_context / builds_evidence / etc.]
- Next chapter will address: [preview for foreshadowing]

SOURCES FOR THIS CHAPTER:
[Only 3-7 mapped sources, pre-analyzed:]

1. [Author, Year] — "[Title]"
   Key finding: [extracted finding]
   Methodology: [study type, n=X]
   Use for: [how this source supports the chapter thesis]

2. [Author, Year] — "[Title]"
   ...

THEMATIC CONTEXT:
[Relevant thematic cluster summary: what sources agree on, where they disagree]

SYNTHESIS INSTRUCTIONS (CRITICAL):
- Organize by THEMES that cut across sources, not source-by-source
- Each paragraph must draw from at least 2 sources
- Introduce sources with signal phrases: "According to Smith's (2023) longitudinal study..." NOT "(Smith, 2023)"
- After presenting evidence, ANALYZE it: What does this mean? Why does it matter for your thesis?
- Address contradictions between sources — do not ignore disagreements
- Connect each major point back to the chapter thesis

CHAPTER REQUIREMENTS:
- Target: [wordCount] words
- Citations: [level-specific count] per major point
- Subsections: [list from structure]

Begin writing now in HTML format.
```

**System message** (where humanization rules live):
```
You are an expert academic writer. Your writing demonstrates:
- [level-specific analysis style]
- Natural sentence variation (mix short, medium, long)
- Active voice (70-80%)
- Specific data points and examples over vague claims
- No em-dashes — use commas, parentheses, or colons
- None of these words: "Furthermore", "Moreover", "delve", "landscape", "tapestry", "multifaceted"
- No 3+ AI-flagged phrases per paragraph

Write with authority. Every claim supported by evidence.
```

The humanization rules are compressed from ~50 lines to ~10 lines in the system message. The user prompt focuses entirely on writing guidance.

---

## 6. Cross-Chapter Argument Threading

### 6.1 Problem

By chapter 4-5, the LLM has lost track of what was argued in chapters 1-2. Current approach passes last 3500 words of raw text — noisy and loses early chapters entirely.

### 6.2 Solution: Running Argument Summary

After each chapter is generated, extract a compact argument summary:

```typescript
interface ChapterArgumentSummary {
  chapterHeading: string;
  thesisAdvanced: string;        // "This chapter established that..."
  keyEvidence: string[];          // 2-3 most important claims with citations
  connectionToNext: string;      // "This sets up the discussion of..."
}
```

**Implementation**: After chapter content streams and completes, make a lightweight GPT-5-mini call:

```
Summarize what this chapter established in 3 sentences:
1. The thesis it advanced
2. The key evidence presented (with author citations)
3. How it connects to the next chapter

Chapter content: [generated chapter text]
```

**Token cost**: ~1-2k per chapter (input: chapter text, output: 3 sentences)

**How it's used**: All previous chapter summaries (not raw text) are passed to subsequent chapters. For a 6-chapter paper, chapter 6 receives ~18 sentences of argument context instead of 3500 words of truncated raw text.

---

## 7. Targeted Perplexity Enrichment

### 7.1 Problem

Current Perplexity query is generic: `"Provide comprehensive factual information about [heading] in the context of [topic]"`

### 7.2 Solution

Use the section thesis and mapped source themes to construct targeted queries:

```
Find recent empirical evidence about [specific claim from section thesis].
Focus on: [key points from section mapping]
Specifically look for: data, statistics, case studies, and research findings from the last 3 years.
Do NOT provide general background — focus on specific evidence and data points.
```

---

## 8. Token Estimation Updates

### 8.1 New Token Estimates

Add to `lib/middleware/tokenMiddleware.ts`:

```typescript
export function estimateSourceAnalysisTokens(params: {
  sourceCount: number;
}): number {
  // Input: ~800-1000 tokens per source (excerpt + metadata) + 500 prompt
  // Output: ~3000-5000 for structured analysis
  return (params.sourceCount * 900) + 500 + 4000;
}

export function estimateQueryDecompositionTokens(): number {
  return 2000; // Fixed cost for query decomposition
}

export function estimateReRankingTokens(params: {
  candidateCount: number;
}): number {
  return params.candidateCount * 100 + 500;
}

export function estimateArgumentSummaryTokens(): number {
  return 1500; // Per chapter
}
```

### 8.2 Updated MIN_TOKENS

```typescript
export const MIN_TOKENS = {
  RESEARCH: 1000,
  SOURCE_ANALYSIS: 1500,  // NEW
  STRUCTURE: 1000,
  CHAPTER: 2000,
  CHAT: 500,
  DEFAULT: 1000,
} as const;
```

### 8.3 Update `deductTokens` Operation Types

The `operationType` union in `tokenMiddleware.ts` must be extended:

```typescript
operationType: 'research' | 'structure' | 'chapter' | 'chat' | 'generate'
  | 'source_analysis' | 'query_decomposition' | 're_ranking' | 'argument_summary'
```

---

## 9. Post-Generation Quality Monitoring

### 9.1 Lightweight Checks (No Blocking)

After chapter content finishes streaming, run on the buffered content:

1. **Em-dash count** — using existing `countEmDashes()` from `humanization.ts`
2. **Banned phrase check** — using existing `checkForBannedPhrases()`
3. **ChatGPT fingerprint** — using existing `detectChatGPTFingerprint()`
4. **Word count validation** — compare against target
5. **Source citation count** — count `(Author, Year)` patterns

Log results to console. Do not block or re-generate. This is monitoring data that can inform future prompt refinements.

---

## 10. File Changes Summary

### New Files
- `lib/services/sourceAnalysisService.ts` — Source intelligence analysis
- `lib/services/queryDecompositionService.ts` — Research query decomposition
- `app/api/write/analyze-sources/route.ts` — Source analysis API endpoint
- `supabase/migrations/YYYYMMDDHHMMSS_free_tier_signup.sql` — Free tier DB migration (constraints + trigger + backfill)
- `supabase/migrations/YYYYMMDDHHMMSS_source_analysis_tables.sql` — Source analysis, mappings, argument summaries + RLS

### Modified Files
- `lib/config/aiModels.ts` — Add OPENAI provider
- `lib/services/aiService.ts` — Add OpenAI streaming/non-streaming, add `getEffectiveProvider()`
- `lib/services/tokenService.ts` — Add free plan support
- `lib/services/stripeService.ts` — Expire free subscription on paid plan purchase
- `lib/services/paystackService.ts` — Expire free subscription on paid plan purchase
- `lib/middleware/tokenMiddleware.ts` — Add new estimation functions, update MIN_TOKENS, extend operationType union
- `app/api/write/structure/route.ts` — Rewrite prompt, use `@ai-sdk/openai` for free tier model routing
- `app/api/write/generate-chapter/route.ts` — Rewrite prompt, use mapped sources, argument threading, save argument summaries
- `app/api/write/research/route.ts` — Add query decomposition, re-ranking, trigger source analysis
- `lib/utils/queryExpansion.ts` — Enhanced with decomposition support
- `lib/utils/humanizationPrompt.ts` — Compact system message version
- `package.json` — Add `openai`, `@ai-sdk/openai` dependencies
- `.env.example` — Add `OPENAI_API_KEY`

### Unchanged Files
- `lib/config/humanization.ts` — Kept as-is (comprehensive reference)
- `lib/services/searchService.ts` — Unchanged (called with better queries)
- `lib/services/claudeResearchAgent.ts` — Unchanged (deep research is separate)
- `lib/services/perplexityService.ts` — Unchanged (called with better queries)

---

## 11. Pipeline Flow (Before vs After)

### Before
```
User Input → Search (generic queries) → Save Sources → Generate Structure (generic template)
→ Generate Chapters (ALL sources dumped, no thesis, no synthesis guidance) → Output
```

### After
```
User Input
→ Query Decomposition (GPT-5-mini: 3-5 faceted sub-queries)
→ Search (targeted queries via Exa + Perplexity)
→ Re-rank Results (GPT-5-mini: top 25 scored by relevance)
→ Save Sources
→ Source Analysis (GPT-5-mini: extract claims, themes, clusters, gaps)
→ Generate Structure (thesis-first, source-aware, argument-driven)
→ Map Sources to Sections (GPT-5-mini: 3-7 relevant sources per chapter)
→ Generate Chapters (mapped sources only, argument thread, synthesis instructions)
  → After each chapter: Extract argument summary for threading
→ Post-generation quality monitoring (em-dashes, banned phrases, word count)
→ Output
```

### Token Cost Comparison (15-source, 5-chapter undergraduate paper)

| Step | Before | After |
|------|--------|-------|
| Research | ~12,000 | ~17,000 (+query decomposition, re-ranking) |
| Source Analysis | 0 | ~18,000 (15 sources analyzed) |
| Structure | ~2,500 | ~3,500 (thesis-first, source-aware) |
| Source-to-Section Mapping | 0 | ~3,000 |
| Chapters (5x) | ~40,000 | ~35,000 (less input per chapter due to mapping) |
| Argument Summaries | 0 | ~7,500 (5 chapters) |
| **Total** | **~54,500** | **~84,000** |

Net increase: ~29,500 tokens (~54%) for dramatically better output quality. At GPT-5-mini rates ($0.125/M input, $1/M output), the additional cost is approximately $0.005 per paper — negligible.

**For free-tier users (10 sources, no re-ranking, no argument summaries):**

| Step | Tokens |
|------|--------|
| Research (10 sources) | ~8,000 |
| Source Analysis | ~13,000 |
| Structure | ~3,000 |
| 1 Chapter | ~7,000 |
| **Total** | **~31,000** |

This exceeds the 20k free allowance. **Recommendation**: For free users, make source analysis optional (show a "skip" button) or reduce source analysis depth (extract only key findings, skip methodology/limitations). This brings the total to ~20-22k tokens — tight but workable for experiencing one chapter.

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Source analysis adds latency | Run concurrently with metadata enrichment (already async) |
| GPT-5-mini quality too low for academic writing | It's used for analysis/mapping, not writing. Writing still uses Groq/Claude for paid users |
| Free 20k tokens abused (bot signups) | Standard Supabase auth protections + can add rate limiting later |
| Argument summary extraction fails | Graceful fallback to current truncated-context approach (pass last 3500 words) |
| OpenAI API downtime | Free users blocked; paid users unaffected (they use Groq/Claude). No automatic failover implemented — can be added later |
| Free tier token budget too tight | Source analysis made optional for free users; can increase to 25k tokens if needed |
| DB constraint violations on free insert | Migration explicitly alters CHECK constraints and nullability before trigger change |
| Free→Paid upgrade conflict | Webhook handlers expire free subscription before creating paid one |
