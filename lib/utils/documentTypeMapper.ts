import {
  DocumentType,
  AcademicLevel,
  WritingStyle,
} from "@/lib/types/document";

/**
 * Maps UI document type strings to DocumentType enum values
 * UI uses kebab-case (e.g., "research-paper")
 * API uses uppercase snake-case (e.g., "RESEARCH_PAPER")
 */
export function mapUIDocumentTypeToEnum(uiType: string): DocumentType {
  const mapping: Record<string, DocumentType> = {
    "research-paper": DocumentType.RESEARCH_PAPER,
    essay: DocumentType.ESSAY,
    report: DocumentType.REPORT,
    thesis: DocumentType.RESEARCH_PAPER, // Map thesis to RESEARCH_PAPER
  };

  const mapped = mapping[uiType.toLowerCase()];

  if (!mapped) {
    throw new Error(
      `Invalid document type: "${uiType}". Valid types are: ${Object.keys(
        mapping
      ).join(", ")}`
    );
  }

  return mapped;
}

/**
 * Maps DocumentType enum values to UI strings
 */
export function mapEnumToUIDocumentType(enumType: DocumentType): string {
  const mapping: Record<DocumentType, string> = {
    [DocumentType.RESEARCH_PAPER]: "research-paper",
    [DocumentType.ESSAY]: "essay",
    [DocumentType.REPORT]: "report",
  };

  return mapping[enumType] || "research-paper";
}

/**
 * Maps UI academic level strings to AcademicLevel enum values
 * UI uses: "high-school" | "undergraduate" | "graduate" | "doctoral" | "professional"
 * API uses: UNDERGRADUATE | GRADUATE | POSTGRADUATE
 */
export function mapUIAcademicLevelToEnum(uiLevel: string): AcademicLevel {
  const mapping: Record<string, AcademicLevel> = {
    undergraduate: AcademicLevel.UNDERGRADUATE,
    graduate: AcademicLevel.GRADUATE,
    postgraduate: AcademicLevel.POSTGRADUATE,
    phd: AcademicLevel.POSTGRADUATE,
  };

  return mapping[uiLevel.toLowerCase()] || AcademicLevel.UNDERGRADUATE;
}

export function mapEnumAcademicLevelToUI(level: AcademicLevel): string {
  const mapping: Record<AcademicLevel, string> = {
    [AcademicLevel.UNDERGRADUATE]: "Undergraduate",
    [AcademicLevel.GRADUATE]: "Graduate",
    [AcademicLevel.POSTGRADUATE]: "Postgraduate",
    [AcademicLevel.PROFESSIONAL]: "Professional",
  };

  return mapping[level] || "Undergraduate";
}

/**
 * Maps UI writing style strings to WritingStyle enum values
 * UI uses: "analytical" | "argumentative" | "descriptive" | "expository" | "narrative"
 * API uses: CHAPTER_BASED | SECTION_BASED | NARRATIVE | TECHNICAL
 */
export function mapUIWritingStyleToEnum(uiStyle: string): WritingStyle {
  const mapping: Record<string, WritingStyle> = {
    analytical: WritingStyle.ANALYTICAL,
    argumentative: WritingStyle.ARGUMENTATIVE,
    descriptive: WritingStyle.DESCRIPTIVE,
    expository: WritingStyle.EXPOSITORY,
    narrative: WritingStyle.NARRATIVE,
    technical: WritingStyle.TECHNICAL,
    "chapter-based": WritingStyle.ANALYTICAL,
    "section-based": WritingStyle.DESCRIPTIVE,
  };

  return mapping[uiStyle.toLowerCase()] || WritingStyle.ANALYTICAL;
}

export function mapEnumWritingStyleToUI(style: WritingStyle): string {
  const mapping: Record<WritingStyle, string> = {
    [WritingStyle.ANALYTICAL]: "Analytical",
    [WritingStyle.ARGUMENTATIVE]: "Argumentative",
    [WritingStyle.DESCRIPTIVE]: "Descriptive",
    [WritingStyle.EXPOSITORY]: "Expository",
    [WritingStyle.NARRATIVE]: "Narrative",
    [WritingStyle.TECHNICAL]: "Technical",
  };

  return mapping[style] || "Analytical";
}
