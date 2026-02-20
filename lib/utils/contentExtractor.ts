import TurndownService from "turndown";
import axios from "axios";
import { JSDOM } from "jsdom";
import { ocrDocumentUrl, isPdfUrl } from "@/lib/services/mistralOcrService";
import { Mistral } from "@mistralai/mistralai";

export interface ExtractionResult {
  content: string; // Clean markdown
  title: string;
  author?: string;
  wordCount: number;
  excerpt: string; // First 200 words
  success: boolean;
  error?: string;

  // Academic metadata (same as OcrResult)
  journalName?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  year?: number;
  publisher?: string;
  publicationType?: string;
  authorsStructured?: Array<{
    first: string;
    last: string;
    middle?: string;
  }>;
}

export interface ExtractionOptions {
  maxWords?: number; // Default: 500
  timeout?: number; // Default: 8000ms
}

// Lazily initialize metascraper to avoid CJS/ESM issues at build time
// (metascraper-readability -> happy-dom is ESM-only and can't be required at module eval)
let _scraper: ((opts: { html: string; url: string }) => Promise<Record<string, string>>) | null = null;

async function getScraper() {
  if (!_scraper) {
    const [
      { default: metascraper },
      { default: metascraperReadability },
      { default: metascraperTitle },
      { default: metascraperDescription },
      { default: metascraperAuthor },
      { default: metascraperDate },
    ] = await Promise.all([
      import("metascraper"),
      import("metascraper-readability"),
      import("metascraper-title"),
      import("metascraper-description"),
      import("metascraper-author"),
      import("metascraper-date"),
    ]);
    _scraper = metascraper([
      metascraperReadability(),
      metascraperTitle(),
      metascraperDescription(),
      metascraperAuthor(),
      metascraperDate(),
    ]);
  }
  return _scraper;
}

// Initialize Mistral client for author extraction fallback
const mistralApiKey = process.env.MISTRAL_API_KEY;
const mistralClient = mistralApiKey
  ? new Mistral({ apiKey: mistralApiKey })
  : null;

/**
 * Extract author from content using LLM as a fallback when metascraper fails.
 */
async function extractAuthorFromContent(
  content: string
): Promise<string | undefined> {
  if (!mistralClient) {
    return undefined;
  }

  try {
    // Use first 2000 characters for author extraction
    const contentSample = content.substring(0, 2000).trim();

    if (!contentSample) {
      return undefined;
    }

    const response = await mistralClient.chat.complete({
      model: "mistral-small-latest",
      messages: [
        {
          role: "user",
          content: `Analyze the following text excerpt from a webpage and extract the author name(s). Return ONLY the author name(s) as plain text, or "null" if no author can be determined. Do not include any explanation, markdown formatting, or JSON structure.

Text excerpt:
${contentSample}

Return only the author name or "null":`,
        },
      ],
    });

    const authorRaw = response.choices[0]?.message?.content;
    if (!authorRaw) {
      return undefined;
    }

    // Handle content that might be string or ContentChunk[]
    let author: string;
    if (typeof authorRaw === "string") {
      author = authorRaw.trim();
    } else if (Array.isArray(authorRaw)) {
      author = authorRaw
        .map((chunk) => {
          if (typeof chunk === "string") return chunk;
          // Handle ContentChunk types - check for text property
          if (chunk && typeof chunk === "object") {
            const chunkObj = chunk as Record<string, unknown>;
            if ("text" in chunkObj && typeof chunkObj.text === "string") {
              return chunkObj.text;
            }
            // For image_url chunks or other types, skip or return empty
            return "";
          }
          return "";
        })
        .join("")
        .trim();
    } else {
      author = String(authorRaw).trim();
    }

    if (
      !author ||
      author.toLowerCase() === "null" ||
      author.toLowerCase() === "none"
    ) {
      return undefined;
    }

    console.log(
      `[Content Extract] Extracted author via LLM fallback: ${author}`
    );
    return author;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      "[Content Extract] Author extraction fallback failed:",
      errorMessage
    );
    return undefined;
  }
}

/**
 * Extract academic metadata from webpage HTML using LLM.
 * Same approach as PDF OCR but for web content.
 */
