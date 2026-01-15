// Metadata Enrichment Service
// Integrates with CrossRef, OpenAlex, Semantic Scholar, and Unpaywall APIs
// to enrich academic source metadata with authoritative data

import axios from "axios";
import { getVenuePrestige } from "@/lib/utils/academicSourcePriority";

export interface Author {
  first: string;
  last: string;
  middle?: string;
}

export interface EnrichmentResult {
  source: "crossref" | "openalex" | "semanticscholar" | "scraping";
  confidence: "high" | "medium" | "low";

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
  publicationType?: "journal" | "conference" | "preprint" | "book" | "web";
  citationCount?: number;
  venuePrestige?: "high" | "medium" | "low";
  openAccessUrl?: string;
}

export interface ResearchSourceForEnrichment {
  id: string;
  title: string;
  url: string;
  author?: string;
  doi?: string;
  journalName?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  year?: number;
  publisher?: string;
  publicationType?: string;
  authorsStructured?: Author[];
  full_content?: string;
}

export interface EnrichedResearchSource extends ResearchSourceForEnrichment {
  metadata_source?: string;
  metadata_confidence?: string;
  citation_count?: number;
  venue_prestige?: string;
  open_access_url?: string;
}

export class MetadataEnrichmentService {
  private crossrefEmail: string;
  private openalexEmail: string;
  private semanticScholarApiKey?: string;
  private unpaywallEmail: string;

  constructor() {
    // Get API configuration from environment variables
    this.crossrefEmail = process.env.CROSSREF_API_EMAIL || "hello@nuton.app";
    this.openalexEmail = process.env.OPENALEX_API_EMAIL || "hello@nuton.app";
    this.semanticScholarApiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
    this.unpaywallEmail = process.env.UNPAYWALL_EMAIL || "hello@nuton.app";

    // Warn if required API credentials are missing
    if (!this.crossrefEmail) {
      console.warn(
        "[Metadata Enrichment] CROSSREF_API_EMAIL not set - CrossRef enrichment will be skipped"
      );
    }
    if (!this.openalexEmail) {
      console.warn(
        "[Metadata Enrichment] OPENALEX_API_EMAIL not set - OpenAlex enrichment will be skipped"
      );
    }
    if (!this.unpaywallEmail) {
      console.warn(
        "[Metadata Enrichment] UNPAYWALL_EMAIL not set - Open access checking will be skipped"
      );
    }
    if (!this.semanticScholarApiKey) {
      console.info(
        "[Metadata Enrichment] SEMANTIC_SCHOLAR_API_KEY not set - using lower rate limits"
      );
    }
  }

  /**
   * Extract DOI from URL or content
   */
  async extractDoi(url: string, content?: string): Promise<string | null> {
    // 1. Check if URL contains DOI
    const doiUrlPattern = /(?:doi\.org\/|dx\.doi\.org\/)(10\.\d+\/[^\s]+)/i;
    const urlMatch = url.match(doiUrlPattern);
    if (urlMatch) {
      return urlMatch[1];
    }

    // 2. Check if URL path contains DOI pattern
    const urlDoiPattern = /10\.\d+\/[^\s\/]+/i;
    const urlPathMatch = url.match(urlDoiPattern);
    if (urlPathMatch) {
      return urlPathMatch[0];
    }

    // 3. Extract from content if provided
    if (content) {
      // Look for DOI patterns in content
      const doiPatterns = [
        /(?:doi|DOI)[\s:]*10\.\d+\/[^\s\)]+/gi,
        /10\.\d{4,}\/[^\s\)]+/g,
      ];

