import { CitationStyle, ResearchSource } from "@/lib/types/document";

// Format a single in-text citation based on style
export function formatInTextCitation(
  source: ResearchSource,
  style: CitationStyle,
  index: number
): string {
  const author = source.author || "Anonymous";
  const year = source.publishedDate
    ? new Date(source.publishedDate).getFullYear()
    : "n.d.";

  switch (style) {
    case CitationStyle.APA:
      return `(${author}, ${year})`;

    case CitationStyle.MLA:
      // MLA typically uses author and page number, but for web sources without pages, just author
      return `(${author})`;

    case CitationStyle.HARVARD:
      return `(${author} ${year})`;

    case CitationStyle.CHICAGO:
      return `(${author} ${year})`;

    case CitationStyle.IEEE:
      return `[${index + 1}]`;

    default:
      return `[${index + 1}]`;
  }
}

// Helper: Check if source has academic metadata
function hasAcademicMetadata(source: ResearchSource): boolean {
  return !!(
    source.journalName ||
    source.volume ||
    source.doi ||
    source.publicationType === "journal" ||
    source.publicationType === "conference"
  );
}

// Helper: Format multiple authors based on citation style
function formatAuthors(source: ResearchSource, style: CitationStyle): string {
  // #region agent log
  fetch("http://127.0.0.1:7242/ingest/6b43ab85-af05-47ef-adb0-433c63dc0d73", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "citations.ts:formatAuthors",
      message: "formatAuthors called",
      data: {
        sourceTitle: source.title?.substring(0, 50),
        hasAuthor: !!source.author,
        author: source.author,
        hasAuthorsStructured: !!source.authorsStructured,
        authorsStructuredLength: source.authorsStructured?.length,
        authorsStructuredSample: source.authorsStructured?.slice(0, 2),
        url: source.url?.substring(0, 80),
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      hypothesisId: "E",
    }),
  }).catch(() => {});
  // #endregion
  // Try structured authors first
  if (source.authorsStructured && source.authorsStructured.length > 0) {
    const authors = source.authorsStructured;

    switch (style) {
      case CitationStyle.APA:
        // APA: Last, F. M., Last, F. M., & Last, F. M.
        if (authors.length === 1) {
          const a = authors[0];
          const firstInitial = a.first ? a.first.charAt(0) + "." : "";
          const middleInitial = a.middle ? " " + a.middle.charAt(0) + "." : "";
          return `${a.last}, ${firstInitial}${middleInitial}`;
        } else if (authors.length === 2) {
          return authors
            .map((a, i) => {
              const firstInitial = a.first ? a.first.charAt(0) + "." : "";
              const middleInitial = a.middle
                ? " " + a.middle.charAt(0) + "."
                : "";
              return i === 0
                ? `${a.last}, ${firstInitial}${middleInitial}`
                : `& ${a.last}, ${firstInitial}${middleInitial}`;
            })
            .join(", ");
        } else {
          return authors
            .map((a, i) => {
              const firstInitial = a.first ? a.first.charAt(0) + "." : "";
              const middleInitial = a.middle
                ? " " + a.middle.charAt(0) + "."
                : "";
              if (i === authors.length - 1) {
                return `& ${a.last}, ${firstInitial}${middleInitial}`;
              }
              return `${a.last}, ${firstInitial}${middleInitial}`;
            })
            .join(", ");
        }

      case CitationStyle.MLA:
        // MLA: Last, First M., First M. Last, and First M. Last.
        if (authors.length === 1) {
          const a = authors[0];
          const middle = a.middle ? " " + a.middle.charAt(0) + "." : "";
          return `${a.last}, ${a.first}${middle}`;
        } else if (authors.length === 2) {
          const a1 = authors[0];
          const a2 = authors[1];
          const middle1 = a1.middle ? " " + a1.middle.charAt(0) + "." : "";
          const middle2 = a2.middle ? " " + a2.middle.charAt(0) + "." : "";
          return `${a1.last}, ${a1.first}${middle1}, and ${a2.first}${middle2} ${a2.last}`;
        } else {
          return `${authors[0].last}, ${authors[0].first}, et al.`;
        }

      case CitationStyle.HARVARD:
        // Harvard: Last, F.M., Last, F.M. and Last, F.M.
        return authors
          .map((a, i) => {
            const firstInitial = a.first ? a.first.charAt(0) + "." : "";
            const middleInitial = a.middle ? a.middle.charAt(0) + "." : "";
            const initials = firstInitial + middleInitial;

            if (i === authors.length - 1 && authors.length > 1) {
              return `and ${a.last}, ${initials}`;
            }
            return `${a.last}, ${initials}`;
          })
          .join(", ");

      case CitationStyle.CHICAGO:
        // Chicago: Last, First Middle., First Middle Last, and First Middle Last.
        if (authors.length === 1) {
          const a = authors[0];
          const middle = a.middle ? " " + a.middle : "";
          return `${a.last}, ${a.first}${middle}`;
        } else if (authors.length === 2) {
          const a1 = authors[0];
          const a2 = authors[1];
          const middle1 = a1.middle ? " " + a1.middle : "";
          const middle2 = a2.middle ? " " + a2.middle : "";
          return `${a1.last}, ${a1.first}${middle1}, and ${a2.first}${middle2} ${a2.last}`;
        } else {
          return `${authors[0].last}, ${authors[0].first}, et al.`;
        }

      case CitationStyle.IEEE:
        // IEEE: F. M. Last, F. M. Last, and F. M. Last (list all authors, no et al.)
        return authors
          .map((a, i) => {
            const firstInitial = a.first ? a.first.charAt(0) + "." : "";
            const middleInitial = a.middle ? " " + a.middle.charAt(0) + "." : "";
            const formatted = `${firstInitial}${middleInitial} ${a.last}`;

            if (authors.length === 1) {
              return formatted;
            } else if (i === authors.length - 1) {
              return `and ${formatted}`;
            }
            return formatted;
          })
          .join(", ");

      default:
        // Fallback: comma-separated full names
        return authors.map((a) => `${a.first} ${a.last}`).join(", ");
    }
  }

  // Fall back to simple author string
  // #region agent log
  fetch("http://127.0.0.1:7242/ingest/6b43ab85-af05-47ef-adb0-433c63dc0d73", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "citations.ts:formatAuthors-fallback",
      message: "Using fallback author",
      data: {
        sourceTitle: source.title?.substring(0, 50),
        author: source.author,
        willBeAnonymous: !source.author,
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      hypothesisId: "E",
    }),
  }).catch(() => {});
  // #endregion
  return source.author || "Anonymous";
}