async function extractAcademicMetadataFromHtml(
  html: string,
  url: string
): Promise<{
  journalName?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  year?: number;
  publisher?: string;
  publicationType?: string;
  authorsStructured?: Array<{
    first: string;
    last: string;
    middle?: string;
  }>;
}> {
  if (!mistralClient) {
    return {};
  }

  try {
    // Extract visible text from HTML (first 3000 chars)
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;

    // Remove non-content elements
    const clonedDoc = document.cloneNode(true) as Document;
    clonedDoc
      .querySelectorAll("script, style, nav, header, footer, aside")
      .forEach((el) => el.remove());

    const textContent = clonedDoc.body?.textContent || "";
    const textSample = textContent.substring(0, 3000).trim();

    if (!textSample) {
      return {};
    }

    // Use same prompt as mistralOcrService extractMetadataFromText
    const response = await mistralClient.chat.complete({
      model: "mistral-small-latest",
      messages: [
        {
          role: "user",
          content: `Analyze the following text from a webpage and extract bibliographic metadata. This could be an academic paper, book, conference paper, or web article.

Extract the following fields if present:
- authors: Full names of all authors (do NOT use initials, extract full first and last names)
- title: Document title
- year: Publication year (just the number)
- journalName: Journal name (if academic paper)
- volume: Volume number (if journal)
- issue: Issue number (if journal)
- pages: Page range (e.g., "94-101")
- doi: Digital Object Identifier
- publisher: Publisher name
- publicationType: One of: journal, conference, book, book_chapter, web, thesis, report, preprint
- conferenceName: Conference name (if conference paper)
- editors: Editor names (if book or conference proceedings)
- isbn: ISBN (if book)

Return ONLY a valid JSON object. Use null for fields you cannot determine. For authors, provide an array of objects with "first" and "last" names.

Text excerpt:
${textSample}

Return JSON format:
{
  "author": "Author Name(s) or null",
  "title": "Document Title or null",
  "year": 2012 or null,
  "journalName": "Journal Name or null",
  "volume": "3" or null,
  "issue": "1" or null,
  "pages": "94-101" or null,
  "doi": "10.1234/example" or null,
  "publisher": "Publisher Name" or null,
  "publicationType": "journal" or null,
  "conferenceName": "Conference Name" or null,
  "editors": "Editor Names" or null,
  "isbn": "978-0-00-000000-0" or null,
  "authorsStructured": [{"first": "John", "last": "Doe"}] or null
}`,
        },
      ],
      responseFormat: { type: "json_object" },
    });

    const contentRaw = response.choices[0]?.message?.content;
    if (!contentRaw) {
      return {};
    }

    // Handle content parsing (same as mistralOcrService)
    let content: string;
    if (typeof contentRaw === "string") {
      content = contentRaw;
    } else if (Array.isArray(contentRaw)) {
      content = contentRaw
        .map((chunk) => {
          if (typeof chunk === "string") return chunk;
          if (chunk && typeof chunk === "object") {
            const chunkObj = chunk as Record<string, unknown>;
            if ("text" in chunkObj && typeof chunkObj.text === "string") {
              return chunkObj.text;
            }
            return "";
          }
          return "";
        })
        .join("");
    } else {
      content = String(contentRaw);
    }

    try {
      const metadata = JSON.parse(content);
      console.log(
        `[Content Extract] Extracted academic metadata - Journal: ${
          metadata.journalName || "none"
        }, DOI: ${metadata.doi || "none"}, Type: ${
          metadata.publicationType || "unknown"
        }`
      );

      return {
        journalName: metadata.journalName || undefined,
        volume: metadata.volume || undefined,
        issue: metadata.issue || undefined,
        pages: metadata.pages || undefined,
        doi: metadata.doi || undefined,
        year: metadata.year || undefined,
        publisher: metadata.publisher || undefined,
        publicationType: metadata.publicationType || undefined,
        authorsStructured: metadata.authorsStructured || undefined,
      };
    } catch (parseError) {
      console.error(
        "[Content Extract] Failed to parse academic metadata JSON:",
        parseError
      );
      return {};
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      "[Content Extract] Academic metadata extraction failed:",
      errorMessage
    );
    return {};
  }
}

