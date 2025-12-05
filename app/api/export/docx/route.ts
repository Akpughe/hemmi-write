import { NextRequest, NextResponse } from "next/server";
import HTMLtoDOCX from "html-to-docx";

export async function POST(request: NextRequest) {
  try {
    const { htmlContent, filename } = await request.json();

    if (!htmlContent) {
      return NextResponse.json(
        { error: "HTML content is required" },
        { status: 400 }
      );
    }

    // Wrap content with styling for better formatting
    const styledHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #000000;
          }
          h1 { font-size: 24pt; font-weight: bold; margin-top: 24pt; margin-bottom: 12pt; }
          h2 { font-size: 18pt; font-weight: bold; margin-top: 18pt; margin-bottom: 10pt; }
          h3 { font-size: 14pt; font-weight: bold; margin-top: 14pt; margin-bottom: 8pt; }
          h4 { font-size: 12pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; }
          p { margin-bottom: 12pt; text-align: justify; }
          ul, ol { margin-left: 24pt; margin-bottom: 12pt; }
          li { margin-bottom: 6pt; }
          blockquote {
            margin-left: 24pt;
            margin-right: 24pt;
            font-style: italic;
            border-left: 3pt solid #cccccc;
            padding-left: 12pt;
          }
          table { border-collapse: collapse; width: 100%; margin-bottom: 12pt; }
          th, td { border: 1pt solid #000000; padding: 6pt; }
          th { background-color: #f0f0f0; font-weight: bold; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    // HTMLtoDOCX returns a Buffer in Node.js environment (types say Blob but runtime is Buffer)
    const docxBuffer = await HTMLtoDOCX(styledHtml, null, {
      table: { row: { cantSplit: true } },
      footer: false,
      pageNumber: false,
    }) as unknown as Buffer;

    return new NextResponse(new Uint8Array(docxBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename || "document"}.docx"`,
      },
    });
  } catch (error) {
    console.error("DOCX export error:", error);
    return NextResponse.json(
      { error: "Failed to generate DOCX" },
      { status: 500 }
    );
  }
}