// Format academic references (journal papers, conference papers, etc.)
function formatAcademicReference(
  source: ResearchSource,
  style: CitationStyle
): string {
  const authors = formatAuthors(source, style);
  const title = source.title;
  const year =
    source.year ||
    (source.publishedDate
      ? new Date(source.publishedDate).getFullYear()
      : "n.d.");
  const journal = source.journalName;
  const volume = source.volume;
  const issue = source.issue;
  const pages = source.pages;
  const doi = source.doi;

  switch (style) {
    case CitationStyle.APA:
      // APA 7th: Authors. (Year). Title. Journal, volume(issue), pages. https://doi.org/xxx
      let apaRef = `${authors}. (${year}). ${title}.`;
      if (journal) {
        apaRef += ` <em>${journal}</em>`;
        if (volume) {
          apaRef += `, <em>${volume}</em>`;
          if (issue) {
            apaRef += `(${issue})`;
          }
        }
        if (pages) {
          apaRef += `, ${pages}`;
        }
        apaRef += ".";
      }
      if (doi) {
        apaRef += ` https://doi.org/${doi}`;
      } else if (source.url) {
        apaRef += ` ${source.url}`;
      }
      return apaRef;

    case CitationStyle.MLA:
      // MLA 9th: Authors. "Title." Journal, vol. X, no. X, Year, pp. X-X. DOI or URL.
      let mlaRef = `${authors}. "${title}."`;
      if (journal) {
        mlaRef += ` <em>${journal}</em>`;
        if (volume) {
          mlaRef += `, vol. ${volume}`;
        }
        if (issue) {
          mlaRef += `, no. ${issue}`;
        }
        mlaRef += `, ${year}`;
        if (pages) {
          mlaRef += `, pp. ${pages}`;
        }
        mlaRef += ".";
      }
      if (doi) {
        mlaRef += ` doi:${doi}.`;
      } else if (source.url) {
        mlaRef += ` ${source.url}.`;
      }
      return mlaRef;

    case CitationStyle.HARVARD:
      // Harvard: Authors (Year) 'Title', Journal, vol. X, no. X, pp. X-X. doi: XXX
      let harvardRef = `${authors} (${year}) '${title}'`;
      if (journal) {
        harvardRef += `, <em>${journal}</em>`;
        if (volume) {
          harvardRef += `, vol. ${volume}`;
        }
        if (issue) {
          harvardRef += `, no. ${issue}`;
        }
        if (pages) {
          harvardRef += `, pp. ${pages}`;
        }
      }
      if (doi) {
        harvardRef += `. doi: ${doi}`;
      } else if (source.url) {
        harvardRef += `. Available at: ${source.url}`;
      }
      return harvardRef + ".";

    case CitationStyle.CHICAGO:
      // Chicago 17th: Authors. "Title." Journal vol, no. issue (Year): pages. doi.
      let chicagoRef = `${authors}. "${title}."`;
      if (journal) {
        chicagoRef += ` <em>${journal}</em>`;
        if (volume) {
          chicagoRef += ` ${volume}`;
        }
        if (issue) {
          chicagoRef += `, no. ${issue}`;
        }
        chicagoRef += ` (${year})`;
        if (pages) {
          chicagoRef += `: ${pages}`;
        }
        chicagoRef += ".";
      }
      if (doi) {
        chicagoRef += ` https://doi.org/${doi}.`;
      } else if (source.url) {
        chicagoRef += ` ${source.url}.`;
      }
      return chicagoRef;

    case CitationStyle.IEEE:
      // IEEE: F. Author, "Title," Journal, vol. X, no. X, pp. X-X, Year, doi: 10.xxx.
      let ieeeRef = `${authors}, "${title},"`;
      if (journal) {
        ieeeRef += ` <em>${journal}</em>`;
        if (volume) {
          ieeeRef += `, vol. ${volume}`;
        }
        if (issue) {
          ieeeRef += `, no. ${issue}`;
        }
        if (pages) {
          ieeeRef += `, pp. ${pages}`;
        }
        ieeeRef += `, ${year}`;
      }
      if (doi) {
        ieeeRef += `, doi: ${doi}`;
      } else if (source.url) {
        ieeeRef += `. [Online]. Available: ${source.url}`;
      }
      return ieeeRef + ".";

    default:
      return formatWebReference(source, style);
  }
}

