import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "node:crypto";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Configure route to accept longer timeouts for PDF processing
export const maxDuration = 300; // 5 minutes timeout

// Initialize the S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// Generate a unique filename
const generateUniqueFilename = (originalFilename: string) => {
  const extension = originalFilename.split(".").pop();
  const randomString = crypto.randomBytes(16).toString("hex");
  return `${randomString}.${extension}`;
};

// Request body interface
interface ScrapeRequest {
  url: string;
  projectId: string;
  include_images?: boolean;
  include_links?: boolean;
  max_text_length?: number;
}

// Response from Scrala API
interface ScralaResponse {
  url: string;
  title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  text_content: string;
  pdfs: Array<{
    url: string;
    text: string;
    title: string;
  }>;
  status_code: number;
  content_type: string;
}

// Process PDF from URL - download, upload to S3, OCR
async function processPdfFromUrl(
  projectId: string,
  pdfUrl: string,
  pdfTitle: string
): Promise<{ sourceId?: string; error?: string }> {
  console.log(`[Scrape] Processing PDF from URL: ${pdfUrl}`);
  const supabase = await createServerSupabaseClient();

  try {
    // Download the PDF file
    console.log(`[Scrape] Downloading PDF from: ${pdfUrl}`);
    const pdfResponse = await fetch(pdfUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HemmiWrite/1.0)",
      },
    });

    if (!pdfResponse.ok) {
      throw new Error(
        `Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`
      );
    }

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    console.log(`[Scrape] Downloaded PDF: ${pdfBuffer.length} bytes`);

    // Generate unique filename and upload to S3
    const uniqueFilename = generateUniqueFilename(
      pdfTitle.replaceAll(/[^a-zA-Z0-9]/g, "_") + ".pdf"
    );

    const params = {
      Bucket: "nutonai",
      Key: uniqueFilename,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    const fileUrl = `https://nutonai.s3.amazonaws.com/${uniqueFilename}`;
    console.log(`[Scrape] Uploaded PDF to S3: ${fileUrl}`);

    // Create research_sources row
    const { data: insertedRow, error: insertError } = await supabase
      .from("research_sources")
      .insert([
        {
          project_id: projectId,
          title: pdfTitle || "PDF Document",
          url: pdfUrl,
          excerpt: `PDF extracted from webpage`,
          source_type: "web",
          is_selected: true,
          content_fetch_status: "fetching",
          fetch_attempted_at: new Date().toISOString(),
        } as any,
      ])
      .select()
      .single();

    if (insertError || !insertedRow) {
      console.error(
        "[Scrape] Failed to create research_sources row:",
        insertError
      );
      return {
        error: `Failed to create source row: ${
          insertError?.message || "Unknown error"
        }`,
      };
    }

    const sourceId = insertedRow.id;
    console.log(`[Scrape] Created research_sources row: ${sourceId}`);

    // OCR the PDF using the OCR API
    try {
      const ocrResponse = await fetch(
        `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        }/api/ocr/extract`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ documentUrl: fileUrl }),
        }
      );

      if (!ocrResponse.ok) {
        throw new Error(
          `OCR API failed: ${ocrResponse.status} ${ocrResponse.statusText}`
        );
      }

      const ocrData = await ocrResponse.json();
      const ocrResult = ocrData.data;

      console.log(
        `[Scrape] Extracted text preview:`,
        ocrResult.markdown.substring(0, 200) + "..."
      );
      console.log(
        `[Scrape] Extracted metadata - Author: ${
          ocrResult.author || "not found"
        }, Title: ${ocrResult.title || "not found"}`
      );

      // Update the row with OCR result, including extracted metadata
      await supabase
        .from("research_sources")
        .update({
          full_content: ocrResult.markdown,
          content_fetch_status: "success",
          fetch_completed_at: new Date().toISOString(),
          content_word_count: ocrResult.wordCount,
          content_char_count: ocrResult.markdown.length,

          // Basic metadata
          author: ocrResult.author || null,
          title: ocrResult.title || pdfTitle || "PDF Document",

          // Academic metadata
          journal_name: ocrResult.journalName || null,
          volume: ocrResult.volume || null,
          issue: ocrResult.issue || null,
          pages: ocrResult.pages || null,
          doi: ocrResult.doi || null,
          year: ocrResult.year || null,
          publisher: ocrResult.publisher || null,
          publication_type: ocrResult.publicationType || 'web',
          isbn: ocrResult.isbn || null,
          conference_name: ocrResult.conferenceName || null,
          editors: ocrResult.editors || null,
          authors_structured: ocrResult.authorsStructured ? JSON.stringify(ocrResult.authorsStructured) : null,
        } as any)
        .eq("id", sourceId);

      console.log(
        `[Scrape] OCR successful: ${ocrResult.wordCount} words extracted`
      );
      return { sourceId };
    } catch (ocrError: unknown) {
      const ocrErrMsg =
        ocrError instanceof Error ? ocrError.message : String(ocrError);
      console.error("[Scrape] OCR failed:", ocrErrMsg);

      // Update the row with error status
      await supabase
        .from("research_sources")
        .update({
          content_fetch_status: "failed",
          fetch_completed_at: new Date().toISOString(),
          fetch_error: ocrErrMsg,
        } as any)
        .eq("id", sourceId);

      return { sourceId, error: ocrErrMsg };
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[Scrape] PDF processing failed:", errMsg);
    return { error: errMsg };
  }
}