      for (const pattern of doiPatterns) {
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
          // Extract the DOI part (10.xxxx/xxxx)
          const doiMatch = matches[0].match(/10\.\d+\/[^\s\)]+/i);
          if (doiMatch) {
            return doiMatch[0];
          }
        }
      }
    }

    return null;
  }

  /**
   * Enrich metadata from CrossRef API (DOI-based)
   */
  async enrichFromCrossRef(doi: string): Promise<EnrichmentResult | null> {
    if (!this.crossrefEmail) {
      return null; // Skip if email not configured
    }

    try {
      const cleanDoi = doi.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
      const url = `https://api.crossref.org/works/${encodeURIComponent(
        cleanDoi
      )}`;

      const response = await axios.get(url, {
        headers: {
          "User-Agent": `Hemmi/1.0 (mailto:${this.crossrefEmail})`,
          Accept: "application/json",
        },
        timeout: 3000,
      });

      const work = response.data?.message;
      if (!work) {
        return null;
      }

      // Extract structured authors
      const authorsStructured: Author[] = [];
      if (work.author && Array.isArray(work.author)) {
        for (const author of work.author) {
          if (author.given && author.family) {
            // Extract middle name from given name if present
            // CrossRef stores full given name like "John Michael"
            const givenParts = author.given.trim().split(/\s+/);
            const firstName = givenParts[0] || "";
            const middleName =
              givenParts.length > 1 ? givenParts.slice(1).join(" ") : undefined;

            authorsStructured.push({
              first: firstName,
              last: author.family,
              middle: middleName,
            });
          }
        }
      }

      // Extract publication date
      let year: number | undefined;
      if (work["published-print"]?.["date-parts"]?.[0]?.[0]) {
        year = work["published-print"]["date-parts"][0][0];
      } else if (work["published-online"]?.["date-parts"]?.[0]?.[0]) {
        year = work["published-online"]["date-parts"][0][0];
      }

      // Determine publication type
      let publicationType:
        | "journal"
        | "conference"
        | "preprint"
        | "book"
        | "web" = "web";
      if (work.type === "journal-article") {
        publicationType = "journal";
      } else if (
        work.type === "proceedings-article" ||
        work.type === "conference-paper"
      ) {
        publicationType = "conference";
      } else if (work.type === "book" || work.type === "book-chapter") {
        publicationType = "book";
      } else if (work.type === "posted-content") {
        publicationType = "preprint";
      }

      // Extract pages
      let pages: string | undefined;
      if (work.page) {
        pages = work.page;
      }

      // Format author string
      const authorString =
        authorsStructured.length > 0
          ? authorsStructured.map((a) => `${a.first} ${a.last}`).join(", ")
          : undefined;

      // Determine venue prestige
      const journalName = work["container-title"]?.[0];
      const venuePrestige = journalName ? getVenuePrestige(journalName) : undefined;

      return {
        source: "crossref",
        confidence: "high",
        authorsStructured:
          authorsStructured.length > 0 ? authorsStructured : undefined,
        author: authorString,
        doi: cleanDoi,
        journalName,
        volume: work.volume?.toString() || undefined,
        issue: work.issue?.toString() || undefined,
        pages,
        year,
        publisher: work.publisher || undefined,
        publicationType,
        venuePrestige,
      };
    } catch (error: any) {
      console.error(
        `[Metadata Enrichment] CrossRef API error for DOI ${doi}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Enrich metadata from OpenAlex API (title/author-based)
   */
  async enrichFromOpenAlex(
    title: string,
    author?: string
  ): Promise<EnrichmentResult | null> {
    if (!this.openalexEmail) {
      return null; // Skip if email not configured
    }

    try {
      // Build search filters (OpenAlex uses comma-separated filters)
      const filters: string[] = [];

      // Limit title length and sanitize for OpenAlex search
      const sanitizedTitle = title.substring(0, 100).replace(/['"]/g, "");
      filters.push(`title.search:${sanitizedTitle}`);

      // Add author filter if available and valid
      if (author) {
        const authorParts = author.split(",")[0].trim().split(" ");
        const lastName = authorParts[authorParts.length - 1];
        // Only add author filter if last name is meaningful (> 2 chars)
        if (lastName && lastName.length > 2) {
          filters.push(`author.display_name.search:${lastName}`);
        }
      }

      const url = `https://api.openalex.org/works`;
      const response = await axios.get(url, {
        params: {
          filter: filters.join(","), // OpenAlex uses comma separator
          per_page: 1,
          mailto: this.openalexEmail,
        },
        timeout: 3000,
      });

      const works = response.data?.results;
      if (!works || works.length === 0) {
        return null;
      }

      const work = works[0];

      // Extract structured authors
      const authorsStructured: Author[] = [];
      if (work.authorships && Array.isArray(work.authorships)) {
        for (const authorship of work.authorships) {
          const authorName = authorship.author?.display_name;
          if (authorName) {
            // Parse name (assume "First Last" or "First Middle Last")
            const nameParts = authorName.trim().split(/\s+/);
            if (nameParts.length >= 2) {
              authorsStructured.push({
                first: nameParts[0],
                last: nameParts[nameParts.length - 1],
                middle:
                  nameParts.length > 2
                    ? nameParts.slice(1, -1).join(" ")
                    : undefined,
              });
            }
          }
        }
      }

      // Extract DOI
      let doi: string | undefined;
      if (work.doi) {
        doi = work.doi.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
      }

      // Determine publication type
      let publicationType:
        | "journal"
        | "conference"
        | "preprint"
        | "book"
        | "web" = "web";
      const type = work.type?.toLowerCase();
      if (type === "article" || type?.includes("journal")) {
        publicationType = "journal";
      } else if (
        type?.includes("conference") ||
        type?.includes("proceedings")
      ) {
        publicationType = "conference";
      } else if (type === "book" || type?.includes("chapter")) {
        publicationType = "book";
      } else if (type === "preprint") {
        publicationType = "preprint";
      }

      // Format author string
      const authorString =
        authorsStructured.length > 0
          ? authorsStructured.map((a) => `${a.first} ${a.last}`).join(", ")
          : undefined;

      // Determine venue prestige
      const journalName = work.primary_location?.source?.display_name;
      const venuePrestige = journalName ? getVenuePrestige(journalName) : undefined;

      return {
        source: "openalex",
        confidence: authorsStructured.length > 0 ? "high" : "medium",
        authorsStructured:
          authorsStructured.length > 0 ? authorsStructured : undefined,
        author: authorString,
        doi,
        journalName,
        year: work.publication_year || undefined,
        publisher: work.primary_location?.source?.publisher || undefined,
        publicationType,
        citationCount: work.cited_by_count || undefined,
        venuePrestige,
      };
    } catch (error: any) {
      console.error(`[Metadata Enrichment] OpenAlex API error:`, error.message);
      return null;
    }
  }

  /**
   * Enrich citation metrics from Semantic Scholar API
   */
  async enrichFromSemanticScholar(
    doi?: string,
    title?: string
  ): Promise<EnrichmentResult | null> {
    try {
      let url: string;
      if (doi) {
        // Query by DOI
        const cleanDoi = doi.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
        url = `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(
          cleanDoi
        )}`;
      } else if (title) {
        // Query by title (less reliable)
        url = `https://api.semanticscholar.org/graph/v1/paper/search`;
      } else {
        return null;
      }

      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      if (this.semanticScholarApiKey) {
        headers["x-api-key"] = this.semanticScholarApiKey;
      }

      const params = doi
        ? {
            fields:
              "title,authors,year,citationCount,influentialCitationCount,venue",
          }
        : {
            query: title,
            limit: 1,
            fields:
              "title,authors,year,citationCount,influentialCitationCount,venue",
          };

      const response = await axios.get(url, {
        headers,
        params,
        timeout: 3000,
      });

      const paper = response.data?.data?.[0] || response.data;
      if (!paper) {
        return null;
      }

      return {
        source: "semanticscholar",
        confidence: "high",
        citationCount: paper.citationCount || undefined,
        // Note: Semantic Scholar doesn't provide structured author data in the same format
        // We'll rely on CrossRef/OpenAlex for that
      };
    } catch (error: any) {
      console.error(
        `[Metadata Enrichment] Semantic Scholar API error:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Check open access availability via Unpaywall API
   */
  async checkOpenAccess(doi: string): Promise<{
    isOpenAccess: boolean;
    oaUrl?: string;
  }> {
    if (!this.unpaywallEmail) {
      return { isOpenAccess: false }; // Skip if email not configured
    }

    try {
      const cleanDoi = doi.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
      const url = `https://api.unpaywall.org/v2/${encodeURIComponent(
        cleanDoi
      )}`;

      const response = await axios.get(url, {
        params: {
          email: this.unpaywallEmail,
        },
        timeout: 3000,
      });

      const data = response.data;
      if (data?.is_oa) {
        return {
          isOpenAccess: true,
          oaUrl:
            data.best_oa_location?.url_for_pdf ||
            data.best_oa_location?.url ||
            undefined,
        };
      }

      return { isOpenAccess: false };
    } catch (error: any) {
      console.error(
        `[Metadata Enrichment] Unpaywall API error:`,
        error.message
      );
      return { isOpenAccess: false };
    }
  }

  /**
   * Main enrichment pipeline
   * Merges results from multiple APIs, preferring CrossRef > OpenAlex > Semantic Scholar
   */
  async enrichSource(
    source: ResearchSourceForEnrichment
  ): Promise<EnrichedResearchSource> {
    console.log(
      `[Metadata Enrichment] Enriching source: ${source.title.substring(
        0,
        50
      )}...`
    );

    // Start with existing metadata
    const enriched: EnrichedResearchSource = {
      ...source,
      metadata_source: "scraping",
      metadata_confidence: "low",
    };

    // Step 1: Extract DOI if not already present
    let doi = source.doi;
    if (!doi) {
      doi =
        (await this.extractDoi(source.url, source.full_content)) || undefined;
      if (doi) {
        enriched.doi = doi;
        console.log(`[Metadata Enrichment] Extracted DOI: ${doi}`);
      }
    }

    // Step 2: Try CrossRef API (most authoritative, DOI-based)
    if (doi) {
      const crossrefResult = await this.enrichFromCrossRef(doi);
      if (crossrefResult) {
        console.log(`[Metadata Enrichment] CrossRef enrichment successful`);
        // Merge CrossRef data (highest priority)
        if (crossrefResult.authorsStructured) {
          enriched.authorsStructured = crossrefResult.authorsStructured;
        }
        if (crossrefResult.author && !enriched.author) {
          enriched.author = crossrefResult.author;
        }
        if (crossrefResult.journalName) {
          enriched.journalName = crossrefResult.journalName;
        }
        if (crossrefResult.volume) {
          enriched.volume = crossrefResult.volume;
        }
        if (crossrefResult.issue) {
          enriched.issue = crossrefResult.issue;
        }
        if (crossrefResult.pages) {
          enriched.pages = crossrefResult.pages;
        }
        if (crossrefResult.year) {
          enriched.year = crossrefResult.year;
        }
        if (crossrefResult.publisher) {
          enriched.publisher = crossrefResult.publisher;
        }
        if (crossrefResult.publicationType) {
          enriched.publicationType = crossrefResult.publicationType;
        }
        enriched.metadata_source = "crossref";
        enriched.metadata_confidence = crossrefResult.confidence;
      }

      // Step 3: Check open access via Unpaywall
      try {
        const oaCheck = await this.checkOpenAccess(doi);
        if (oaCheck.isOpenAccess && oaCheck.oaUrl) {
          enriched.open_access_url = oaCheck.oaUrl;
          console.log(`[Metadata Enrichment] Found open access URL`);
        }
      } catch (error) {
        // Non-fatal
      }
    }

    // Step 4: Try OpenAlex API (title/author-based fallback)
    if (
      !enriched.authorsStructured ||
      enriched.authorsStructured.length === 0
    ) {
      const openalexResult = await this.enrichFromOpenAlex(
        source.title,
        source.author
      );
      if (openalexResult) {
        console.log(`[Metadata Enrichment] OpenAlex enrichment successful`);
        // Merge OpenAlex data (only if not already set from CrossRef)
        if (openalexResult.authorsStructured && !enriched.authorsStructured) {
          enriched.authorsStructured = openalexResult.authorsStructured;
        }
        if (openalexResult.author && !enriched.author) {
          enriched.author = openalexResult.author;
        }
        if (openalexResult.doi && !enriched.doi) {
          enriched.doi = openalexResult.doi;
        }
        if (openalexResult.journalName && !enriched.journalName) {
          enriched.journalName = openalexResult.journalName;
        }
        if (openalexResult.year && !enriched.year) {
          enriched.year = openalexResult.year;
        }
        if (openalexResult.publisher && !enriched.publisher) {
          enriched.publisher = openalexResult.publisher;
        }
        if (openalexResult.publicationType && !enriched.publicationType) {
          enriched.publicationType = openalexResult.publicationType;
        }
        if (openalexResult.citationCount !== undefined) {
          enriched.citation_count = openalexResult.citationCount;
        }
        // Update metadata source if we got better data
        if (
          enriched.metadata_source === "scraping" ||
          enriched.metadata_confidence === "low"
        ) {
          enriched.metadata_source = "openalex";
          enriched.metadata_confidence = openalexResult.confidence;
        }
      }
    }

    // Step 5: Get citation metrics from Semantic Scholar
    if (enriched.doi || source.title) {
      const semanticResult = await this.enrichFromSemanticScholar(
        enriched.doi || source.doi,
        source.title
      );
      if (semanticResult && semanticResult.citationCount !== undefined) {
        // Use Semantic Scholar citation count if available (or if higher)
        if (
          !enriched.citation_count ||
          semanticResult.citationCount > enriched.citation_count
        ) {
          enriched.citation_count = semanticResult.citationCount;
          console.log(
            `[Metadata Enrichment] Citation count: ${semanticResult.citationCount}`
          );
        }
      }
    }

    console.log(
      `[Metadata Enrichment] Completed - Source: ${
        enriched.metadata_source
      }, Confidence: ${enriched.metadata_confidence}, Authors: ${
        enriched.authorsStructured?.length || 0
      }`
    );

    return enriched;
  }
}

// Singleton instance
export const metadataEnrichmentService = new MetadataEnrichmentService();