// Fallback content extraction when readability fails
function extractContentFallback(html: string, url: string): string | null {
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  // Try common article content selectors
  const contentSelectors = [
    "article",
    '[role="article"]',
    ".article-content",
    ".post-content",
    ".entry-content",
    ".content",
    "main",
    "#content",
    ".main-content",
  ];

  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    const textContent = element?.textContent?.trim();
    if (textContent && textContent.length > 100 && element) {
      console.log(
        `[Content Extract] Found content using selector: ${selector}`
      );
      return element.innerHTML;
    }
  }

  // If still no content, try to get body text
  const body = document.body;
  if (body) {
    // Remove script and style elements
    const scripts = body.querySelectorAll(
      "script, style, nav, header, footer, aside"
    );
    scripts.forEach((el) => el.remove());
    return body.innerHTML;
  }

  return null;
}

// Extract readable content, using fallback if needed
function extractReadableContent(
  readabilityHtml: string | undefined,
  rawHtml: string,
  url: string
): string | null {
  if (readabilityHtml && readabilityHtml.trim().length >= 100) {
    return readabilityHtml;
  }

  console.log(
    `[Content Extract] Readability returned empty/insufficient content for ${url}, trying fallback extraction`
  );
  const fallbackHtml = extractContentFallback(rawHtml, url);
  return fallbackHtml && fallbackHtml.trim().length >= 100
    ? fallbackHtml
    : null;
}

function truncateToWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;

  const truncated = words.slice(0, maxWords).join(" ");

  // Try to end at sentence boundary
  const lastPeriod = truncated.lastIndexOf(".");
  const lastExclamation = truncated.lastIndexOf("!");
  const lastQuestion = truncated.lastIndexOf("?");
  const lastSentence = Math.max(lastPeriod, lastExclamation, lastQuestion);

  if (lastSentence > truncated.length * 0.8) {
    return truncated.substring(0, lastSentence + 1);
  }

  return truncated + "...";
}

// Process extracted HTML content into final result
function processExtractedContent(
  readableHtml: string,
  metadata: {
    title?: string;
    author?: string;
    description?: string;
  },
  maxWords: number
): ExtractionResult {
  // Convert HTML to Markdown
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });

  const markdown = turndownService.turndown(readableHtml);

  // Intelligent truncation
  const truncated = truncateToWords(markdown, maxWords);
  const wordCount = truncated.split(/\s+/).length;

  // Generate excerpt (first 200 words, or use description if available)
  const excerpt = metadata.description
    ? truncateToWords(metadata.description, 200)
    : truncateToWords(markdown, 200);

  return {
    content: truncated,
    title: metadata.title || "",
    author: metadata.author || undefined,
    wordCount,
    excerpt,
    success: true,
  };
}

/**
 * Fallback to scrape API when direct fetching fails (e.g., 403 errors)
 */
