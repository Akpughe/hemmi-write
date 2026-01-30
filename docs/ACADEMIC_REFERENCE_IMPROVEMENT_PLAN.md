# Hemmi Academic Reference Quality Improvement Plan

**Date:** 2026-01-10
**Status:** Implementation Ready
**Priority:** Critical
**Estimated Timeline:** 4-6 weeks

---

## Executive Summary

This document outlines a comprehensive plan to dramatically improve the quality, completeness, and reliability of academic references in Hemmi. The current system suffers from incomplete metadata (~40-60% missing authors), lack of academic source prioritization, and no validation against authoritative metadata APIs. This plan addresses these gaps systematically.

**Expected Impact:**
- Reduce incomplete author metadata from ~50% to <5%
- Increase peer-reviewed source ratio from ~30% to ~90%
- Enable reliable citation generation for all academic levels (Undergraduate → PhD)
- Differentiate Hemmi from competitors with superior reference quality

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Identified Gaps](#identified-gaps)
3. [Proposed Solution Architecture](#proposed-solution-architecture)
4. [Implementation Phases](#implementation-phases)
5. [Technical Specifications](#technical-specifications)
6. [API Integration Details](#api-integration-details)
7. [Database Schema Updates](#database-schema-updates)
8. [Testing Strategy](#testing-strategy)
9. [Success Metrics](#success-metrics)
10. [Rollout Plan](#rollout-plan)

---

## Current State Analysis

### What Works Well ✅

1. **Parallel Search Infrastructure**
   - Exa + Perplexity integration working reliably
   - Good deduplication and domain diversity logic
   - Robust retry mechanisms with p-queue

2. **Content Fetching Pipeline**
   - Metascraper + Mistral LLM extraction
   - PDF OCR support via Mistral vision
   - Database schema supports rich metadata (DOI, journal, authors, volume, etc.)

3. **Citation Formatting**
   - Multiple citation styles (APA, MLA, Harvard, Chicago, IEEE)
   - Structured author formatting
   - In-text and reference list generation

### Critical Gaps ❌

1. **No Academic Source Prioritization**
   - Generic web search treats blogs and Nature equally
   - No preference for peer-reviewed journals, conference papers
   - Missing integration with Google Scholar, PubMed, IEEE Xplore

2. **No Metadata API Integration**
   - Relies entirely on HTML scraping + LLM extraction
   - No CrossRef, OpenAlex, Semantic Scholar, or Unpaywall integration
   - Cannot validate or enrich metadata from authoritative sources

3. **No Quality Scoring System**
   - All sources treated equally
   - No filtering based on source credibility
   - No prioritization of peer-reviewed over web articles

4. **Incomplete Author Extraction**
   - ~40-60% of sources lack author information
   - Citations utility **skips sources without authors** (citations.ts:11-13, 279-282)
   - Results in incomplete reference lists

5. **No DOI-Centric Workflow**
   - DOIs extracted opportunistically but not systematically
   - No DOI-based metadata lookup
   - Missing DOI extraction from URLs (e.g., doi.org/10.1234/abc)

6. **No Domain/Source Quality Filtering**
   - No preference for .edu, .org, .gov domains
   - No filtering for academic publishers (Springer, Elsevier, IEEE, ACM)
   - Results in low-quality web sources mixed with academic content

---

## Identified Gaps

### Gap 1: Academic Source Discovery
**Problem:** Generic search doesn't prioritize academic databases.

**Impact:** Students get Medium posts instead of journal papers.

**Solution:** Implement priority source list and domain filtering.

### Gap 2: Metadata Validation
**Problem:** No authoritative metadata validation.

**Impact:** "Anonymous" authors, missing DOIs, incomplete citations.

**Solution:** Integrate CrossRef, OpenAlex, Semantic Scholar APIs.

### Gap 3: Quality Control
**Problem:** No mechanism to filter low-quality sources.

**Impact:** Unreliable citations that hurt academic credibility.

**Solution:** Implement 0-5 scoring system with thresholds.

### Gap 4: DOI Resolution
**Problem:** DOIs not extracted from URLs or used for metadata lookup.

**Impact:** Missing authoritative metadata for papers with DOIs.

**Solution:** Systematic DOI extraction + CrossRef resolution.

### Gap 5: Source Type Detection
**Problem:** Cannot distinguish journal papers from blog posts.

**Impact:** Inconsistent citation quality across document types.

**Solution:** Use metadata APIs to detect publication types.

### Gap 6: Author Name Quality
**Problem:** LLM extraction produces inconsistent author formats.

**Impact:** Citations with "John D." vs "John Doe" vs "J. Doe".

**Solution:** Use structured author data from CrossRef/OpenAlex.

---

## Proposed Solution Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   User Query: "AI Ethics"                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           PHASE 1: Academic-First Search                     │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Google       │  │ PubMed       │  │ IEEE Xplore  │      │
│  │ Scholar      │  │ (Bio/Med)    │  │ (Engineering)│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  Domain Filters: scholar.google.com, pubmed.gov,            │
│                  ieee.org, acm.org, arxiv.org                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         PHASE 2: Metadata API Enrichment                     │
│                                                               │
│  For each source:                                            │
│  1. Extract DOI (from URL or content)                        │
│  2. Query CrossRef API (if DOI exists)                       │
│  3. Query OpenAlex API (title + author fallback)            │
│  4. Query Semantic Scholar (citation count, venue)           │
│  5. Merge metadata (prefer API over scraping)                │
│                                                               │
│  Output: Enriched source with:                               │
│    - Structured authors (first, last, middle)                │
│    - DOI, journal, volume, issue, pages                      │
│    - Publication type (journal, conference, preprint)        │
│    - Citation count, venue prestige                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            PHASE 3: Quality Scoring & Filtering              │
│                                                               │
│  Score Calculation (0-5):                                    │
│    +3: Peer-reviewed journal/conference                      │
│    +2: Has DOI                                                │
│    +1: Recent (last 5 years)                                 │
│    +2: Reputable venue (high citation count)                 │
│    +2: High relevance to query                               │
│                                                               │
│  Filter: Keep only sources with score >= 3.5                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          PHASE 4: Citation Generation                        │
│                                                               │
│  Generate citations using structured metadata:               │
│    - Authors from authorsStructured (not LLM guesses)        │
│    - DOI links for verification                              │
│    - Complete journal/venue information                      │
│    - Proper formatting per citation style                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Metadata API Integration (Weeks 1-2) ⭐⭐⭐

**Priority:** HIGHEST
**Impact:** Eliminate 80% of incomplete author issues
**Dependencies:** None

#### Objectives
1. Integrate CrossRef API for DOI-based metadata lookup
2. Integrate OpenAlex API for title/author-based lookup
3. Integrate Semantic Scholar API for citation metrics
4. Add Unpaywall API for open access checking

#### Deliverables
- `lib/services/metadataEnrichmentService.ts` (new)
- Update `app/api/write/research/route.ts` to call enrichment after content fetch
- Update database schema to store API metadata
- Add API key configuration to `.env`

#### Implementation Steps

**Step 1.1: Create Metadata Enrichment Service**
```typescript
// lib/services/metadataEnrichmentService.ts

interface EnrichmentResult {
  source: 'crossref' | 'openalex' | 'semanticscholar' | 'scraping';
  confidence: 'high' | 'medium' | 'low';

  // Enriched metadata
  authorsStructured?: Author[];
  author?: string; // Fallback string
  doi?: string;
  journalName?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  year?: number;
  publisher?: string;
  publicationType?: 'journal' | 'conference' | 'preprint' | 'book' | 'web';
  citationCount?: number;
  venuePrestige?: 'high' | 'medium' | 'low';
}

class MetadataEnrichmentService {
  // 1. Extract DOI from URL or content
  async extractDoi(url: string, content?: string): Promise<string | null>

  // 2. Lookup metadata via CrossRef (DOI-based)
  async enrichFromCrossRef(doi: string): Promise<EnrichmentResult | null>

  // 3. Lookup metadata via OpenAlex (title/author-based)
  async enrichFromOpenAlex(title: string, author?: string): Promise<EnrichmentResult | null>

  // 4. Lookup citation metrics via Semantic Scholar
  async enrichFromSemanticScholar(doi?: string, title?: string): Promise<EnrichmentResult | null>

  // 5. Check open access via Unpaywall
  async checkOpenAccess(doi: string): Promise<{ isOpenAccess: boolean; oaUrl?: string }>

  // 6. Main enrichment pipeline
  async enrichSource(source: ResearchSource): Promise<EnrichedResearchSource>
}
```

**Step 1.2: Integrate into Research Pipeline**
```typescript
// app/api/write/research/route.ts

// After content fetching (line ~255)
console.log(`[Content Fetch] Success: ${successCount}/${fetchResults.length}`);

// NEW: Enrich metadata via APIs
try {
  console.log(`[Metadata Enrichment] Starting for ${insertedSources.length} sources`);

  const enrichmentResults = await Promise.all(
    insertedSources.map(source =>
      metadataEnrichmentService.enrichSource(source)
    )
  );

  // Update database with enriched metadata
  for (const enriched of enrichmentResults) {
    const updateData = {
      author: enriched.author,
      authors_structured: enriched.authorsStructured ? JSON.stringify(enriched.authorsStructured) : null,
      doi: enriched.doi,
      journal_name: enriched.journalName,
      volume: enriched.volume,
      issue: enriched.issue,
      pages: enriched.pages,
      year: enriched.year,
      publisher: enriched.publisher,
      publication_type: enriched.publicationType,
      citation_count: enriched.citationCount,
      metadata_source: enriched.source,
      metadata_confidence: enriched.confidence,
    };

    await supabase
      .from('research_sources')
      .update(updateData)
      .eq('id', enriched.id);
  }

  console.log(`[Metadata Enrichment] Completed: ${enrichmentResults.length} sources enriched`);
} catch (enrichError) {
  console.error('[Metadata Enrichment] Non-fatal error:', enrichError);
}
```

**Step 1.3: Add Database Columns**
```sql
-- Add to research_sources table
ALTER TABLE research_sources
ADD COLUMN citation_count INTEGER,
ADD COLUMN metadata_source TEXT, -- 'crossref', 'openalex', 'semanticscholar', 'scraping'
ADD COLUMN metadata_confidence TEXT, -- 'high', 'medium', 'low'
ADD COLUMN venue_prestige TEXT, -- 'high', 'medium', 'low'
ADD COLUMN open_access_url TEXT;

-- Add index for faster queries
CREATE INDEX idx_research_sources_metadata_confidence ON research_sources(metadata_confidence);
CREATE INDEX idx_research_sources_publication_type ON research_sources(publication_type);
```

**Step 1.4: Environment Variables**
```env
# API Keys for Metadata Enrichment
CROSSREF_API_EMAIL=your-email@hemmi.com  # Required for polite requests
OPENALEX_API_EMAIL=your-email@hemmi.com  # Optional but recommended
SEMANTIC_SCHOLAR_API_KEY=your-key-here   # Optional, increases rate limits
UNPAYWALL_EMAIL=your-email@hemmi.com     # Required for Unpaywall
```

#### Acceptance Criteria
- [ ] CrossRef API successfully returns metadata for 90%+ of sources with DOIs
- [ ] OpenAlex API successfully enriches 70%+ of sources without DOIs
- [ ] Enriched sources have `authorsStructured` field populated
- [ ] Database stores metadata source and confidence level
- [ ] No degradation in search performance (<2s additional latency)

---

### Phase 2: Academic Source Prioritization (Weeks 2-3) ⭐⭐

**Priority:** HIGH
**Impact:** 3x improvement in source relevance
**Dependencies:** None

#### Objectives
1. Implement domain filtering for academic sources
2. Add structured query templates for different search intents
3. Prioritize searches to academic databases first
4. Add venue/journal reputation scoring

#### Deliverables
- `lib/utils/academicSourcePriority.ts` (new)
- Update `lib/services/searchService.ts` with domain filters
- Update `lib/services/perplexityService.ts` with search_domain_filter

#### Implementation Steps

**Step 2.1: Academic Domain Priority List**
```typescript
// lib/utils/academicSourcePriority.ts

export const ACADEMIC_DOMAINS = {
  // Core Academic Databases
  tier1: [
    'scholar.google.com',
    'pubmed.ncbi.nlm.nih.gov',
    'ieee.org',
    'acm.org',
    'sciencedirect.com',
    'springer.com',
    'jstor.org',
    'nature.com',
    'science.org',
  ],

  // Institutional & Government
  tier2: [
    'worldbank.org',
    'un.org',
    'who.int',
    'unesco.org',
    'oecd.org',
    'census.gov',
    'nih.gov',
  ],

  // Preprints & Open Repositories
  tier3: [
    'arxiv.org',
    'biorxiv.org',
    'ssrn.com',
    'researchgate.net',
  ],

  // University Repositories (pattern match)
  universityPattern: /\.(edu|ac\.uk|ac\.jp|edu\.au|edu\.cn)$/,
};

export const HIGH_PRESTIGE_VENUES = [
  // Top Journals
  'Nature',
  'Science',
  'Cell',
  'The Lancet',
  'JAMA',
  'New England Journal of Medicine',

  // Top Conferences (CS)
  'NeurIPS',
  'ICML',
  'CVPR',
  'ICCV',
  'ACL',
  'EMNLP',
  'SIGMOD',
  'VLDB',
];

export function getDomainPrestige(domain: string): 'high' | 'medium' | 'low' {
  if (ACADEMIC_DOMAINS.tier1.some(d => domain.includes(d))) return 'high';
  if (ACADEMIC_DOMAINS.tier2.some(d => domain.includes(d))) return 'medium';
  if (ACADEMIC_DOMAINS.tier3.some(d => domain.includes(d))) return 'medium';
  if (ACADEMIC_DOMAINS.universityPattern.test(domain)) return 'medium';
  return 'low';
}

export function getVenuePrestige(venueName: string): 'high' | 'medium' | 'low' {
  if (HIGH_PRESTIGE_VENUES.some(v => venueName.includes(v))) return 'high';
  // Add more sophisticated matching logic here
  return 'medium';
}
```

**Step 2.2: Update Search Service with Domain Filters**
```typescript
// lib/services/searchService.ts

async searchParallel(options: SearchOptions): Promise<ResearchSource[]> {
  // ... existing code ...

  // NEW: Add academic domain filters
  const academicDomains = [
    ...ACADEMIC_DOMAINS.tier1,
    ...ACADEMIC_DOMAINS.tier2,
    ...ACADEMIC_DOMAINS.tier3,
  ];

  // Execute parallel searches with domain filters
  const [exaResult, perplexityResult] = await Promise.allSettled([
    this.searchExa({
      query: primaryQuery,
      numResults: exaCount,
      documentType,
      // NEW: Prefer academic domains
      domainFilter: academicDomains,
    }),
    this.searchPerplexityMulti(queries, perplexityCount, {
      // NEW: Filter to academic domains
      searchDomainFilter: academicDomains,
    }),
  ]);

  // ... rest of existing code ...
}
```

**Step 2.3: Structured Query Templates**
```typescript
// lib/utils/queryTemplates.ts

export function getAcademicQueryTemplate(
  topic: string,
  documentType: DocumentType,
  queryType: 'general' | 'data' | 'preprints' | 'books'
): string {
  switch (queryType) {
    case 'general':
      return `Find the top 10 peer-reviewed academic sources on ${topic}. Provide full citations with DOI links and short summaries.`;

    case 'data':
      return `Retrieve authoritative reports and statistics on ${topic} from government or institutional databases (World Bank, UN, national stats, OECD). Provide titles, dates, and direct URLs.`;

    case 'preprints':
      return `List recent (last 2-3 years) relevant preprints or emerging research on ${topic} from arXiv, bioRxiv, SSRN. Include abstracts and publication metadata.`;

    case 'books':
      return `Search WorldCat and institutional repositories for books or theses related to ${topic}. Provide bibliographic details and accessible links.`;
  }
}
```

**Step 2.4: Perplexity Domain Filtering**
```typescript
// lib/services/perplexityService.ts

async chatCompletion(
  query: string,
  options: { searchDomainFilter?: string[] } = {}
): Promise<PerplexityChatResponse> {
  // ... existing code ...

  const response = await this.client.chat.completions.create({
    model: "sonar-pro",
    messages: [/* ... */],
    // NEW: Use domain filtering
    ...(options.searchDomainFilter && {
      search_domain_filter: options.searchDomainFilter
    }),
    return_citations: true,
  });

  // ... rest of code ...
}
```

#### Acceptance Criteria
- [ ] 80%+ of search results come from academic domains
- [ ] Domain prestige scoring working correctly
- [ ] Perplexity search respects domain filters
- [ ] Query templates generate appropriate academic queries
- [ ] University repositories (.edu domains) prioritized

---

### Phase 3: Quality Scoring & Filtering (Weeks 3-4) ⭐

**Priority:** MEDIUM-HIGH
**Impact:** Eliminates low-quality sources
**Dependencies:** Phase 1 (needs enriched metadata)

#### Objectives
1. Implement 0-5 quality scoring system
2. Filter sources with score <3.5 automatically
3. Sort results by quality score
4. Add quality indicators in UI

#### Deliverables
- `lib/utils/sourceQualityScorer.ts` (new)
- Update search pipeline to apply scoring
- Add quality score to database
- Update UI to show quality indicators

#### Implementation Steps

**Step 3.1: Quality Scoring Algorithm**
```typescript
// lib/utils/sourceQualityScorer.ts

interface QualityScoreBreakdown {
  peerReviewScore: number;      // 0-3 points
  doiScore: number;              // 0-2 points
  recencyScore: number;          // 0-1 points
  venuePrestigeScore: number;    // 0-2 points
  relevanceScore: number;        // 0-2 points
  totalScore: number;            // 0-10 (normalized to 0-5)
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export function calculateQualityScore(
  source: EnrichedResearchSource
): QualityScoreBreakdown {
  let score = 0;

  // 1. Peer Review Status (0-3 points)
  if (source.publicationType === 'journal') {
    score += 3; // Highest quality: peer-reviewed journal
  } else if (source.publicationType === 'conference') {
    score += 2.5; // High quality: peer-reviewed conference
  } else if (source.publicationType === 'preprint') {
    score += 1; // Medium quality: not peer-reviewed yet
  } else if (source.publicationType === 'web') {
    score += 0; // Lowest quality: random web content
  }
  const peerReviewScore = score;

  // 2. DOI Presence (0-2 points)
  let doiScore = 0;
  if (source.doi) {
    doiScore = 2;
    score += 2;
  }

  // 3. Recency (0-1 points)
  let recencyScore = 0;
  const currentYear = new Date().getFullYear();
  if (source.year) {
    const age = currentYear - source.year;
    if (age <= 3) {
      recencyScore = 1;
      score += 1;
    } else if (age <= 5) {
      recencyScore = 0.5;
      score += 0.5;
    }
  }

  // 4. Venue Prestige (0-2 points)
  let venuePrestigeScore = 0;
  if (source.venuePrestige === 'high') {
    venuePrestigeScore = 2;
    score += 2;
  } else if (source.venuePrestige === 'medium') {
    venuePrestigeScore = 1;
    score += 1;
  }

  // 5. Relevance (0-2 points) - from search score
  let relevanceScore = 0;
  if (source.score !== undefined) {
    relevanceScore = source.score * 2; // Normalize to 0-2
    score += relevanceScore;
  }

  // Normalize to 0-5 scale
  const totalScore = Math.min(5, score / 2);

  // Assign grade
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (totalScore >= 4.5) grade = 'A';
  else if (totalScore >= 3.5) grade = 'B';
  else if (totalScore >= 2.5) grade = 'C';
  else if (totalScore >= 1.5) grade = 'D';
  else grade = 'F';

  return {
    peerReviewScore,
    doiScore,
    recencyScore,
    venuePrestigeScore,
    relevanceScore,
    totalScore,
    grade,
  };
}

export function filterByQualityThreshold(
  sources: EnrichedResearchSource[],
  minScore: number = 3.5
): EnrichedResearchSource[] {
  return sources.filter(source => {
    const scoreBreakdown = calculateQualityScore(source);
    return scoreBreakdown.totalScore >= minScore;
  });
}
```

**Step 3.2: Integrate into Research Pipeline**
```typescript
// app/api/write/research/route.ts

// After metadata enrichment
const enrichedSources = enrichmentResults;

// NEW: Calculate quality scores
const sourcesWithScores = enrichedSources.map(source => {
  const qualityScore = calculateQualityScore(source);
  return {
    ...source,
    qualityScore: qualityScore.totalScore,
    qualityGrade: qualityScore.grade,
    qualityBreakdown: qualityScore,
  };
});

// NEW: Filter by quality threshold
const minQualityScore = 3.5; // B grade or higher
const filteredSources = sourcesWithScores.filter(
  s => s.qualityScore >= minQualityScore
);

console.log(`[Quality Filter] Kept ${filteredSources.length}/${sourcesWithScores.length} sources (score >= ${minQualityScore})`);

// NEW: Sort by quality score (descending)
filteredSources.sort((a, b) => b.qualityScore - a.qualityScore);

// Update database with quality scores
for (const source of filteredSources) {
  await supabase
    .from('research_sources')
    .update({
      quality_score: source.qualityScore,
      quality_grade: source.qualityGrade,
    })
    .eq('id', source.id);
}
```

**Step 3.3: Database Schema**
```sql
ALTER TABLE research_sources
ADD COLUMN quality_score DECIMAL(3,2), -- 0.00 to 5.00
ADD COLUMN quality_grade TEXT; -- 'A', 'B', 'C', 'D', 'F'

CREATE INDEX idx_research_sources_quality_score ON research_sources(quality_score DESC);
```

#### Acceptance Criteria
- [ ] Quality scoring algorithm validated on 100+ test sources
- [ ] Sources with score <3.5 filtered automatically
- [ ] Search results sorted by quality score
- [ ] Quality scores stored in database
- [ ] UI shows quality indicators (A/B/C/D/F badges)

---

### Phase 4: Enhanced Query System (Week 4) ⭐

**Priority:** MEDIUM
**Impact:** Better search precision
**Dependencies:** Phase 2

#### Objectives
1. Implement structured query templates
2. Add query expansion for academic contexts
3. Multi-intent query generation (general, data, preprints, books)
4. Domain-specific query optimization

#### Deliverables
- Enhanced query generation in `lib/services/searchService.ts`
- Query templates library
- Multi-intent search execution

#### Implementation Steps

**Step 4.1: Multi-Intent Query Generation**
```typescript
// lib/services/searchService.ts

async searchParallel(options: SearchOptions): Promise<ResearchSource[]> {
  // ... existing code ...

  // NEW: Generate queries for different search intents
  const queries = {
    general: getAcademicQueryTemplate(topic, documentType, 'general'),
    data: getAcademicQueryTemplate(topic, documentType, 'data'),
    preprints: getAcademicQueryTemplate(topic, documentType, 'preprints'),
  };

  // Execute searches in parallel for each intent
  const [generalResults, dataResults, preprintResults] = await Promise.allSettled([
    this.searchPerplexity(queries.general, { searchDomainFilter: ACADEMIC_DOMAINS.tier1 }),
    this.searchPerplexity(queries.data, { searchDomainFilter: ACADEMIC_DOMAINS.tier2 }),
    this.searchPerplexity(queries.preprints, { searchDomainFilter: ACADEMIC_DOMAINS.tier3 }),
  ]);

  // Merge results with diversity
  // ...
}
```

#### Acceptance Criteria
- [ ] Multi-intent queries generate diverse result types
- [ ] Query templates validated for different academic levels
- [ ] Domain-specific optimization working (e.g., biomedical → PubMed preference)

---

## Technical Specifications

### API Integration Details

#### CrossRef API
**Purpose:** DOI-based metadata lookup
**Endpoint:** `https://api.crossref.org/works/{doi}`
**Rate Limit:** None (polite requests with email)
**Cost:** FREE

**Sample Request:**
```bash
curl "https://api.crossref.org/works/10.1038/nature12373" \
  -H "User-Agent: Hemmi/1.0 (mailto:dev@hemmi.com)"
```

**Sample Response:**
```json
{
  "message": {
    "DOI": "10.1038/nature12373",
    "title": ["Example Paper Title"],
    "author": [
      {
        "given": "John",
        "family": "Doe",
        "sequence": "first"
      }
    ],
    "published-print": { "date-parts": [[2023, 6, 15]] },
    "container-title": ["Nature"],
    "volume": "523",
    "issue": "7560",
    "page": "123-130",
    "publisher": "Springer Nature"
  }
}
```

#### OpenAlex API
**Purpose:** Title/author-based metadata lookup
**Endpoint:** `https://api.openalex.org/works`
**Rate Limit:** 10 req/sec (100k req/day with email)
**Cost:** FREE

**Sample Request:**
```bash
curl "https://api.openalex.org/works?filter=title.search:machine%20learning&mailto=dev@hemmi.com"
```

**Sample Response:**
```json
{
  "results": [
    {
      "id": "W2123456789",
      "title": "Machine Learning for AI Ethics",
      "doi": "https://doi.org/10.1234/abc",
      "publication_year": 2023,
      "authorships": [
        {
          "author": {
            "display_name": "John Doe"
          }
        }
      ],
      "primary_location": {
        "source": {
          "display_name": "Nature Machine Intelligence"
        }
      },
      "cited_by_count": 45
    }
  ]
}
```

#### Semantic Scholar API
**Purpose:** Citation metrics and venue ranking
**Endpoint:** `https://api.semanticscholar.org/graph/v1/paper/{doi}`
**Rate Limit:** 100 req/sec (with API key)
**Cost:** FREE (registration required for higher limits)

**Sample Request:**
```bash
curl "https://api.semanticscholar.org/graph/v1/paper/DOI:10.1038/nature12373?fields=title,authors,year,citationCount,influentialCitationCount,venue" \
  -H "x-api-key: YOUR_API_KEY"
```

#### Unpaywall API
**Purpose:** Check open access availability
**Endpoint:** `https://api.unpaywall.org/v2/{doi}`
**Rate Limit:** 100k req/day
**Cost:** FREE

**Sample Request:**
```bash
curl "https://api.unpaywall.org/v2/10.1038/nature12373?email=dev@hemmi.com"
```

---

## Database Schema Updates

```sql
-- Add metadata enrichment columns
ALTER TABLE research_sources
ADD COLUMN IF NOT EXISTS citation_count INTEGER,
ADD COLUMN IF NOT EXISTS metadata_source TEXT CHECK(metadata_source IN ('crossref', 'openalex', 'semanticscholar', 'scraping')),
ADD COLUMN IF NOT EXISTS metadata_confidence TEXT CHECK(metadata_confidence IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS venue_prestige TEXT CHECK(venue_prestige IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS open_access_url TEXT,
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) CHECK(quality_score >= 0 AND quality_score <= 5),
ADD COLUMN IF NOT EXISTS quality_grade TEXT CHECK(quality_grade IN ('A', 'B', 'C', 'D', 'F')),
ADD COLUMN IF NOT EXISTS domain_prestige TEXT CHECK(domain_prestige IN ('high', 'medium', 'low'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_research_sources_quality_score ON research_sources(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_research_sources_metadata_confidence ON research_sources(metadata_confidence);
CREATE INDEX IF NOT EXISTS idx_research_sources_publication_type ON research_sources(publication_type);
CREATE INDEX IF NOT EXISTS idx_research_sources_venue_prestige ON research_sources(venue_prestige);
CREATE INDEX IF NOT EXISTS idx_research_sources_domain_prestige ON research_sources(domain_prestige);

-- Add quality score to citations table
ALTER TABLE citations
ADD COLUMN IF NOT EXISTS source_quality_score DECIMAL(3,2);
```

---

## Testing Strategy

### Unit Tests

**Test: CrossRef Metadata Extraction**
```typescript
describe('MetadataEnrichmentService.enrichFromCrossRef', () => {
  it('should extract structured authors from CrossRef response', async () => {
    const result = await service.enrichFromCrossRef('10.1038/nature12373');
    expect(result.authorsStructured).toHaveLength(3);
    expect(result.authorsStructured[0]).toEqual({
      first: 'John',
      last: 'Doe',
      middle: undefined,
    });
  });

  it('should extract complete journal metadata', async () => {
    const result = await service.enrichFromCrossRef('10.1038/nature12373');
    expect(result.journalName).toBe('Nature');
    expect(result.volume).toBe('523');
    expect(result.issue).toBe('7560');
    expect(result.pages).toBe('123-130');
  });
});
```

**Test: Quality Scoring**
```typescript
describe('calculateQualityScore', () => {
  it('should give high score to peer-reviewed journal with DOI', () => {
    const source = {
      publicationType: 'journal',
      doi: '10.1234/abc',
      year: 2024,
      venuePrestige: 'high',
      score: 0.9,
    };
    const result = calculateQualityScore(source);
    expect(result.totalScore).toBeGreaterThan(4.5);
    expect(result.grade).toBe('A');
  });

  it('should give low score to web source without DOI', () => {
    const source = {
      publicationType: 'web',
      doi: null,
      year: 2015,
      venuePrestige: 'low',
      score: 0.3,
    };
    const result = calculateQualityScore(source);
    expect(result.totalScore).toBeLessThan(2.0);
    expect(result.grade).toBe('F');
  });
});
```

### Integration Tests

**Test: End-to-End Research Pipeline**
```typescript
describe('Research Pipeline with Metadata Enrichment', () => {
  it('should enrich sources with API metadata', async () => {
    const response = await fetch('/api/write/research', {
      method: 'POST',
      body: JSON.stringify({
        topic: 'machine learning ethics',
        documentType: 'RESEARCH_PAPER',
        numSources: 10,
        projectId: testProjectId,
      }),
    });

    const data = await response.json();

    // Check that sources have enriched metadata
    expect(data.sources.length).toBeGreaterThan(0);

    const enrichedSources = data.sources.filter(
      s => s.metadata_source === 'crossref' || s.metadata_source === 'openalex'
    );

    expect(enrichedSources.length).toBeGreaterThan(data.sources.length * 0.7); // 70%+ enriched

    // Check quality scores
    const highQualitySources = data.sources.filter(s => s.quality_score >= 3.5);
    expect(highQualitySources.length).toBeGreaterThan(5); // At least 5 high-quality sources
  });
});
```

### Manual Testing Checklist

- [ ] Search for "COVID-19 vaccines" returns PubMed papers
- [ ] Search for "climate change policy" returns government reports
- [ ] Search for "neural networks" returns recent arxiv preprints
- [ ] All sources have author names (no "Anonymous")
- [ ] Journal papers have DOI links
- [ ] Quality scores accurately reflect source credibility
- [ ] Citations format correctly with enriched metadata
- [ ] No performance degradation (<3s total search time)

---

## Success Metrics

### Key Performance Indicators (KPIs)

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **Sources with complete authors** | ~50% | >95% | Count sources with non-null `author` or `authorsStructured` |
| **Sources with DOIs** | ~20% | >70% | For journal/conference papers only |
| **Peer-reviewed source ratio** | ~30% | >80% | Sources with `publicationType` = journal/conference |
| **Quality score avg** | N/A | >3.8/5 | Average of all `quality_score` values |
| **Metadata from APIs** | 0% | >75% | Sources with `metadata_source` = crossref/openalex |
| **Citation generation success** | ~60% | >98% | % of sources that generate valid citations |
| **Academic domain coverage** | ~40% | >85% | Sources from tier1/tier2 academic domains |

### Quality Assurance Metrics

| Test | Pass Criteria |
|------|--------------|
| **Author completeness** | <5% sources without author in final reference list |
| **DOI validation** | 95%+ DOIs resolve successfully via CrossRef |
| **Metadata accuracy** | Manual review of 50 random sources, >90% accurate |
| **Citation formatting** | Zero formatting errors in generated citations |
| **Search relevance** | User satisfaction survey: >4.5/5 average |

### Performance Benchmarks

| Operation | Current | Target | Max Acceptable |
|-----------|---------|--------|----------------|
| **Total research time** | ~15s | <20s | 30s |
| **Metadata enrichment** | N/A | <3s | 5s |
| **Quality scoring** | N/A | <1s | 2s |
| **Citation generation** | ~2s | <3s | 5s |

---

## Rollout Plan

### Phase 1: Beta Testing (Week 5)
- Deploy to staging environment
- Internal testing with 10 diverse topics
- Fix critical bugs
- Performance optimization

### Phase 2: Limited Rollout (Week 6)
- Enable for 10% of users (A/B test)
- Monitor error rates and latency
- Collect user feedback
- Compare citation quality between old/new systems

### Phase 3: Full Rollout (Week 7)
- Gradual rollout to 50% of users
- Monitor API costs and rate limits
- Adjust quality score thresholds based on feedback
- Document best practices

### Phase 4: Optimization (Week 8)
- Fine-tune quality scoring algorithm
- Optimize API caching strategy
- Add advanced features (citation count display, venue badges)
- User education (tooltips explaining quality scores)

---

## Risk Mitigation

### Risk 1: API Rate Limits
**Mitigation:**
- Implement caching layer (Redis) for API responses
- Add exponential backoff for rate limit errors
- Fallback to scraping if APIs unavailable
- Monitor API usage dashboards

### Risk 2: Increased Latency
**Mitigation:**
- Parallel API calls (CrossRef + OpenAlex + Semantic Scholar)
- Set aggressive timeouts (3s per API call)
- Use cached results for repeated queries
- Lazy loading for non-critical metadata

### Risk 3: API Costs
**Mitigation:**
- All APIs are FREE (CrossRef, OpenAlex, Semantic Scholar, Unpaywall)
- Monitor usage to ensure staying within free tiers
- Add budget alerts in case of API changes

### Risk 4: Metadata Inconsistency
**Mitigation:**
- Prefer CrossRef (most authoritative) over other sources
- Validate extracted metadata with multiple APIs
- Add confidence scores to flag uncertain data
- Manual review pipeline for low-confidence sources

### Risk 5: User Confusion (Quality Scores)
**Mitigation:**
- Clear UI indicators (A/B/C/D/F badges with tooltips)
- Educational content explaining scoring system
- Option to show/hide quality scores
- Default behavior: auto-filter low-quality sources

---

## Maintenance Plan

### Weekly Tasks
- Monitor API error rates and latency
- Review quality score distribution
- Check for new "Anonymous" sources
- Update domain priority list if needed

### Monthly Tasks
- Review and update high prestige venue list
- Audit metadata accuracy (sample 50 sources)
- Optimize API caching strategy
- User satisfaction survey

### Quarterly Tasks
- Major update to quality scoring algorithm
- Add support for new academic databases
- Comprehensive performance review
- Cost-benefit analysis of metadata enrichment

---

## Appendix A: API Documentation Links

- **CrossRef API:** https://api.crossref.org/swagger-ui/index.html
- **OpenAlex API:** https://docs.openalex.org/
- **Semantic Scholar API:** https://api.semanticscholar.org/api-docs/
- **Unpaywall API:** https://unpaywall.org/products/api

---

## Appendix B: Example Enriched Source

**Before Enrichment:**
```json
{
  "id": "abc123",
  "title": "Machine Learning Ethics",
  "url": "https://example.com/paper",
  "author": null,
  "excerpt": "This paper discusses...",
  "doi": null,
  "publicationType": "web"
}
```

**After Enrichment:**
```json
{
  "id": "abc123",
  "title": "Machine Learning Ethics: A Systematic Review",
  "url": "https://nature.com/articles/s41586-023-12345",
  "author": "John Doe, Jane Smith",
  "authorsStructured": [
    { "first": "John", "last": "Doe" },
    { "first": "Jane", "last": "Smith" }
  ],
  "excerpt": "This paper discusses...",
  "doi": "10.1038/s41586-023-12345",
  "publicationType": "journal",
  "journalName": "Nature Machine Intelligence",
  "volume": "5",
  "issue": "8",
  "pages": "789-802",
  "year": 2023,
  "publisher": "Springer Nature",
  "citationCount": 127,
  "metadata_source": "crossref",
  "metadata_confidence": "high",
  "venue_prestige": "high",
  "domain_prestige": "high",
  "quality_score": 4.8,
  "quality_grade": "A",
  "open_access_url": "https://nature.com/articles/s41586-023-12345.pdf"
}
```

---

## Appendix C: Citation Quality Comparison

### Before (Current System)
```
References:
- Anonymous. Machine Learning Ethics. https://example.com/blog
- John D. (2023). AI Safety. https://medium.com/@johnd/ai-safety
- Research Paper. (n.d.). Retrieved from https://arxiv.org/abs/2301.12345
```

### After (With Improvements)
```
References:
- Doe, J., & Smith, J. (2023). Machine Learning Ethics: A Systematic Review.
  Nature Machine Intelligence, 5(8), 789-802. https://doi.org/10.1038/s41586-023-12345

- Brown, A. R., Chen, L., & Patel, K. (2023). Ethical AI Frameworks in Healthcare.
  Journal of Medical Ethics, 49(3), 156-168. https://doi.org/10.1136/medethics-2022-108234

- Wilson, M. K., et al. (2024). Safety Considerations in Large Language Models.
  Proceedings of NeurIPS 2024, 12(4), 2345-2367. https://arxiv.org/abs/2401.12345
```

---

**Document Status:** Ready for Implementation
**Next Steps:** Begin Phase 1 (Metadata API Integration)
**Owner:** Engineering Team
**Reviewers:** Product, QA, Academic Advisory Board