// Count words in text
function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

// Handle POST requests for scraping
export async function POST(request: NextRequest) {
  console.log("[Scrape] Starting scrape request");

  try {
    const body: ScrapeRequest = await request.json();
    const {
      url,
      projectId,
      include_images = false,
      include_links = true,
      max_text_length = 10000,
    } = body;

    // Validate input
    if (!url || !projectId) {
      return NextResponse.json(
        { error: "URL and projectId are required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    console.log(`[Scrape] Scraping URL: ${url}`);

    // Call Scrala API
    const scralaResponse = await fetch("http://localhost:8000/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        url,
        include_images,
        include_links,
        max_text_length,
      }),
    });

    if (!scralaResponse.ok) {
      const errorData = await scralaResponse.json().catch(() => ({}));
      const errorMsg = errorData.detail || `HTTP ${scralaResponse.status}`;
      console.error("[Scrape] Scrala API error:", errorMsg);
      return NextResponse.json(
        { error: `Scraping failed: ${errorMsg}` },
        { status: scralaResponse.status }
      );
    }

    const scralaData: ScralaResponse = await scralaResponse.json();
    console.log(`[Scrape] Successfully scraped: ${scralaData.title || url}`);
    console.log(`[Scrape] Found ${scralaData.pdfs?.length || 0} PDFs`);

    const supabase = await createServerSupabaseClient();

    // Create main source from scraped content
    const title = scralaData.title || url;
    const excerpt = scralaData.meta_description
      ? scralaData.meta_description.substring(0, 500)
      : scralaData.text_content.substring(0, 500);
    const wordCount = countWords(scralaData.text_content);

    const { data: mainSource, error: mainSourceError } = await supabase
      .from("research_sources")
      .insert([
        {
          project_id: projectId,
          title,
          url: scralaData.url,
          excerpt,
          full_content: scralaData.text_content,
          source_type: "web",
          is_selected: true,
          content_fetch_status: "success",
          fetch_attempted_at: new Date().toISOString(),
          fetch_completed_at: new Date().toISOString(),
          content_word_count: wordCount,
          content_char_count: scralaData.text_content.length,
        } as any,
      ])
      .select()
      .single();

    if (mainSourceError || !mainSource) {
      console.error("[Scrape] Failed to create main source:", mainSourceError);
      return NextResponse.json(
        {
          error: `Failed to create source: ${
            mainSourceError?.message || "Unknown error"
          }`,
        },
        { status: 500 }
      );
    }

    console.log(`[Scrape] Created main source: ${mainSource.id}`);

    // Process PDFs if any
    const pdfSourceIds: string[] = [];
    const pdfErrors: Array<{ url: string; error: string }> = [];

    if (scralaData.pdfs && scralaData.pdfs.length > 0) {
      console.log(`[Scrape] Processing ${scralaData.pdfs.length} PDFs...`);

      for (const pdf of scralaData.pdfs) {
        try {
          const result = await processPdfFromUrl(
            projectId,
            pdf.url,
            pdf.title || pdf.text || "PDF Document"
          );

          if (result.sourceId) {
            pdfSourceIds.push(result.sourceId);
          }

          if (result.error) {
            pdfErrors.push({ url: pdf.url, error: result.error });
          }
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : String(error);
          console.error(`[Scrape] Failed to process PDF ${pdf.url}:`, errMsg);
          pdfErrors.push({ url: pdf.url, error: errMsg });
        }
      }

      console.log(
        `[Scrape] Processed ${pdfSourceIds.length}/${scralaData.pdfs.length} PDFs successfully`
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      mainSourceId: mainSource.id,
      pdfSourceIds,
      pdfErrors: pdfErrors.length > 0 ? pdfErrors : undefined,
      totalPdfsFound: scralaData.pdfs?.length || 0,
      totalPdfsProcessed: pdfSourceIds.length,
      scrapedData: {
        title: scralaData.title,
        url: scralaData.url,
        wordCount,
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[Scrape] Scrape request failed:", errMsg);

    // Check if it's a connection error to Scrala API
    if (errMsg.includes("ECONNREFUSED") || errMsg.includes("fetch failed")) {
      return NextResponse.json(
        {
          error:
            "Could not connect to scraping service. Make sure it's running on http://localhost:8000",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: `Scraping failed: ${errMsg}` },
      { status: 500 }
    );
  }
}



