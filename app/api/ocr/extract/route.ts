import { NextRequest, NextResponse } from "next/server";
import { ocrDocumentUrl } from "@/lib/services/mistralOcrService";

// Configure route to accept longer processing times for OCR
export const maxDuration = 300; // 5 minutes timeout for large documents

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentUrl } = body;

    if (!documentUrl) {
      return NextResponse.json(
        { error: "documentUrl is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(documentUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid documentUrl format" },
        { status: 400 }
      );
    }

    console.log(`[OCR API] Processing document: ${documentUrl}`);

    const ocrResult = await ocrDocumentUrl(documentUrl);

    console.log(
      `[OCR API] Successfully extracted ${ocrResult.wordCount} words from ${documentUrl}`
    );
    console.log(
      `[OCR API] Text preview:`,
      ocrResult.markdown.substring(0, 200) + "..."
    );

    return NextResponse.json({
      success: true,
      data: ocrResult,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[OCR API] Extraction failed:", errorMessage);

    return NextResponse.json(
      {
        error: "OCR extraction failed",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