// Format web references (fallback for sources without academic metadata)
function formatWebReference(
  source: ResearchSource,
  style: CitationStyle
): string {
  const authors = formatAuthors(source, style);
  const title = source.title;
  const url = source.url;
  const date = source.publishedDate;
  const year = source.year || (date ? new Date(date).getFullYear() : "n.d.");
  const fullDate = date
    ? new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "n.d.";

  switch (style) {
    case CitationStyle.APA:
      return `${authors}. (${year}). ${title}. Retrieved from ${url}`;

    case CitationStyle.MLA:
      return `${authors}. "${title}." Web. ${fullDate}. ${url}`;

    case CitationStyle.HARVARD:
      return `${authors} (${year}) ${title}. Available at: ${url} (Accessed: ${fullDate}).`;

    case CitationStyle.CHICAGO:
      return `${authors}. ${year}. "${title}." ${url}.`;

    case CitationStyle.IEEE:
      // IEEE: F. Author, "Title." [Online]. Available: URL (accessed Mon. Day, Year).
      const accessDate = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `${authors}, "${title}." [Online]. Available: ${url} (accessed ${accessDate}).`;

    default:
      return `${authors}. ${title}. ${url}`;
  }
}

// Main function: Format a single reference/bibliography entry based on style
export function formatReference(
  source: ResearchSource,
  style: CitationStyle
): string {
  try {
    const hasAcademic = hasAcademicMetadata(source);

    if (hasAcademic) {
      return formatAcademicReference(source, style);
    }

    return formatWebReference(source, style);
  } catch (error) {
    console.error("[Citations] Error formatting reference:", error);
    // Ultra-safe fallback
    const author = source.author || "Anonymous";
    const title = source.title || "Untitled";
    const url = source.url;
    return `${author}. ${title}. ${url}`;
  }
}

// Generate the full reference list/bibliography section in HTML format
export function generateReferenceList(
  sources: ResearchSource[],
  style: CitationStyle
): string {
  // #region agent log
  fetch("http://127.0.0.1:7242/ingest/6b43ab85-af05-47ef-adb0-433c63dc0d73", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "citations.ts:generateReferenceList",
      message: "Generating reference list",
      data: {
        sourceCount: sources.length,
        style,
        sourcesWithAuthor: sources.filter((s) => s.author).length,
        sourcesWithAuthorsStructured: sources.filter(
          (s) => s.authorsStructured && s.authorsStructured.length > 0
        ).length,
        sampleSources: sources
          .slice(0, 3)
          .map((s) => ({
            title: s.title?.substring(0, 40),
            author: s.author,
            hasAuthorsStructured: !!s.authorsStructured,
          })),
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      hypothesisId: "E",
    }),
  }).catch(() => {});
  // #endregion
  if (sources.length === 0) {
    console.warn("No sources provided for reference list");
    return "\n\n<h1>References</h1>\n\n<p><em>No sources were provided for this document.</em></p>";
  }

  console.log(
    `Generating reference list with ${sources.length} sources in ${style} format`
  );

  // Get the appropriate heading based on citation style
  const heading = getReferenceListHeading(style);

  // IEEE uses order of appearance (not sorted); other styles sort alphabetically
  const sortedSources =
    style === CitationStyle.IEEE
      ? sources
      : [...sources].sort((a, b) => {
          const authorA = a.author || "Anonymous";
          const authorB = b.author || "Anonymous";
          return authorA.localeCompare(authorB);
        });

  // Format each reference
  const references = sortedSources.map((source) =>
    formatReference(source, style)
  );

  // IEEE uses numbered format [1], [2]; other styles use bullet list
  if (style === CitationStyle.IEEE) {
    const referenceListItems = references
      .map((ref, index) => `<p>[${index + 1}] ${ref}</p>`)
      .join("\n");
    return `\n\n<h1>${heading}</h1>\n\n${referenceListItems}`;
  }

  // Build the reference list with proper HTML formatting
  const referenceListItems = references
    .map((ref) => `<li>${ref}</li>`)
    .join("\n");

  return `\n\n<h1>${heading}</h1>\n\n<ul>\n${referenceListItems}\n</ul>`;
}

