import { Mistral } from "@mistralai/mistralai";

const mistralApiKey = process.env.MISTRAL_API_KEY;

if (!mistralApiKey) {
  console.warn(
    "[MistralOCR] MISTRAL_API_KEY not configured. PDF OCR will fail."
  );
}

const mistralClient = mistralApiKey
  ? new Mistral({ apiKey: mistralApiKey })
  : null;

export interface OcrResult {
  markdown: string;
  wordCount: number;

  // Basic metadata
  author?: string;
  title?: string;

  // Academic metadata
  journalName?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  year?: number;
  publisher?: string;
  publicationType?: 'journal' | 'conference' | 'book' | 'book_chapter' | 'web' | 'thesis' | 'report' | 'preprint';
  isbn?: string;
  conferenceName?: string;
  editors?: string;
  authorsStructured?: Array<{
    first: string;
    last: string;
    middle?: string;
  }>;
}

interface MetadataExtraction {
  author?: string;
  title?: string;
  journalName?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  year?: number;
  publisher?: string;
  publicationType?: 'journal' | 'conference' | 'book' | 'book_chapter' | 'web' | 'thesis' | 'report' | 'preprint';
  isbn?: string;
  conferenceName?: string;
  editors?: string;
  authorsStructured?: Array<{
    first: string;
    last: string;
    middle?: string;
  }>;
}

/**
 * Extract metadata (author, title, and academic details) from document text using LLM.
 * Analyzes the first 2000 characters of the text to identify bibliographic metadata.
 */
async function extractMetadataFromText(
  text: string
): Promise<MetadataExtraction> {
  if (!mistralClient) {
    console.warn(
      "[MistralOCR] Cannot extract metadata: Mistral client not initialized"
    );
    return {};
  }

  try {
    // Use first 2000 characters for metadata extraction
    const textSample = text.substring(0, 2000).trim();

    if (!textSample) {
      return {};
    }

    const response = await mistralClient.chat.complete({
      model: "mistral-small-latest",
      messages: [
        {
          role: "user",
          content: `Analyze the following text excerpt from a document and extract bibliographic metadata. This could be an academic paper, book, conference paper, or web article.

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

    // Handle content that might be string or ContentChunk[]
    let content: string;
    if (typeof contentRaw === "string") {
      content = contentRaw;
    } else if (Array.isArray(contentRaw)) {
      content = contentRaw
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
        .join("");
    } else {
      content = String(contentRaw);
    }

    try {
      const metadata = JSON.parse(content) as MetadataExtraction;
      console.log(
        `[MistralOCR] Extracted metadata - Author: ${
          metadata.author || "not found"
        }, Title: ${metadata.title || "not found"}, Type: ${
          metadata.publicationType || "unknown"
        }, Journal: ${metadata.journalName || "none"}`
      );
      return {
        author: metadata.author || undefined,
        title: metadata.title || undefined,
        journalName: metadata.journalName || undefined,
        volume: metadata.volume || undefined,
        issue: metadata.issue || undefined,
        pages: metadata.pages || undefined,
        doi: metadata.doi || undefined,
        year: metadata.year || undefined,
        publisher: metadata.publisher || undefined,
        publicationType: metadata.publicationType || undefined,
        isbn: metadata.isbn || undefined,
        conferenceName: metadata.conferenceName || undefined,
        editors: metadata.editors || undefined,
        authorsStructured: metadata.authorsStructured || undefined,
      };
    } catch (parseError) {
      console.error("[MistralOCR] Failed to parse metadata JSON:", parseError);
      console.error("[MistralOCR] Raw content:", content);
      // Return minimal metadata on parse error
      return {
        author: undefined,
        title: undefined,
      };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[MistralOCR] Metadata extraction failed:", errorMessage);
    // Don't throw - metadata extraction is optional
    return {};
  }
}

/**
 * Extract text from a PDF URL using Mistral Document AI OCR.
 * Requires the URL to be publicly accessible.
 */
export async function ocrDocumentUrl(documentUrl: string): Promise<OcrResult> {
  if (!mistralClient) {
    throw new Error(
      "Mistral OCR service not initialized: MISTRAL_API_KEY is missing"
    );
  }

  try {
    console.log(`[MistralOCR] Processing PDF: ${documentUrl}`);

    const ocrResponse = await mistralClient.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        documentUrl: documentUrl,
      },
      includeImageBase64: false,
    });

    // Combine all pages into a single markdown string
    let combinedMarkdown = "";

    if (ocrResponse.pages && Array.isArray(ocrResponse.pages)) {
      // Combine markdown from all pages
      for (const page of ocrResponse.pages) {
        if (page.markdown) {
          combinedMarkdown += page.markdown + "\n\n";
        }
      }
    }

    combinedMarkdown = combinedMarkdown.trim();

    if (!combinedMarkdown) {
      throw new Error("No text extracted from PDF");
    }

    const wordCount = combinedMarkdown.split(/\s+/).length;

    console.log(
      `[MistralOCR] Successfully extracted ${wordCount} words from ${documentUrl}`
    );

    // Extract metadata (author, title, and academic details) from the OCR'd text
    const metadata = await extractMetadataFromText(combinedMarkdown);

    return {
      markdown: combinedMarkdown,
      wordCount,
      author: metadata.author,
      title: metadata.title,
      journalName: metadata.journalName,
      volume: metadata.volume,
      issue: metadata.issue,
      pages: metadata.pages,
      doi: metadata.doi,
      year: metadata.year,
      publisher: metadata.publisher,
      publicationType: metadata.publicationType,
      isbn: metadata.isbn,
      conferenceName: metadata.conferenceName,
      editors: metadata.editors,
      authorsStructured: metadata.authorsStructured,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[MistralOCR] Failed to process ${documentUrl}:`,
      errorMessage
    );
    throw new Error(`PDF OCR failed: ${errorMessage}`);
  }
}

/**
 * Check if a URL is a PDF
 */
export function isPdfUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    return pathname.endsWith(".pdf");
  } catch {
    return url.toLowerCase().endsWith(".pdf");
  }
}









