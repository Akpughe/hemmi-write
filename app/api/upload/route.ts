import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Configure route to accept larger uploads
export const maxDuration = 300; // 5 minutes timeout for large uploads

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

// Process PDF OCR and store in database
async function processPdfOcr(
  projectId: string,
  fileName: string,
  fileUrl: string
): Promise<{ sourceId?: string; ocrError?: string }> {
  console.log(`[Upload] Processing uploaded PDF: ${fileName}`);
  const supabase = await createServerSupabaseClient();

  // Insert research_sources row
  const { data: insertedRow, error: insertError } = await supabase
    .from("research_sources")
    .insert([
      {
        project_id: projectId,
        title: fileName,
        url: fileUrl,
        excerpt: "Uploaded PDF",
        source_type: "web",
        is_selected: true,
        content_fetch_status: "fetching",
        fetch_attempted_at: new Date().toISOString(),
      } as any,
    ])
    .select()
    .single();

  if (insertError) {
    console.error(
      "[Upload] Failed to create research_sources row:",
      insertError
    );
    return { ocrError: `Failed to create source row: ${insertError.message}` };
  }

  if (!insertedRow) {
    return { ocrError: "Failed to create research_sources row" };
  }

  const sourceId = insertedRow.id;
  console.log(`[Upload] Created research_sources row: ${sourceId}`);

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

    console.log("ocrResult", ocrResult);
    console.log(
      `[Upload] Extracted text preview:`,
      ocrResult.markdown.substring(0, 500) + "..."
    );
    console.log(
      `[Upload] Extracted metadata - Author: ${
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
        title: ocrResult.title || fileName,

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
      `[Upload] OCR successful: ${ocrResult.wordCount} words extracted`
    );
    return { sourceId };
  } catch (error_: unknown) {
    const ocrErrMsg = error_ instanceof Error ? error_.message : String(error_);
    console.error("[Upload] OCR failed:", ocrErrMsg);

    // Update the row with error status
    await supabase
      .from("research_sources")
      .update({
        content_fetch_status: "failed",
        fetch_completed_at: new Date().toISOString(),
        fetch_error: ocrErrMsg,
      } as any)
      .eq("id", sourceId);

    return { sourceId, ocrError: ocrErrMsg };
  }
}

// Handle POST requests for direct upload
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uniqueFilename = generateUniqueFilename(file.name);

    // Set up the S3 upload parameters
    const params = {
      Bucket: "nutonai",
      Key: uniqueFilename,
      Body: buffer,
      ContentType: file.type,
    };

    // Upload to S3
    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    const fileUrl = `https://nutonai.s3.amazonaws.com/${uniqueFilename}`;

    // If projectId is provided and it's a PDF, create a research_sources row and OCR
    let sourceId: string | undefined;
    let ocrError: string | undefined;

    if (projectId && file.type === "application/pdf") {
      try {
        const result = await processPdfOcr(projectId, file.name, fileUrl);
        sourceId = result.sourceId;
        ocrError = result.ocrError;
      } catch (dbError: unknown) {
        const dbErrMsg =
          dbError instanceof Error ? dbError.message : String(dbError);
        console.error("[Upload] Database error:", dbErrMsg);
        ocrError = dbErrMsg;
      }
    }

    // Return the upload result
    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename: uniqueFilename,
      size: file.size,
      sourceId,
      ocrError: ocrError || undefined,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// Handle GET requests for presigned URL generation
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filename = searchParams.get("filename");
    const contentType = searchParams.get("contentType");

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Filename and content type are required" },
        { status: 400 }
      );
    }

    const uniqueFilename = generateUniqueFilename(filename);

    // Create command for generating presigned URL
    const command = new PutObjectCommand({
      Bucket: "nutonai",
      Key: uniqueFilename,
      ContentType: contentType,
    });

    // Generate a presigned URL that expires in 15 minutes
    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 900,
    });

    return NextResponse.json({
      success: true,
      presignedUrl,
      key: uniqueFilename,
    });
  } catch (error) {
    console.error("Presigned URL generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate presigned URL" },
      { status: 500 }
    );
  }
}
