// Research Cache Service
// Provides caching for paper metadata and API responses with TTL support

import { PartialDeepResearchPaper } from "@/lib/types/deepResearch";
import { EnrichmentResult } from "./metadataEnrichmentService";

// =============================================================================
// Cache Configuration
// =============================================================================

export const CACHE_TTL = {
  PAPER_METADATA: 7 * 24 * 60 * 60 * 1000, // 7 days
  API_RESPONSE: 24 * 60 * 60 * 1000, // 24 hours
  QUERY_RESULT: 60 * 60 * 1000, // 1 hour
  ENRICHMENT: 24 * 60 * 60 * 1000, // 24 hours
} as const;

export const CACHE_LIMITS = {
  MAX_PAPERS: 10000,
  MAX_ENRICHMENTS: 5000,
  MAX_QUERIES: 500,
} as const;

// =============================================================================
// Cache Entry Types
// =============================================================================

interface CacheEntry<T> {
  data: T;
  createdAt: number;
  expiresAt: number;
  hits: number;
  lastAccessedAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  evictions: number;
  hitRate: number;
}

// =============================================================================
// LRU Cache Implementation
// =============================================================================

class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private defaultTTL: number;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    evictions: 0,
    hitRate: 0,
  };

  constructor(maxSize: number, defaultTTL: number) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get item from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.size = this.cache.size;
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access stats
    entry.hits++;
    entry.lastAccessedAt = Date.now();
    this.stats.hits++;
    this.updateHitRate();

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  /**
   * Set item in cache
   */
  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      createdAt: now,
      expiresAt,
      hits: 0,
      lastAccessedAt: now,
    });

    this.stats.size = this.cache.size;
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.size = this.cache.size;
      return false;
    }
    return true;
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    this.stats.size = this.cache.size;
    return result;
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      evictions: 0,
      hitRate: 0,
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get all valid keys
   */
  keys(): string[] {
    const now = Date.now();
    const validKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now <= entry.expiresAt) {
        validKeys.push(key);
      }
    }

    return validKeys;
  }

  /**
   * Prune expired entries
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        pruned++;
      }
    }

    this.stats.size = this.cache.size;
    return pruned;
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    // First key in Map is oldest (least recently used)
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
      this.stats.evictions++;
      this.stats.size = this.cache.size;
    }
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

// =============================================================================
// Research Cache Service
// =============================================================================

class ResearchCacheService {
  private paperCache: LRUCache<PartialDeepResearchPaper>;
  private enrichmentCache: LRUCache<EnrichmentResult>;
  private queryCache: LRUCache<PartialDeepResearchPaper[]>;

  constructor() {
    this.paperCache = new LRUCache<PartialDeepResearchPaper>(
      CACHE_LIMITS.MAX_PAPERS,
      CACHE_TTL.PAPER_METADATA
    );
    this.enrichmentCache = new LRUCache<EnrichmentResult>(
      CACHE_LIMITS.MAX_ENRICHMENTS,
      CACHE_TTL.ENRICHMENT
    );
    this.queryCache = new LRUCache<PartialDeepResearchPaper[]>(
      CACHE_LIMITS.MAX_QUERIES,
      CACHE_TTL.QUERY_RESULT
    );
  }

  // ===========================================================================
  // Paper Cache Methods
  // ===========================================================================

  /**
   * Generate cache key for paper
   */
  private getPaperKey(identifier: {
    doi?: string;
    arxivId?: string;
    url?: string;
    title?: string;
  }): string | null {
    // Prefer DOI as primary key
    if (identifier.doi) {
      return `doi:${identifier.doi.toLowerCase()}`;
    }
    // Then arXiv ID
    if (identifier.arxivId) {
      return `arxiv:${identifier.arxivId.toLowerCase()}`;
    }
    // Then URL
    if (identifier.url) {
      const normalizedUrl = identifier.url
        .toLowerCase()
        .replace(/https?:\/\//, "")
        .replace(/\/$/, "");
      return `url:${normalizedUrl}`;
    }
    // Finally title (normalized)
    if (identifier.title) {
      const normalizedTitle = identifier.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .substring(0, 100);
      return `title:${normalizedTitle}`;
    }
    return null;
  }

  /**
   * Get paper from cache
   */
  getPaper(identifier: {
    doi?: string;
    arxivId?: string;
    url?: string;
    title?: string;
  }): PartialDeepResearchPaper | null {
    const key = this.getPaperKey(identifier);
    if (!key) return null;
    return this.paperCache.get(key);
  }

  /**
   * Set paper in cache
   */
  setPaper(paper: PartialDeepResearchPaper): void {
    // Cache by all available identifiers
    const keys: string[] = [];

    if (paper.doi) {
      keys.push(`doi:${paper.doi.toLowerCase()}`);
    }
    if (paper.arxivId) {
      keys.push(`arxiv:${paper.arxivId.toLowerCase()}`);
    }
    if (paper.url) {
      const normalizedUrl = paper.url
        .toLowerCase()
        .replace(/https?:\/\//, "")
        .replace(/\/$/, "");
      keys.push(`url:${normalizedUrl}`);
    }
    if (paper.title) {
      const normalizedTitle = paper.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .substring(0, 100);
      keys.push(`title:${normalizedTitle}`);
    }

    // Set for all keys
    for (const key of keys) {
      this.paperCache.set(key, paper);
    }
  }

  /**
   * Check if paper exists in cache
   */
  hasPaper(identifier: {
    doi?: string;
    arxivId?: string;
    url?: string;
    title?: string;
  }): boolean {
    const key = this.getPaperKey(identifier);
    if (!key) return false;
    return this.paperCache.has(key);
  }

  /**
   * Get multiple papers from cache
   */
  getPapers(
    identifiers: Array<{
      doi?: string;
      arxivId?: string;
      url?: string;
      title?: string;
    }>
  ): { cached: PartialDeepResearchPaper[]; missing: typeof identifiers } {
    const cached: PartialDeepResearchPaper[] = [];
    const missing: typeof identifiers = [];

    for (const identifier of identifiers) {
      const paper = this.getPaper(identifier);
      if (paper) {
        cached.push(paper);
      } else {
        missing.push(identifier);
      }
    }

    return { cached, missing };
  }

  /**
   * Set multiple papers in cache
   */
  setPapers(papers: PartialDeepResearchPaper[]): void {
    for (const paper of papers) {
      this.setPaper(paper);
    }
  }

  // ===========================================================================
  // Enrichment Cache Methods
  // ===========================================================================

  /**
   * Get enrichment result from cache
   */
  getEnrichment(identifier: string): EnrichmentResult | null {
    const key = `enrichment:${identifier.toLowerCase()}`;
    return this.enrichmentCache.get(key);
  }

  /**
   * Set enrichment result in cache
   */
  setEnrichment(identifier: string, result: EnrichmentResult): void {
    const key = `enrichment:${identifier.toLowerCase()}`;
    this.enrichmentCache.set(key, result);
  }

  /**
   * Check if enrichment exists in cache
   */
  hasEnrichment(identifier: string): boolean {
    const key = `enrichment:${identifier.toLowerCase()}`;
    return this.enrichmentCache.has(key);
  }

  // ===========================================================================
  // Query Cache Methods
  // ===========================================================================

  /**
   * Generate cache key for query
   */
  private getQueryKey(query: string, options?: Record<string, unknown>): string {
    const normalizedQuery = query.toLowerCase().trim();
    const optionsStr = options ? JSON.stringify(options) : "";
    return `query:${normalizedQuery}:${optionsStr}`;
  }

  /**
   * Get query results from cache
   */
  getQueryResults(
    query: string,
    options?: Record<string, unknown>
  ): PartialDeepResearchPaper[] | null {
    const key = this.getQueryKey(query, options);
    return this.queryCache.get(key);
  }

  /**
   * Set query results in cache
   */
  setQueryResults(
    query: string,
    results: PartialDeepResearchPaper[],
    options?: Record<string, unknown>
  ): void {
    const key = this.getQueryKey(query, options);
    this.queryCache.set(key, results);
  }

  /**
   * Check if query results exist in cache
   */
  hasQueryResults(query: string, options?: Record<string, unknown>): boolean {
    const key = this.getQueryKey(query, options);
    return this.queryCache.has(key);
  }

  // ===========================================================================
  // Cache Management Methods
  // ===========================================================================

  /**
   * Get combined statistics for all caches
   */
  getStats(): {
    papers: CacheStats;
    enrichments: CacheStats;
    queries: CacheStats;
    combined: {
      totalSize: number;
      totalHits: number;
      totalMisses: number;
      overallHitRate: number;
    };
  } {
    const papers = this.paperCache.getStats();
    const enrichments = this.enrichmentCache.getStats();
    const queries = this.queryCache.getStats();

    const totalHits = papers.hits + enrichments.hits + queries.hits;
    const totalMisses = papers.misses + enrichments.misses + queries.misses;
    const total = totalHits + totalMisses;

    return {
      papers,
      enrichments,
      queries,
      combined: {
        totalSize: papers.size + enrichments.size + queries.size,
        totalHits,
        totalMisses,
        overallHitRate: total > 0 ? totalHits / total : 0,
      },
    };
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.paperCache.clear();
    this.enrichmentCache.clear();
    this.queryCache.clear();
  }

  /**
   * Clear specific cache
   */
  clear(type: "papers" | "enrichments" | "queries"): void {
    switch (type) {
      case "papers":
        this.paperCache.clear();
        break;
      case "enrichments":
        this.enrichmentCache.clear();
        break;
      case "queries":
        this.queryCache.clear();
        break;
    }
  }

  /**
   * Prune expired entries from all caches
   */
  pruneAll(): { papers: number; enrichments: number; queries: number } {
    return {
      papers: this.paperCache.prune(),
      enrichments: this.enrichmentCache.prune(),
      queries: this.queryCache.prune(),
    };
  }

  /**
   * Warm cache with papers (useful for pre-loading known papers)
   */
  warmCache(papers: PartialDeepResearchPaper[]): void {
    console.log(`[Cache] Warming cache with ${papers.length} papers`);
    this.setPapers(papers);
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const researchCache = new ResearchCacheService();

// =============================================================================
// Cache-Aware Wrapper Functions
// =============================================================================

/**
 * Get paper with cache check
 * Returns cached paper if available, otherwise calls fetcher and caches result
 */
export async function getCachedPaper<T extends PartialDeepResearchPaper>(
  identifier: { doi?: string; arxivId?: string; url?: string; title?: string },
  fetcher: () => Promise<T | null>
): Promise<T | null> {
  // Check cache first
  const cached = researchCache.getPaper(identifier);
  if (cached) {
    console.log(`[Cache] Paper cache hit for ${JSON.stringify(identifier)}`);
    return cached as T;
  }

  // Fetch from source
  console.log(`[Cache] Paper cache miss for ${JSON.stringify(identifier)}`);
  const paper = await fetcher();

  // Cache result if found
  if (paper) {
    researchCache.setPaper(paper);
  }

  return paper;
}

/**
 * Get enrichment with cache check
 */
export async function getCachedEnrichment(
  identifier: string,
  fetcher: () => Promise<EnrichmentResult | null>
): Promise<EnrichmentResult | null> {
  // Check cache first
  const cached = researchCache.getEnrichment(identifier);
  if (cached) {
    console.log(`[Cache] Enrichment cache hit for ${identifier}`);
    return cached;
  }

  // Fetch from source
  console.log(`[Cache] Enrichment cache miss for ${identifier}`);
  const result = await fetcher();

  // Cache result if found
  if (result) {
    researchCache.setEnrichment(identifier, result);
  }

  return result;
}

/**
 * Get query results with cache check
 */
export async function getCachedQueryResults<T extends PartialDeepResearchPaper>(
  query: string,
  options: Record<string, unknown> | undefined,
  fetcher: () => Promise<T[]>
): Promise<T[]> {
  // Check cache first
  const cached = researchCache.getQueryResults(query, options);
  if (cached) {
    console.log(`[Cache] Query cache hit for "${query}"`);
    return cached as T[];
  }

  // Fetch from source
  console.log(`[Cache] Query cache miss for "${query}"`);
  const results = await fetcher();

  // Cache results
  researchCache.setQueryResults(query, results, options);

  return results;
}

// =============================================================================
// Export Types
// =============================================================================

export type { CacheStats, CacheEntry };