// Get the appropriate heading for the reference list based on citation style
function getReferenceListHeading(style: CitationStyle): string {
  switch (style) {
    case CitationStyle.APA:
      return "References";
    case CitationStyle.MLA:
      return "Works Cited";
    case CitationStyle.HARVARD:
      return "Reference List";
    case CitationStyle.CHICAGO:
      return "Bibliography";
    case CitationStyle.IEEE:
      return "References";
    default:
      return "References";
  }
}

// Process content and replace citation markers with formatted citations
export function processCitations(
  content: string,
  sources: ResearchSource[],
  style: CitationStyle
): string {
  let processedContent = content;

  // Replace each citation marker [1], [2], etc. with formatted citation
  sources.forEach((source, index) => {
    const marker = `\\[${index + 1}\\]`;
    const regex = new RegExp(marker, "g");
    const formattedCitation = formatInTextCitation(source, style, index);
    processedContent = processedContent.replace(regex, formattedCitation);
  });

  return processedContent;
}

// Remove AI-generated references sections to prevent duplication
function removeAIGeneratedReferences(content: string): string {
  // Match reference section headers in both markdown (#, ##, ###) and HTML (<h1>, <h2>, etc.)
  // Markdown pattern: one or more # characters + "References", "Works Cited", etc.
  const markdownPattern =
    /(\n|^)#+\s*(References?|Works?\s+Cited|Bibliography|Reference\s+List)\s*(\n|$)/i;

  // HTML pattern: <h1-6> tags containing "References", "Works Cited", etc.
  const htmlPattern =
    /(\n|^)<h[1-6][^>]*>\s*(References?|Works?\s+Cited|Bibliography|Reference\s+List)\s*<\/h[1-6]>\s*(\n|$)/i;

  // Try markdown pattern first
  let match = content.match(markdownPattern);
  if (match && match.index !== undefined) {
    return content.substring(
      0,
      match.index + (match[0].startsWith("\n") ? 1 : 0)
    );
  }

  // Try HTML pattern
  match = content.match(htmlPattern);
  if (match && match.index !== undefined) {
    return content.substring(
      0,
      match.index + (match[0].startsWith("\n") ? 1 : 0)
    );
  }

  return content;
}

// Complete citation formatting: process in-text citations and add reference list
export function formatWithCitations(
  content: string,
  sources: ResearchSource[],
  style: CitationStyle
): string {
  // Remove AI-generated references to prevent duplication
  const cleanedContent = removeAIGeneratedReferences(content);

  // First, process all in-text citation markers
  const processedContent = processCitations(cleanedContent, sources, style);

  // Then, append the reference list at the end
  const referenceList = generateReferenceList(sources, style);

  return processedContent + referenceList;
}

// Validate that all citation markers have corresponding sources
export function validateCitations(
  content: string,
  sources: ResearchSource[]
): { valid: boolean; missingMarkers: number[] } {
  const missingMarkers: number[] = [];

  // Check for citation markers [1], [2], etc. in the content
  for (let i = 1; i <= sources.length; i++) {
    const marker = `[${i}]`;
    if (!content.includes(marker)) {
      missingMarkers.push(i);
    }
  }

  return {
    valid: missingMarkers.length === 0,
    missingMarkers,
  };
}

// Extract all citation markers from content
export function extractCitationMarkers(content: string): number[] {
  const markerRegex = /\[(\d+)\]/g;
  const markers: number[] = [];
  let match;

  while ((match = markerRegex.exec(content)) !== null) {
    const markerNumber = parseInt(match[1], 10);
    if (!markers.includes(markerNumber)) {
      markers.push(markerNumber);
    }
  }

  return markers.sort((a, b) => a - b);
}
