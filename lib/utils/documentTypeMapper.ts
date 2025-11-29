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
    thesis: DocumentType.ASSIGNMENT, // Map thesis to ASSIGNMENT
    assignment: DocumentType.ASSIGNMENT,
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
    [DocumentType.ASSIGNMENT]: "assignment",
  };

  return mapping[enumType] || "essay";
}

/**
 * Maps UI academic level strings to AcademicLevel enum values
 * UI uses: "high-school" | "undergraduate" | "graduate" | "doctoral" | "professional"
 * API uses: UNDERGRADUATE | GRADUATE | POSTGRADUATE
 */
export function mapUIAcademicLevelToEnum(
  uiLevel?: string
): AcademicLevel | undefined {
  if (!uiLevel) return undefined;

  const mapping: Record<string, AcademicLevel> = {
    "high-school": AcademicLevel.UNDERGRADUATE,
    undergraduate: AcademicLevel.UNDERGRADUATE,
    graduate: AcademicLevel.GRADUATE,
    doctoral: AcademicLevel.POSTGRADUATE,
    postgraduate: AcademicLevel.POSTGRADUATE,
    professional: AcademicLevel.GRADUATE,
  };

  const mapped = mapping[uiLevel.toLowerCase()];

  if (!mapped) {
    console.warn(
      `Unknown academic level: "${uiLevel}", defaulting to GRADUATE`
    );
    return AcademicLevel.GRADUATE;
  }

  return mapped;
}

/**
 * Maps UI writing style strings to WritingStyle enum values
 * UI uses: "analytical" | "argumentative" | "descriptive" | "expository" | "narrative"
 * API uses: CHAPTER_BASED | SECTION_BASED | NARRATIVE | TECHNICAL
 */
export function mapUIWritingStyleToEnum(
  uiStyle?: string
): WritingStyle | undefined {
  if (!uiStyle) return undefined;

  const mapping: Record<string, WritingStyle> = {
    analytical: WritingStyle.CHAPTER_BASED,
    argumentative: WritingStyle.SECTION_BASED,
    descriptive: WritingStyle.NARRATIVE,
    expository: WritingStyle.TECHNICAL,
    narrative: WritingStyle.NARRATIVE,
    "chapter-based": WritingStyle.CHAPTER_BASED,
    "section-based": WritingStyle.SECTION_BASED,
    technical: WritingStyle.TECHNICAL,
  };

  const mapped = mapping[uiStyle.toLowerCase()];

  if (!mapped) {
    console.warn(
      `Unknown writing style: "${uiStyle}", defaulting to CHAPTER_BASED`
    );
    return WritingStyle.CHAPTER_BASED;
  }

  return mapped;
}
