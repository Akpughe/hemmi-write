"use client";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * Export HTML content to DOCX format via server API
 * The server handles the conversion since html-to-docx requires Node.js Buffer
 */
export async function exportToDocx(
  htmlContent: string,
  filename: string = "document"
): Promise<void> {
  try {
    const response = await fetch("/api/export/docx", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ htmlContent, filename }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate DOCX");
    }

    // Get the blob from response
    const blob = await response.blob();

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("DOCX export error:", error);
    throw new Error("Failed to export document as DOCX");
  }
}

/**
 * Export HTML content to PDF format
 * Uses html2canvas for accurate visual rendering
 * Renders in an isolated iframe to avoid CSS variable inheritance issues
 */
export async function exportToPdf(
  htmlContent: string,
  filename: string = "document"
): Promise<void> {
  let iframe: HTMLIFrameElement | null = null;
  
  try {
    // Create an isolated iframe to avoid inheriting CSS variables with unsupported color functions
    iframe = document.createElement("iframe");
    iframe.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: 794px;
      height: 1123px;
      border: none;
    `;
    document.body.appendChild(iframe);

    // Wait for iframe to be ready
    await new Promise((resolve) => {
      if (iframe!.contentDocument) {
        resolve(undefined);
      } else {
        iframe!.onload = () => resolve(undefined);
      }
    });

    const iframeDoc = iframe.contentDocument!;
    
    // Write a completely fresh HTML document with only safe colors
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              width: 210mm;
              padding: 20mm;
              background-color: #ffffff;
              font-family: 'Times New Roman', Times, serif;
              font-size: 12pt;
              line-height: 1.6;
              color: #000000;
            }
            h1, h2, h3, h4, h5, h6 {
              color: #000000;
              font-weight: bold;
              margin: 1em 0 0.5em 0;
            }
            h1 { font-size: 24pt; }
            h2 { font-size: 18pt; }
            h3 { font-size: 14pt; }
            h4 { font-size: 12pt; }
            p {
              margin-bottom: 12pt;
              color: #000000;
            }
            a {
              color: #0066cc;
              text-decoration: underline;
            }
            ul, ol {
              margin-left: 24pt;
              margin-bottom: 12pt;
            }
            li {
              margin-bottom: 6pt;
              color: #000000;
            }
            blockquote {
              margin: 12pt 0;
              padding-left: 12pt;
              border-left: 3pt solid #cccccc;
              background-color: #f5f5f5;
              font-style: italic;
              color: #333333;
            }
            code {
              background-color: #f5f5f5;
              color: #333333;
              padding: 2pt 4pt;
              border-radius: 3pt;
              font-family: monospace;
            }
            pre {
              background-color: #f5f5f5;
              color: #333333;
              padding: 12pt;
              border-radius: 4pt;
              overflow-x: auto;
              margin-bottom: 12pt;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin-bottom: 12pt;
              border: 1pt solid #cccccc;
            }
            th, td {
              border: 1pt solid #cccccc;
              padding: 6pt;
              color: #000000;
            }
            th {
              background-color: #f0f0f0;
              font-weight: bold;
            }
            img {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `);
    iframeDoc.close();

    // Wait for content to render
    await new Promise((resolve) => setTimeout(resolve, 100));

    const canvas = await html2canvas(iframeDoc.body, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 794,
      windowHeight: 1123,
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF("p", "mm", "a4");
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error("PDF export error:", error);
    throw new Error(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (iframe && iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  }
}

// Alias for backwards compatibility
export const exportToPdfFromHtml = exportToPdf;
