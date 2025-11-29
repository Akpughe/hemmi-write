import {
  DocumentStructure,
  TableOfContents,
  TOCItem,
  WritingStyle,
  WRITING_STYLE_CONFIGS,
} from "@/lib/types/document";

/**
 * Generate table of contents from document structure
 */
export function generateTableOfContents(
  structure: DocumentStructure,
  writingStyle: WritingStyle
): TableOfContents {
  const items: TOCItem[] = [];

  structure.sections.forEach((section, index) => {
    let title = section.heading;
    let sectionNumber = "";

    // Format based on writing style
    switch (writingStyle) {
      case WritingStyle.TECHNICAL:
        title = section.heading;
        sectionNumber = `${index + 1}.0`;
        break;

      case WritingStyle.NARRATIVE:
        // Minimal numbering for narrative style
        title = section.heading;
        break;
    }

    // Add main section/chapter
    items.push({
      level: 1,
      title,
      sectionNumber:
        writingStyle !== WritingStyle.NARRATIVE ? sectionNumber : undefined,
    });

    // Add subsections from keyPoints (level 2)
    if (section.keyPoints && section.keyPoints.length > 0) {
      section.keyPoints.forEach((keyPoint, subIndex) => {
        // Remove any existing numbering from keyPoint (e.g., "1.1 Title" -> "Title")
        const cleanedTitle = keyPoint
          .replace(/^\d+\.\d+\s+/, "")
          .replace(/^\d+\.\s+/, "");

        let subSectionNumber = "";

        switch (writingStyle) {
          case WritingStyle.TECHNICAL:
            subSectionNumber = `${index + 1}.${subIndex + 1}`;
            break;

          case WritingStyle.NARRATIVE:
            // No numbering for narrative style
            break;
          default: // For any other writing style, use the technical numbering
            subSectionNumber = `${index + 1}.${subIndex + 1}`;
            break;
        }

        items.push({
          level: 2,
          title: cleanedTitle,
          sectionNumber:
            writingStyle !== WritingStyle.NARRATIVE
              ? subSectionNumber
              : undefined,
        });
      });
    }
  });

  return { items };
}

/**
 * Format table of contents for inclusion in document
 */
export function formatTOCForDocument(
  toc: TableOfContents,
  writingStyle: WritingStyle
): string {
  let output = "\n## Table of Contents\n\n";

  toc.items.forEach((item) => {
    const indent = "  ".repeat((item.level || 1) - 1);
    const number = item.sectionNumber ? `${item.sectionNumber}. ` : "";
    output += `${indent}${number}${item.title}\n`;
  });

  return output + "\n";
}

/**
 * Generate and format complete TOC string
 */
export function generateTOCString(
  structure: DocumentStructure,
  writingStyle: WritingStyle
): string {
  const toc = generateTableOfContents(structure, writingStyle);
  return formatTOCForDocument(toc, writingStyle);
}