async function extractViaScraperApi(
  url: string,
  maxWords: number
): Promise<ExtractionResult> {
  try {
    console.log(`[Content Extract] Trying scraper API for ${url}`);

    const scrapeResponse = await fetch("http://localhost:8000/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        url,
        include_images: false,
        include_links: false,
        max_text_length: maxWords * 6, // ~6 chars per word
      }),
    });

    if (!scrapeResponse.ok) {
      throw new Error(
        `Scraper API failed with status ${scrapeResponse.status}`
      );
    }

    const scrapeData = await scrapeResponse.json();

    if (!scrapeData.text_content) {
      throw new Error("No text content from scraper");
    }

    const truncated = truncateToWords(scrapeData.text_content, maxWords);
    const wordCount = truncated.split(/\s+/).length;
    const excerpt = scrapeData.meta_description
      ? truncateToWords(scrapeData.meta_description, 200)
      : truncateToWords(scrapeData.text_content, 200);

    console.log(`[Content Extract] ✓ Scraper API succeeded for ${url}`);

    return {
      content: truncated,
      title: scrapeData.title || "",
      author: undefined, // Scraper doesn't extract author
      wordCount,
      excerpt,
      success: true,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[Content Extract] Scraper API failed for ${url}:`,
      errorMessage
    );
    throw error;
  }
}

export async function extractArticleContent(
  url: string,
  options: ExtractionOptions = {}
): Promise<ExtractionResult> {
  const { maxWords = 500, timeout = 8000 } = options;

  try {
    // Check if URL is a PDF and handle with Mistral OCR
    if (isPdfUrl(url)) {
      console.log(`[Content Extract] Detected PDF URL: ${url}`);
      try {
        const ocrResult = await ocrDocumentUrl(url);

        // Truncate and generate excerpt
        const truncated = truncateToWords(ocrResult.markdown, maxWords);
        const wordCount = truncated.split(/\s+/).length;
        const excerpt = truncateToWords(ocrResult.markdown, 200);

        return {
          content: truncated,
          title: ocrResult.title || "", // Use extracted title from OCR
          author: ocrResult.author, // Use extracted author from OCR
          wordCount,
          excerpt,
          success: true,
        };
      } catch (ocrError: unknown) {
        const ocrErrorMsg =
          ocrError instanceof Error ? ocrError.message : String(ocrError);
        console.error(
          `[Content Extract] PDF OCR failed for ${url}:`,
          ocrErrorMsg
        );
        return {
          content: "",
          title: "",
          success: false,
          error: `PDF extraction failed: ${ocrErrorMsg}`,
          wordCount: 0,
          excerpt: "",
        };
      }
    }

    // 1. Fetch HTML with timeout
    let response;
    let usedScraper = false;

    try {
      response = await axios.get(url, {
        timeout,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });

      if (response.status >= 400) {
        throw new Error(`Request failed with status code ${response.status}`);
      }
    } catch (directFetchError: unknown) {
      const errorMsg =
        directFetchError instanceof Error
          ? directFetchError.message
          : String(directFetchError);

      // If we get a 403 or other blocking error, try the scraper API
      if (
        errorMsg.includes("403") ||
        errorMsg.includes("401") ||
        errorMsg.includes("429")
      ) {
        console.log(
          `[Content Extract] Direct fetch blocked (${errorMsg}), trying scraper API`
        );

        try {
          const scraperResult = await extractViaScraperApi(url, maxWords);

          // Still try to extract academic metadata from the scraped content
          const academicMetadata = await extractAcademicMetadataFromHtml(
            `<html><body>${scraperResult.content}</body></html>`,
            url
          );

          return {
            ...scraperResult,
            journalName: academicMetadata.journalName,
            volume: academicMetadata.volume,
            issue: academicMetadata.issue,
            pages: academicMetadata.pages,
            doi: academicMetadata.doi,
            year: academicMetadata.year,
            publisher: academicMetadata.publisher,
            publicationType: academicMetadata.publicationType,
            authorsStructured: academicMetadata.authorsStructured,
          };
        } catch (scraperError) {
          // If scraper also fails, throw the original error
          console.error(
            `[Content Extract] Both direct fetch and scraper failed for ${url}`
          );
          throw directFetchError;
        }
      }

      // For other errors, just throw
      throw directFetchError;
    }

    // 2. Extract metadata and content using Metascraper
    const scraper = await getScraper();
    const metadata = (await scraper({
      html: response.data,
      url,
    })) as {
      readability?: string;
      title?: string;
      author?: string;
      description?: string;
    };

    // 3. Extract readable content with fallback
    const readableHtml = extractReadableContent(
      metadata.readability,
      response.data,
      url
    );

    if (!readableHtml || readableHtml.trim().length < 50) {
      return {
        content: "",
        title: metadata.title || "",
        success: false,
        error: "Failed to extract content - no readable content found",
        wordCount: 0,
        excerpt: metadata.description || "",
      };
    }

    // 4. If metascraper didn't find an author, try LLM extraction as fallback
    let finalAuthor = metadata.author;
    if (!finalAuthor) {
      const turndownService = new TurndownService();
      const markdownContent = turndownService.turndown(readableHtml);
      finalAuthor = await extractAuthorFromContent(markdownContent);
    }

    // 4b. Extract academic metadata for ALL web sources
    const academicMetadata = await extractAcademicMetadataFromHtml(
      response.data,
      url
    );

    // 5. Process content: convert to markdown, truncate, and generate excerpt
    const result = processExtractedContent(
      readableHtml,
      { ...metadata, author: finalAuthor },
      maxWords
    );

    // 6. Add academic metadata to result
    return {
      ...result,
      journalName: academicMetadata.journalName,
      volume: academicMetadata.volume,
      issue: academicMetadata.issue,
      pages: academicMetadata.pages,
      doi: academicMetadata.doi,
      year: academicMetadata.year,
      publisher: academicMetadata.publisher,
      publicationType: academicMetadata.publicationType,
      authorsStructured: academicMetadata.authorsStructured,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Content extraction failed for ${url}:`, errorMessage);
    return {
      content: "",
      title: "",
      success: false,
      error: errorMessage,
      wordCount: 0,
      excerpt: "",
    };
  }
}
