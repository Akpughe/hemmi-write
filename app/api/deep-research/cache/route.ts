// Deep Research Cache API Endpoint
// GET /api/deep-research/cache - Get cache statistics
// DELETE /api/deep-research/cache - Clear cache

import { NextRequest, NextResponse } from "next/server";
import { researchCache } from "@/lib/services/researchCacheService";

// =============================================================================
// GET Handler - Cache Statistics
// =============================================================================

export async function GET() {
  try {
    const stats = researchCache.getStats();

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        summary: {
          totalEntries: stats.combined.totalSize,
          hitRate: `${(stats.combined.overallHitRate * 100).toFixed(1)}%`,
          totalHits: stats.combined.totalHits,
          totalMisses: stats.combined.totalMisses,
        },
        breakdown: {
          papers: {
            size: stats.papers.size,
            hitRate: `${(stats.papers.hitRate * 100).toFixed(1)}%`,
            hits: stats.papers.hits,
            misses: stats.papers.misses,
            evictions: stats.papers.evictions,
          },
          enrichments: {
            size: stats.enrichments.size,
            hitRate: `${(stats.enrichments.hitRate * 100).toFixed(1)}%`,
            hits: stats.enrichments.hits,
            misses: stats.enrichments.misses,
            evictions: stats.enrichments.evictions,
          },
          queries: {
            size: stats.queries.size,
            hitRate: `${(stats.queries.hitRate * 100).toFixed(1)}%`,
            hits: stats.queries.hits,
            misses: stats.queries.misses,
            evictions: stats.queries.evictions,
          },
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get cache statistics",
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE Handler - Clear Cache
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type) {
      // Clear specific cache
      if (!["papers", "enrichments", "queries"].includes(type)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid cache type: ${type}. Valid types: papers, enrichments, queries`,
          },
          { status: 400 }
        );
      }

      researchCache.clear(type as "papers" | "enrichments" | "queries");

      return NextResponse.json({
        success: true,
        message: `Cleared ${type} cache`,
      });
    }

    // Clear all caches
    researchCache.clearAll();

    return NextResponse.json({
      success: true,
      message: "Cleared all caches",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to clear cache",
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST Handler - Prune Expired Entries
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "prune") {
      const pruned = researchCache.pruneAll();

      return NextResponse.json({
        success: true,
        message: "Pruned expired entries",
        pruned: {
          papers: pruned.papers,
          enrichments: pruned.enrichments,
          queries: pruned.queries,
          total: pruned.papers + pruned.enrichments + pruned.queries,
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid action. Use ?action=prune",
      },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to prune cache",
      },
      { status: 500 }
    );
  }
}
