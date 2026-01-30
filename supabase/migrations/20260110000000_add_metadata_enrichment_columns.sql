-- Add metadata enrichment columns to research_sources table
-- This migration adds columns for API-based metadata enrichment and quality scoring
-- Part of Phase 1: Metadata API Integration

-- Add metadata enrichment columns
ALTER TABLE research_sources
  -- Citation metrics
  ADD COLUMN IF NOT EXISTS citation_count INTEGER,
  
  -- Metadata source tracking
  ADD COLUMN IF NOT EXISTS metadata_source TEXT CHECK(metadata_source IN ('crossref', 'openalex', 'semanticscholar', 'scraping')),
  ADD COLUMN IF NOT EXISTS metadata_confidence TEXT CHECK(metadata_confidence IN ('high', 'medium', 'low')),
  
  -- Venue and domain prestige
  ADD COLUMN IF NOT EXISTS venue_prestige TEXT CHECK(venue_prestige IN ('high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS domain_prestige TEXT CHECK(domain_prestige IN ('high', 'medium', 'low')),
  
  -- Open access information
  ADD COLUMN IF NOT EXISTS open_access_url TEXT,
  
  -- Quality scoring (for Phase 3)
  ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) CHECK(quality_score >= 0 AND quality_score <= 5),
  ADD COLUMN IF NOT EXISTS quality_grade TEXT CHECK(quality_grade IN ('A', 'B', 'C', 'D', 'F'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_research_sources_metadata_confidence 
  ON research_sources(metadata_confidence);

CREATE INDEX IF NOT EXISTS idx_research_sources_publication_type 
  ON research_sources(publication_type);

CREATE INDEX IF NOT EXISTS idx_research_sources_venue_prestige 
  ON research_sources(venue_prestige);

CREATE INDEX IF NOT EXISTS idx_research_sources_domain_prestige 
  ON research_sources(domain_prestige);

CREATE INDEX IF NOT EXISTS idx_research_sources_quality_score 
  ON research_sources(quality_score DESC);

-- Add column comments for documentation
COMMENT ON COLUMN research_sources.citation_count IS 'Number of citations from Semantic Scholar or OpenAlex';
COMMENT ON COLUMN research_sources.metadata_source IS 'Source of metadata: crossref, openalex, semanticscholar, or scraping';
COMMENT ON COLUMN research_sources.metadata_confidence IS 'Confidence level of metadata: high, medium, or low';
COMMENT ON COLUMN research_sources.venue_prestige IS 'Prestige level of publication venue: high, medium, or low';
COMMENT ON COLUMN research_sources.domain_prestige IS 'Prestige level of source domain: high, medium, or low';
COMMENT ON COLUMN research_sources.open_access_url IS 'Open access URL from Unpaywall API';
COMMENT ON COLUMN research_sources.quality_score IS 'Quality score (0-5) based on peer review status, DOI, recency, venue prestige, and relevance';
COMMENT ON COLUMN research_sources.quality_grade IS 'Quality grade (A/B/C/D/F) based on quality_score';
