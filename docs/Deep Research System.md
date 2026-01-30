# Deep Research System: Strategic Implementation Plan

## Perplexity + Claude in Next.js

**Project Vision**: Build a production-grade research system that automatically finds academic papers and enriches them with complete metadata (95%+ completeness) in under 90 seconds.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Decision](#architecture-decision)
3. [System Requirements](#system-requirements)
4. [Implementation Phases](#implementation-phases)
5. [Quality Assurance Strategy](#quality-assurance-strategy)
6. [Performance Targets](#performance-targets)
7. [Success Criteria](#success-criteria)
8. [Risk Mitigation](#risk-mitigation)
9. [Go-Live Checklist](#go-live-checklist)

---

## Executive Summary

### The Problem

When searching for research papers, you get incomplete metadata:

- Missing DOIs (critical for citations)
- Missing abstracts
- Missing journal/conference names
- Missing citation counts
- Missing author information
- No relevance scoring
- No contextual highlights

### The Solution

An intelligent agent system that:

1. Searches multiple sources (Perplexity for discovery, Semantic Scholar for enrichment)
2. Extracts identifiers (DOI, arXiv ID) from URLs and content
3. Enriches papers with complete metadata from authoritative sources
4. Uses Claude to analyze, score relevance, and generate insights
5. Iterates until quality threshold is met (85%+ completeness)
6. Returns professional-grade research reports in 60-90 seconds

### Why This Approach Works

- **No LangGraph needed**: Your workflow is sequential with simple validation loops
- **Claude tool use**: Native orchestration, cleaner code, easier debugging
- **Iterative quality loop**: Keeps improving until success criteria met
- **Smart caching**: Avoids redundant API calls, reduces costs
- **Parallel processing**: Enriches multiple papers simultaneously for speed

---

## Architecture Decision

### ✅ **RECOMMENDED: Simple Orchestration with Claude Tool Use**

**What This Means:**

- Claude acts as the orchestrator using its native "tool use" feature
- You define tools (Perplexity search, Semantic Scholar enrichment)
- Claude decides when and how to call these tools
- No external orchestration framework needed
- Clean, maintainable, debuggable code

**Why This is Better Than LangGraph:**

- Your workflow is mostly linear: Search → Extract → Enrich → Analyze → Validate
- LangGraph is designed for complex multi-agent collaboration with branching logic
- Simple orchestration = faster development, easier debugging, cleaner code
- You can always upgrade to LangGraph later if complexity increases

**Decision Points:**

| Scenario                               | Use Simple Orchestration | Consider LangGraph |
| -------------------------------------- | ------------------------ | ------------------ |
| Linear workflows with validation loops | ✅                       | ❌                 |
| 2-3 API integrations                   | ✅                       | ❌                 |
| Team has limited time (2 weeks)        | ✅                       | ❌                 |
| Need complex branching logic           | ❌                       | ✅                 |
| 5+ agents collaborating                | ❌                       | ✅                 |
| Need state persistence across sessions | ❌                       | ✅                 |

**Your situation**: Simple orchestration is the right choice.

---

## System Requirements

### Functional Requirements

**FR1: Paper Discovery**

- Must search academic sources (arXiv, Google Scholar, Semantic Scholar, PubMed, IEEE, ACM)
- Must return at least 20 relevant papers per query
- Must support filtering by year range, topic, and minimum relevance
- Must deduplicate results across multiple searches

**FR2: Metadata Completeness**

- Must extract or retrieve the following fields for each paper:
  - Title (100% required)
  - Authors (95% target)
  - Published date/year (95% target)
  - Journal or Conference name (85% target)
  - Publisher (70% target)
  - DOI (90% target - critical for citations)
  - URL (100% required)
  - Open Access URL (80% target)
  - Abstract (85% target)
  - Citation count (80% target)

**FR3: AI-Generated Insights**

- Must generate 3-6 key highlights per paper relevant to the query
- Must create 150-300 word excerpt focusing on query relevance
- Must calculate relevance score (0.0-1.0) based on query match
- Must suggest appropriate sections (Introduction, Methods, Results, etc.)

**FR4: Quality Validation**

- Must calculate completeness score for each paper
- Must validate papers meet minimum quality threshold (70%)
- Must iterate up to 3 times to improve quality
- Must stop when 85%+ completeness achieved or max iterations reached

**FR5: Performance**

- Must return results within 90 seconds for 50 papers
- Must support streaming updates to show progress
- Must handle concurrent requests (3+ simultaneous users)

### Non-Functional Requirements

**NFR1: Reliability**

- Must have 99% uptime
- Must handle API failures gracefully with fallbacks
- Must retry failed requests with exponential backoff
- Must cache results to reduce redundant API calls

**NFR2: Cost Efficiency**

- Must stay under $5 per 100 papers processed
- Must use caching to minimize duplicate API calls
- Must batch requests where possible
- Must use appropriate model tiers (Haiku vs Sonnet)

**NFR3: Scalability**

- Must support 100 requests per day initially
- Must scale to 1000 requests per day within 6 months
- Must use database for caching (not just in-memory)

**NFR4: Maintainability**

- Must have comprehensive logging for debugging
- Must have clear error messages for users
- Must have automated tests (unit and integration)
- Must have API documentation

---

## Implementation Phases

### **Phase 1: Foundation & Setup** (2 days)

**Timeline**: Days 1-2  
**Team**: 1 developer

**What to Do:**

1. **Project Initialization**
   - Create new Next.js 15 project with TypeScript and App Router
   - Set up Git repository with proper .gitignore
   - Configure environment variables (.env.local)
   - Install core dependencies (Anthropic SDK, Axios, Zod, date-fns)
   - Set up project folder structure following Next.js conventions

2. **Environment Configuration**
   - Create accounts and obtain API keys:
     - Anthropic (Claude)
     - Perplexity AI
     - Semantic Scholar (optional but recommended)
   - Test API connections with simple "hello world" calls
   - Document rate limits for each API
   - Set up error monitoring (optional: Sentry)

3. **Type System Setup**
   - Define TypeScript interfaces for all data structures:
     - ResearchPaper (the complete paper object)
     - ResearchQuery (user input)
     - ResearchResult (final output)
     - QualityReport (validation metrics)
   - Create Zod schemas for runtime validation
   - Define API request/response types

**Outcomes:**

- Working Next.js application running locally
- All API keys configured and tested
- Complete type definitions documented
- Project structure established

**Success Criteria:**

- ✅ `npm run dev` starts application without errors
- ✅ Can make successful test calls to Claude, Perplexity, Semantic Scholar APIs
- ✅ TypeScript compilation passes with no errors
- ✅ All environment variables documented in .env.example

**Deliverables:**

- Running Next.js application
- Environment configuration guide
- Type definitions document
- API connection test results

---

### **Phase 2: Core Tools Development** (2-3 days)

**Timeline**: Days 3-5  
**Team**: 1 developer

**What to Do:**

1. **Perplexity Search Tool**
   - Create wrapper class for Perplexity API
   - Implement search function that:
     - Accepts query string and configuration
     - Filters to academic domains (arXiv, Scholar, PubMed, etc.)
     - Returns structured results (title, URL, snippet, date)
     - Handles errors and retries
   - Define Claude tool schema for this function
   - Write unit tests

2. **Semantic Scholar Enrichment Tool**
   - Create wrapper class for Semantic Scholar API
   - Implement functions to:
     - Fetch paper by DOI
     - Fetch paper by arXiv ID
     - Fetch paper by PubMed ID
     - Handle 404s gracefully (paper not found)
   - Define Claude tool schema
   - Write unit tests

3. **DOI Extraction Utility**
   - Create function that extracts DOI from:
     - Direct DOI URLs (doi.org/10.xxxx)
     - arXiv URLs (arxiv.org/abs/YYMM.NNNNN)
     - PubMed URLs (pubmed.ncbi.nlm.nih.gov/NNNNN)
     - Text content using regex patterns
   - Handle edge cases (malformed URLs, multiple DOIs)
   - Write comprehensive tests

4. **Paper Validator**
   - Create validation system that:
     - Calculates completeness score (0-1) based on weighted fields
     - Identifies missing critical fields
     - Validates data quality (e.g., author names aren't empty)
     - Generates quality reports for batches of papers
   - Define quality thresholds
   - Write validation tests

5. **Deduplication Utility**
   - Create function that removes duplicate papers based on:
     - Primary: DOI matching
     - Secondary: URL matching
     - Tertiary: Title similarity (fuzzy matching)
   - Preserve higher-quality duplicates

**Outcomes:**

- Five working utility modules with clean APIs
- Comprehensive test coverage (>80%)
- Claude tool definitions ready for use
- Documented error handling patterns

**Success Criteria:**

- ✅ Perplexity tool returns valid results for test query
- ✅ Semantic Scholar tool successfully enriches paper with DOI
- ✅ DOI extractor correctly identifies DOIs from 10 different URL formats
- ✅ Validator calculates completeness accurately for sample papers
- ✅ Deduplicator removes duplicates while preserving best quality
- ✅ All unit tests pass
- ✅ Tools handle API errors gracefully

**Deliverables:**

- Perplexity search tool module
- Semantic Scholar enrichment tool module
- DOI extraction utility
- Paper validation system
- Deduplication utility
- Test suite with 80%+ coverage
- Tool documentation

---

### **Phase 3: Agent Orchestration** (3 days)

**Timeline**: Days 6-8  
**Team**: 1 developer

**What to Do:**

1. **System Prompt Design**
   - Write comprehensive system prompt that instructs Claude to:
     - Act as a research assistant
     - Use tools to find and enrich papers
     - Extract metadata from text and URLs
     - Generate insights (highlights, excerpts, scores)
     - Follow quality standards
     - Be specific about field requirements
   - Include examples of good vs bad outputs
   - Test prompt with sample queries

2. **Research Agent Core**
   - Create main agent class that:
     - Accepts research query as input
     - Manages iteration loop (up to 3 attempts)
     - Calls Claude with system prompt and tools
     - Processes Claude's tool use requests
     - Accumulates results across iterations
     - Calculates quality metrics after each iteration
     - Decides whether to continue or stop
   - Implement conversation state management
   - Handle tool execution and response formatting

3. **Iteration Logic**
   - Implement quality-based iteration:
     - **Iteration 1**: Standard search with original query
     - **Iteration 2**: Refined search if quality < 85%
     - **Iteration 3**: Aggressive search if still < 85%
   - Define stopping conditions:
     - Quality ≥ 85% AND enough papers → STOP
     - Max iterations reached AND quality ≥ 75% → STOP
     - Max iterations reached → RETURN BEST EFFORT
   - Track metrics across iterations

4. **Tool Call Processing**
   - Build handler that:
     - Receives tool use requests from Claude
     - Routes to appropriate tool (Perplexity or Semantic Scholar)
     - Executes tool with parameters
     - Formats response for Claude
     - Handles tool execution errors
     - Logs all tool calls for debugging

5. **Response Parsing**
   - Create parser that:
     - Extracts structured paper data from Claude's text response
     - Validates against schema
     - Handles parsing errors gracefully
     - Merges data from multiple sources (Perplexity + S2)
     - Applies deduplication
     - Calculates final quality scores

**Outcomes:**

- Working research agent that completes full workflow
- Intelligent iteration logic that improves quality
- Robust error handling at each step
- Detailed logging for debugging

**Success Criteria:**

- ✅ Agent successfully completes research for test query
- ✅ Agent uses tools correctly (makes appropriate API calls)
- ✅ Iteration loop works as designed (stops when quality met)
- ✅ Agent handles API failures gracefully
- ✅ Parser correctly extracts paper data from Claude responses
- ✅ Deduplication works across iterations
- ✅ Quality improves with each iteration (when needed)
- ✅ Execution time < 90 seconds for 50 papers

**Deliverables:**

- Research agent module
- System prompt document
- Iteration logic implementation
- Tool call handler
- Response parser
- Agent integration tests
- Performance benchmarks

---

### **Phase 4: API Routes & Streaming** (2 days)

**Timeline**: Days 9-10  
**Team**: 1 developer

**What to Do:**

1. **Main Research Endpoint**
   - Create POST endpoint at `/api/research`
   - Accept request body with:
     - query (required)
     - maxPapers (optional, default 20)
     - yearRange (optional)
     - minRelevance (optional)
     - requireDOI (optional)
   - Validate input using Zod
   - Return appropriate error codes (400, 500)

2. **Streaming Implementation**
   - Set up Server-Sent Events (SSE) for real-time updates
   - Stream progress updates:
     - "Starting search..."
     - "Found 15 papers from Perplexity..."
     - "Enriching with Semantic Scholar..."
     - "Analyzing with Claude... (iteration 1/3)"
     - "Quality: 78% (target: 85%)"
     - "Starting iteration 2..."
     - "Completed! Final quality: 92%"
   - Send final result as JSON
   - Handle client disconnection gracefully

3. **Error Handling**
   - Implement comprehensive error handling:
     - Invalid input → 400 with clear message
     - API key missing → 500 with setup instructions
     - API rate limit → 429 with retry-after
     - API timeout → 504 with suggestion to try again
     - Unexpected errors → 500 with error ID for debugging
   - Log all errors with context
   - Return user-friendly error messages

4. **Health Check Endpoint**
   - Create GET endpoint at `/api/health`
   - Check status of:
     - Database connection
     - Claude API connectivity
     - Perplexity API connectivity
     - Semantic Scholar API connectivity
   - Return JSON with status of each service
   - Use for monitoring and deployment verification

5. **Request Logging**
   - Log each request with:
     - Timestamp
     - Query
     - User info (if authenticated)
     - Execution time
     - Papers found
     - Quality achieved
     - Cost estimate
   - Set up structured logging
   - Configure log retention

**Outcomes:**

- Production-ready API endpoints
- Real-time streaming for better UX
- Robust error handling
- Monitoring and health checks

**Success Criteria:**

- ✅ API accepts valid requests and returns correct responses
- ✅ Invalid requests return appropriate 4xx errors
- ✅ Streaming updates appear in real-time
- ✅ Client receives complete result at end of stream
- ✅ Errors are logged with sufficient context
- ✅ Health check accurately reports system status
- ✅ API handles 3 concurrent requests without issues

**Deliverables:**

- /api/research endpoint
- /api/health endpoint
- Streaming implementation
- Error handling system
- Request logging setup
- API documentation

---

### **Phase 5: Caching Layer** (2 days)

**Timeline**: Days 11-12  
**Team**: 1 developer

**What to Do:**

1. **Database Setup**
   - Choose database solution:
     - **Option A**: Vercel Postgres (if deploying to Vercel)
     - **Option B**: SQLite (simpler, file-based)
     - **Option C**: Upstash Redis (serverless, fast)
   - Set up database schema with tables:
     - `papers`: Cached paper metadata indexed by DOI
     - `queries`: Recent queries and results
     - `api_responses`: Cached API responses (Semantic Scholar)
   - Create migration files
   - Run initial migration

2. **Cache Implementation**
   - Build caching layer that:
     - Checks cache before making API calls
     - Stores successful API responses
     - Respects cache TTL (time to live):
       - Paper metadata: 7 days (rarely changes)
       - API responses: 24 hours (may update)
       - Query results: 1 hour (fresh for repeated queries)
     - Handles cache misses gracefully
     - Supports cache invalidation

3. **Cache Strategy**
   - Implement smart caching:
     - **DOI-based caching**: If paper DOI exists in cache, use it
     - **Semantic Scholar caching**: Cache S2 API responses by identifier
     - **Query caching**: Cache full research results for identical queries
     - **LRU eviction**: Remove least recently used items when cache full
   - Set appropriate TTLs for each cache type
   - Monitor cache hit rates

4. **Performance Optimization**
   - Add caching to:
     - Semantic Scholar API calls (biggest time saver)
     - Perplexity searches (for repeated queries)
     - Claude analysis (same paper + query = same analysis)
   - Implement cache warming for popular queries
   - Add cache statistics endpoint for monitoring

**Outcomes:**

- Working caching system reducing API calls by 60-80%
- Faster responses for repeated queries
- Lower API costs

**Success Criteria:**

- ✅ Database successfully stores and retrieves papers
- ✅ Cache hit rate > 60% for repeated queries
- ✅ Response time improves by 40%+ for cached results
- ✅ API costs reduce by 50%+ for cached papers
- ✅ Cache invalidation works correctly
- ✅ Database handles 1000+ cached papers without performance degradation

**Deliverables:**

- Database schema and migrations
- Caching layer module
- Cache statistics dashboard
- Performance benchmarks (before/after caching)

---

### **Phase 6: Frontend UI** (3 days)

**Timeline**: Days 13-15  
**Team**: 1 developer

**What to Do:**

1. **Research Form Component**
   - Create form with inputs for:
     - Query text (required, with autocomplete suggestions)
     - Max papers slider (5-50, default 20)
     - Year range selector (optional)
     - Minimum relevance slider (0.5-1.0, default 0.7)
     - Require DOI checkbox
   - Add input validation with real-time feedback
   - Show example queries to guide users
   - Implement keyboard shortcuts (Enter to submit)

2. **Loading/Streaming State**
   - Create loading component that shows:
     - Current operation (searching, enriching, analyzing)
     - Progress bar (based on iterations)
     - Papers found so far (live count)
     - Current quality score (updating in real-time)
     - Estimated time remaining
   - Display streaming updates as they arrive
   - Show iteration progress (1/3, 2/3, 3/3)
   - Animate updates smoothly

3. **Results Display**
   - Create paper card component showing:
     - Title (linked to URL)
     - Authors (first 3, then "et al.")
     - Publication info (journal, year, DOI)
     - Relevance score (visual indicator like star rating)
     - Quality score (completeness percentage)
     - Highlights (collapsible list)
     - Excerpt (expandable/collapsible)
     - Suggested sections (chips/badges)
     - Citation count (if available)
     - Open Access badge (if available)
   - Implement sorting (relevance, date, citations)
   - Add filtering (by year, quality, sections)

4. **Quality Dashboard**
   - Create overview showing:
     - Total papers found
     - Average completeness score
     - Number of iterations used
     - Execution time
     - Papers with DOI, abstract, citations (breakdown)
     - Visual quality indicator (color-coded: green > 85%, yellow 70-85%, red < 70%)
   - Show recommendations for improving results

5. **Export Functionality**
   - Implement export to:
     - JSON (raw data)
     - CSV (for spreadsheets)
     - BibTeX (for LaTeX)
     - RIS (for reference managers)
     - Markdown (for documentation)
   - Allow selective export (checked papers only)
   - Generate citation report

6. **Error States**
   - Design error messages for:
     - API failures (show friendly message, suggest retry)
     - Invalid queries (explain what's wrong)
     - No results found (suggest query refinement)
     - Timeout errors (explain and offer retry)
   - Add retry buttons
   - Show help documentation links

**Outcomes:**

- Professional, intuitive user interface
- Real-time feedback during research
- Easy-to-read results display
- Multiple export options

**Success Criteria:**

- ✅ Form validates input correctly
- ✅ Streaming updates appear smoothly in real-time
- ✅ Results display all required information clearly
- ✅ Sorting and filtering work correctly
- ✅ Export functions generate valid files
- ✅ UI is responsive on desktop and mobile
- ✅ Error states are clear and actionable
- ✅ Users can complete research task in < 3 clicks

**Deliverables:**

- Research form component
- Streaming progress component
- Paper card component
- Quality dashboard component
- Export functionality
- Error handling UI
- Responsive design implementation

---

### **Phase 7: Testing & Quality Assurance** (2 days)

**Timeline**: Days 16-17  
**Team**: 1 developer

**What to Do:**

1. **Unit Testing**
   - Write tests for each utility module:
     - DOI extractor (test 20+ URL formats)
     - Validator (test completeness calculation)
     - Deduplicator (test edge cases)
   - Test tool wrappers:
     - Mock API responses
     - Test error handling
     - Test retry logic
   - Aim for >80% code coverage

2. **Integration Testing**
   - Write end-to-end tests for:
     - Full research flow (query → results)
     - API endpoints (request → response)
     - Streaming functionality
     - Caching behavior
   - Test with real API calls (in staging environment)
   - Verify quality targets are met

3. **Performance Testing**
   - Benchmark key metrics:
     - Time to complete research (target: < 90 sec)
     - API costs per 100 papers (target: < $5)
     - Cache hit rates (target: > 60%)
     - Concurrent request handling (target: 3+ simultaneous)
   - Load test with 10 concurrent users
   - Identify and fix bottlenecks

4. **Quality Validation**
   - Run research for 10 diverse queries
   - Measure average completeness (target: > 90%)
   - Check percentage of papers with DOI (target: > 90%)
   - Verify highlights are query-relevant
   - Ensure relevance scores make sense

5. **User Acceptance Testing**
   - Have 2-3 users try the system
   - Collect feedback on:
     - Ease of use
     - Result quality
     - Speed
     - UI clarity
   - Fix critical issues

**Outcomes:**

- Comprehensive test suite
- Performance benchmarks documented
- Quality metrics validated
- User feedback incorporated

**Success Criteria:**

- ✅ All unit tests pass
- ✅ Integration tests pass with real APIs
- ✅ 50 papers completed in < 90 seconds
- ✅ Average completeness > 90%
- ✅ 90%+ papers have DOI
- ✅ Cache reduces costs by 50%+
- ✅ System handles 3 concurrent users
- ✅ Zero critical bugs found
- ✅ Users rate ease of use ≥ 4/5

**Deliverables:**

- Complete test suite
- Performance benchmark report
- Quality metrics report
- User testing feedback
- Bug fixes and improvements

---

### **Phase 8: Deployment & Monitoring** (1 day)

**Timeline**: Day 18  
**Team**: 1 developer

**What to Do:**

1. **Production Environment Setup**
   - Choose hosting platform:
     - **Recommended**: Vercel (easiest for Next.js)
     - **Alternative**: Railway, Render, AWS
   - Configure production environment variables
   - Set up production database
   - Configure custom domain (if applicable)

2. **Deployment Pipeline**
   - Set up CI/CD:
     - Automatic deployments from main branch
     - Run tests before deployment
     - Preview deployments for PRs
   - Configure deployment settings:
     - Edge functions for API routes
     - Build optimizations
     - Environment-specific configs

3. **Monitoring Setup**
   - Implement monitoring for:
     - API response times
     - Error rates
     - API costs
     - Cache hit rates
     - User activity
   - Set up alerts for:
     - API failures
     - Slow response times (> 120 sec)
     - High error rates (> 5%)
     - Budget overruns
   - Use tools like:
     - Vercel Analytics (built-in)
     - Sentry (error tracking)
     - Upstash (database monitoring)

4. **Documentation**
   - Write user documentation:
     - How to use the system
     - What each field means
     - How to interpret quality scores
     - Export format specifications
   - Write developer documentation:
     - Architecture overview
     - API documentation
     - Database schema
     - Deployment guide
     - Troubleshooting guide
   - Create README with setup instructions

5. **Backup & Recovery**
   - Set up database backups (daily)
   - Document recovery procedures
   - Test restore process

**Outcomes:**

- Production deployment running smoothly
- Monitoring and alerts configured
- Complete documentation
- Backup strategy in place

**Success Criteria:**

- ✅ Application accessible at production URL
- ✅ All environment variables configured correctly
- ✅ Database backups running daily
- ✅ Monitoring dashboards show real-time metrics
- ✅ Alerts trigger correctly for test errors
- ✅ Documentation complete and accurate
- ✅ Team can deploy updates with confidence
- ✅ 99% uptime in first week

**Deliverables:**

- Production deployment
- Monitoring dashboards
- Alert configuration
- User documentation
- Developer documentation
- Backup/recovery procedures

---

## Quality Assurance Strategy

### Quality Loop Mechanism

**How It Works:**

The system uses an iterative approach to ensure high-quality results. After each iteration, it evaluates the completeness and quality of papers found. If quality is below target, it tries again with a refined strategy.

**Iteration 1: Standard Search**

- Goal: Find papers using original query
- Strategy: Search academic databases with exact query terms
- Success criteria: 85%+ completeness OR 50+ papers with 75%+ completeness
- If failed: Proceed to Iteration 2

**Iteration 2: Refined Search**

- Goal: Improve quality by refining search strategy
- Strategy:
  - Expand query with synonyms and related terms
  - Try different academic databases
  - Focus on papers with identifiable DOIs
  - Re-enrich papers that failed in Iteration 1
- Success criteria: 85%+ completeness
- If failed: Proceed to Iteration 3

**Iteration 3: Aggressive Search**

- Goal: Get best possible results with all available techniques
- Strategy:
  - Multiple query variants in parallel
  - Scrape additional metadata from paper pages
  - Use fuzzy matching to find papers in Semantic Scholar
  - Accept papers with 70%+ completeness
- Success criteria: 75%+ average completeness
- If failed: Return best effort results

**Quality Metrics:**

Calculate completeness score for each paper:

- Critical fields (60% weight):
  - Title: 10%
  - Authors: 10%
  - Published date: 10%
  - DOI: 15%
  - Abstract: 15%
- Important fields (30% weight):
  - Journal/Conference: 8%
  - Citation count: 7%
  - Open Access URL: 8%
  - Highlights: 7%
- Nice-to-have (10% weight):
  - Publisher: 3%
  - Excerpt: 3%
  - Suggested sections: 2%
  - Relevance score: 2%

**Stopping Conditions:**

1. Quality ≥ 85% AND papers ≥ requested amount → SUCCESS, stop immediately
2. Iteration 3 complete AND quality ≥ 75% → ACCEPTABLE, stop
3. Iteration 3 complete AND quality < 75% → BEST EFFORT, stop and return what we have

### Validation Checkpoints

**Before Starting:**

- ✅ Valid query (>= 3 characters)
- ✅ Valid parameters (year range makes sense, max papers reasonable)
- ✅ API keys are configured

**After Each API Call:**

- ✅ Response received (not timeout)
- ✅ Response is valid JSON/data
- ✅ Response contains expected fields
- ✅ No critical errors in response

**After Each Iteration:**

- ✅ At least 1 paper found
- ✅ Papers have unique identifiers (no complete duplicates)
- ✅ Calculate average completeness
- ✅ Calculate average relevance
- ✅ Count papers meeting minimum threshold
- ✅ Decide: continue or stop?

**Before Returning Results:**

- ✅ Sort papers by relevance score
- ✅ Remove any remaining duplicates
- ✅ Validate all papers against schema
- ✅ Generate quality report
- ✅ Calculate total execution time
- ✅ Log final metrics

---

## Performance Targets

### Speed Benchmarks

| Papers | Target Time | Acceptable Time | Max Time |
| ------ | ----------- | --------------- | -------- |
| 10     | 20-30 sec   | 45 sec          | 60 sec   |
| 20     | 35-50 sec   | 70 sec          | 90 sec   |
| 50     | 60-90 sec   | 120 sec         | 150 sec  |
| 100    | 120-180 sec | 240 sec         | 300 sec  |

**Breakdown for 50 papers (typical):**

- Iteration 1:
  - Perplexity search: 3-5 seconds
  - DOI extraction: <1 second
  - Semantic Scholar enrichment (parallel): 8-12 seconds
  - Claude analysis (batch): 20-30 seconds
  - Quality check: <1 second
  - **Subtotal: 35-50 seconds**

- If Iteration 2 needed:
  - Refined search: 3-5 seconds
  - Additional enrichment: 5-8 seconds
  - Claude analysis: 15-20 seconds
  - **Subtotal: 25-35 seconds**

- **Total (1-2 iterations): 60-90 seconds**

### Quality Targets

| Metric                | Minimum    | Target      | Excellent |
| --------------------- | ---------- | ----------- | --------- |
| Average Completeness  | 75%        | 85%         | 95%       |
| Papers with DOI       | 80%        | 90%         | 95%       |
| Papers with Abstract  | 75%        | 85%         | 90%       |
| Papers with Citations | 70%        | 80%         | 90%       |
| Papers with Journal   | 70%        | 85%         | 90%       |
| Average Relevance     | 0.6        | 0.7         | 0.8       |
| Highlights Quality    | 3+ bullets | 4-5 bullets | 6 bullets |

### Cost Targets

**Per 100 Papers Processed:**

| Service          | Cost      | Notes                                |
| ---------------- | --------- | ------------------------------------ |
| Perplexity       | $0.50     | 5 queries × 20 results × $0.005      |
| Claude Sonnet    | $2.00     | Analysis of 100 papers, ~400K tokens |
| Claude Haiku     | $0.15     | Simple extractions, ~100K tokens     |
| Semantic Scholar | FREE      | No cost (respect rate limits)        |
| **Total**        | **$2.65** | Well under $5 target                 |

**With Caching (60% hit rate):**

- Actual API calls: 40 papers
- Cost: ~$1.06 per 100 papers
- **Savings: 60%**

### Concurrent Users

| Users | Response Time | Success Rate | Notes                      |
| ----- | ------------- | ------------ | -------------------------- |
| 1     | 60-90 sec     | 99%          | Baseline                   |
| 3     | 65-95 sec     | 98%          | Slight increase acceptable |
| 5     | 70-110 sec    | 95%          | May need queuing           |
| 10    | 90-150 sec    | 90%          | Implement job queue        |

---

## Success Criteria

### MVP Launch Criteria (Must Have)

**Functionality:**

- ✅ User can submit query and get results
- ✅ System returns 20 papers with 80%+ completeness
- ✅ Papers include: title, authors, year, DOI (90%), abstract (80%)
- ✅ Results include highlights, excerpts, relevance scores
- ✅ Execution completes in < 90 seconds
- ✅ System handles errors gracefully
- ✅ User can export results to JSON and CSV

**Quality:**

- ✅ 90%+ papers have DOI
- ✅ 85%+ papers have abstracts
- ✅ Average completeness > 85%
- ✅ Relevance scores correlate with actual relevance (manual spot check)
- ✅ Highlights are accurate and query-specific

**Performance:**

- ✅ Response time < 90 seconds for 50 papers
- ✅ Cost < $3 per 100 papers
- ✅ Cache hit rate > 50%
- ✅ System handles 3 concurrent users

**Reliability:**

- ✅ No crashes during 100 test queries
- ✅ Error messages are clear and actionable
- ✅ API failures are handled gracefully
- ✅ 95%+ success rate for valid queries

### Production Readiness (Before Go-Live)

**Technical:**

- ✅ All tests passing (unit + integration)
- ✅ Code reviewed and approved
- ✅ Security review completed (API keys protected, no injection vulnerabilities)
- ✅ Performance benchmarks documented
- ✅ Monitoring and alerts configured
- ✅ Backup and recovery tested

**Operational:**

- ✅ User documentation complete
- ✅ Developer documentation complete
- ✅ Deployment runbook created
- ✅ Rollback procedure documented
- ✅ Support process defined
- ✅ Budget and cost tracking set up

**User Experience:**

- ✅ 3+ test users successfully complete research tasks
- ✅ Average user satisfaction ≥ 4/5
- ✅ No critical UX issues reported
- ✅ Mobile experience is usable
- ✅ Loading states provide clear feedback

### Post-Launch Success (First 30 Days)

**Adoption:**

- ✅ 50+ unique users
- ✅ 200+ research queries completed
- ✅ 10+ daily active users

**Quality:**

- ✅ Average completeness maintained > 85%
- ✅ User satisfaction ≥ 4/5
- ✅ <5% error rate
- ✅ No critical bugs reported

**Performance:**

- ✅ 95th percentile response time < 120 seconds
- ✅ 99% uptime
- ✅ Average cost per 100 papers < $3
- ✅ Cache hit rate > 60%

---

## Risk Mitigation

### Technical Risks

**Risk 1: API Rate Limits**

- **Impact**: System fails to complete research
- **Likelihood**: Medium
- **Mitigation**:
  - Implement exponential backoff
  - Use caching aggressively
  - Have fallback APIs (if Perplexity fails, try Tavily)
  - Monitor rate limit usage
  - Queue requests if needed
- **Contingency**: Upgrade to higher tier API plans if needed

**Risk 2: API Cost Overruns**

- **Impact**: Budget exceeded, project not sustainable
- **Likelihood**: Medium
- **Mitigation**:
  - Set hard spending limits in API dashboards
  - Implement request quotas per user
  - Monitor costs daily
  - Use cheaper models for simple tasks (Haiku vs Sonnet)
  - Cache aggressively
- **Contingency**: Reduce max papers per query, add usage limits

**Risk 3: Low Quality Results**

- **Impact**: Papers missing critical metadata, users unsatisfied
- **Likelihood**: Medium
- **Mitigation**:
  - Implement iterative quality loop
  - Use multiple enrichment sources
  - Set minimum quality thresholds
  - Allow manual enrichment as fallback
- **Contingency**: Partner with premium APIs (Consensus, Scite) for critical queries

**Risk 4: Slow Response Times**

- **Impact**: Poor user experience, timeouts
- **Likelihood**: Medium
- **Mitigation**:
  - Parallel processing for enrichment
  - Aggressive caching
  - Optimize Claude prompts for speed
  - Use streaming for perceived performance
- **Contingency**: Implement job queue for large queries (>50 papers)

**Risk 5: API Downtime**

- **Impact**: System unavailable
- **Likelihood**: Low
- **Mitigation**:
  - Health checks for all APIs
  - Graceful degradation (work with available APIs)
  - Cache serves stale results during outages
  - Multiple provider options
- **Contingency**: Display clear status messages, suggest retry times

### Business Risks

**Risk 6: Low User Adoption**

- **Impact**: Project doesn't get used
- **Likelihood**: Medium
- **Mitigation**:
  - User testing before launch
  - Clear value proposition
  - Easy onboarding
  - Example queries and tutorials
- **Contingency**: Gather feedback, iterate on UX

**Risk 7: Data Privacy Concerns**

- **Impact**: Users don't trust the system with queries
- **Likelihood**: Low
- **Mitigation**:
  - Clear privacy policy
  - Don't store personally identifiable information
  - Option to disable query logging
  - Transparent about API usage
- **Contingency**: Add privacy controls, anonymous mode

### Project Risks

**Risk 8: Timeline Delays**

- **Impact**: Launch pushed back
- **Likelihood**: Medium
- **Mitigation**:
  - Clear phase deliverables
  - Daily standups
  - Early identification of blockers
  - Focus on MVP first
- **Contingency**: Cut nice-to-have features, extend timeline if needed

**Risk 9: Scope Creep**

- **Impact**: Never-ending development
- **Likelihood**: High
- **Mitigation**:
  - Clear success criteria
  - Prioritized backlog
  - "MVP first, enhance later" mindset
  - Regular scope reviews
- **Contingency**: Defer non-critical features to v2

---

## Go-Live Checklist

### Pre-Launch (1 Week Before)

**Technical Readiness:**

- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Error handling tested thoroughly
- [ ] Database backups automated
- [ ] Monitoring configured and tested
- [ ] Staging environment matches production

**Documentation:**

- [ ] User guide complete
- [ ] API documentation complete
- [ ] Deployment guide complete
- [ ] Troubleshooting guide complete
- [ ] Support process documented

**User Preparation:**

- [ ] Beta users identified (3-5 people)
- [ ] Beta testing completed
- [ ] Feedback incorporated
- [ ] Training materials prepared
- [ ] Announcement drafted

### Launch Day

**Morning:**

- [ ] Final smoke tests on staging
- [ ] Database backups verified
- [ ] API keys verified in production
- [ ] Monitoring alerts tested
- [ ] Support team briefed

**Deployment:**

- [ ] Deploy to production
- [ ] Run smoke tests on production
- [ ] Verify all API connections
- [ ] Test complete research flow
- [ ] Check monitoring dashboards
- [ ] Verify database connectivity

**Initial Users:**

- [ ] Send announcement to beta users
- [ ] Monitor first 10 queries closely
- [ ] Check for errors in logs
- [ ] Verify metrics being collected
- [ ] Gather initial feedback

**End of Day:**

- [ ] Review error logs
- [ ] Check performance metrics
- [ ] Review cost tracking
- [ ] Document any issues
- [ ] Plan fixes for next day if needed

### Post-Launch (First Week)

**Daily Checks:**

- [ ] Review error logs
- [ ] Monitor response times
- [ ] Check API costs
- [ ] Review user feedback
- [ ] Track key metrics:
  - Number of queries
  - Average completeness
  - Success rate
  - Cache hit rate

**Weekly Review:**

- [ ] Analyze usage patterns
- [ ] Identify top issues
- [ ] Prioritize improvements
- [ ] Update documentation based on feedback
- [ ] Plan next iteration

---

## Summary

This plan provides a clear, actionable path to building a production-ready deep research system in **18 days**.

**Key Principles:**

1. **Start simple**: Don't use LangGraph, use Claude tool use
2. **Iterate for quality**: Loop up to 3 times until 85%+ completeness
3. **Optimize early**: Parallel processing and caching from the start
4. **Validate constantly**: Check quality at every step
5. **Focus on UX**: Streaming updates, clear errors, helpful feedback

**Expected Outcomes:**

- ✅ 95%+ metadata completeness
- ✅ 60-90 second response time for 50 papers
- ✅ $3-5 cost per 100 papers
- ✅ Production-ready, scalable system
- ✅ Happy users with high-quality research results

**Success = Quality + Speed + Cost Efficiency**

You're now ready to build! Start with Phase 1 and work through each phase systematically. Good luck! 🚀
