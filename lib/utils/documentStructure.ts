import {
  DocumentType,
  DOCUMENT_TYPE_CONFIGS,
  AcademicLevel,
  WritingStyle,
  ACADEMIC_LEVEL_CONFIGS,
  WRITING_STYLE_CONFIGS,
} from "@/lib/types/document";
import { getCompactHumanizationGuidance } from "@/lib/config/humanizationGuidelines";

// Get the structure outline for a specific document type
export function getDocumentStructure(documentType: DocumentType): string[] {
  return DOCUMENT_TYPE_CONFIGS[documentType].structure;
}

// Generate a prompt template for the AI based on document type
export function generateDocumentPrompt(
  documentType: DocumentType,
  topic: string,
  instructions: string | undefined,
  wordCount: number,
  sourcesText: string,
  academicLevel?: AcademicLevel,
  writingStyle?: WritingStyle
): string {
  const config = DOCUMENT_TYPE_CONFIGS[documentType];
  const structure = config.structure.join(", ");

  let basePrompt = "";

  switch (documentType) {
    case DocumentType.RESEARCH_PAPER:
      // Enhanced prompts for research papers with academic level and writing style
      if (academicLevel && writingStyle) {
        const levelConfig = ACADEMIC_LEVEL_CONFIGS[academicLevel];
        const styleConfig = WRITING_STYLE_CONFIGS[writingStyle];

        basePrompt = `Write a comprehensive research paper on "${topic}" at the ${
          levelConfig.label
        } level.

ACADEMIC LEVEL REQUIREMENTS:
- Writing Depth: ${levelConfig.technicalDepth}
- Analysis Style: ${levelConfig.analysisStyle}
- Citations per section: ${levelConfig.citationsPerSection}

WRITING STYLE: ${styleConfig.label}
- ${styleConfig.description}
- Heading format: ${styleConfig.headingFormat}

TARGET WORD COUNT: ${wordCount} words

CRITICAL REQUIREMENTS FOR ${levelConfig.label.toUpperCase()} LEVEL:`;

        // Add level-specific requirements
        switch (academicLevel) {
          case AcademicLevel.UNDERGRADUATE:
            basePrompt += `
1. Explain concepts clearly with context and definitions
2. Define specialized terms when introduced
3. Cite 2-3 sources for each major claim
4. Show basic critical thinking by comparing sources
5. Use clear, structured paragraphs`;
            break;

          case AcademicLevel.GRADUATE:
            basePrompt += `
1. Synthesize multiple sources to build arguments
2. Critically analyze methodologies and findings
3. Use 3-5+ citations per major point
4. Compare theoretical frameworks across sources
5. Identify gaps, limitations, and contradictions in literature
6. Demonstrate original insight through synthesis
7. Write longer, more comprehensive sections (300-500 words per section)
8. Use specialized terminology appropriately`;
            break;

          case AcademicLevel.POSTGRADUATE:
            basePrompt += `
1. Exhaustive engagement with literature (5-8+ citations per section)
2. Critical synthesis across multiple theoretical perspectives
3. Challenge assumptions and propose novel interpretations
4. Rigorous methodological justification
5. Identify specific gaps for future research
6. Demonstrate deep domain expertise through terminology
7. Write detailed, comprehensive sections (500-800 words per section)
8. Original analytical contributions throughout`;
            break;
        }

        // Add heading format guidance based on writing style
        basePrompt += `

HEADING FORMAT (${styleConfig.label}):`;

        switch (writingStyle) {
          case WritingStyle.NARRATIVE:
            basePrompt += `
Use minimal headings. Let the content flow naturally with subtle section breaks.`;
            break;
          case WritingStyle.TECHNICAL:
            basePrompt += `
Use numbered sections (1.0, 1.1, 1.2, 2.0, 2.1) like technical documentation.`;
            break;
        }

        basePrompt += `

AVAILABLE SOURCES:
${sourcesText}

CITATION STRATEGY:
- Cite sources using [1], [2], [3] format
- Use multiple citations for complex points: [1][2][3]
- Cite after every major claim, statistic, or argument
- Don't just cite at section ends - integrate throughout
- Compare sources: "While [1] argues X, [2] suggests Y, indicating..."
- Use sources to support analysis, not replace it

${instructions ? `ADDITIONAL INSTRUCTIONS: ${instructions}\n` : ""}

Write the complete research paper now with ${
          levelConfig.label
        } level depth and rigor:`;
      } else {
        // Fallback to original prompt if level/style not provided
        basePrompt = `You are an expert academic writer. Write a comprehensive research paper on the topic: "${topic}".

Structure your paper with the following sections: ${structure}.

Requirements:
- Target word count: ${wordCount} words (±10% tolerance)
- Acceptable range: ${Math.floor(wordCount * 0.9)}-${Math.ceil(wordCount * 1.1)} words
- Expand analysis depth to reach target - add more evidence and discussion
- Maintain quality - no padding or fluff
- Use formal academic language and objective tone
- Include an abstract (150-250 words) summarizing the key findings
- Present research methodology clearly
- Support all claims with citations using [1], [2], [3] format referring to the sources provided
- Analyze results objectively
- Discuss implications and limitations
- Use ${config.citationStyle} citation style

Sources to reference:
${sourcesText}

${instructions ? `Additional instructions: ${instructions}\n` : ""}
Write the complete research paper now:`;
      }
      break;

    case DocumentType.ESSAY:
      basePrompt = `You are an expert essay writer. Write a well-structured analytical essay on the topic: "${topic}".

Structure your essay with: ${structure}.

Requirements:
- Target word count: ${wordCount} words (±10% tolerance)
- Acceptable range: ${Math.floor(wordCount * 0.9)}-${Math.ceil(wordCount * 1.1)} words
- Expand analysis depth to reach target - add more evidence and discussion
- Maintain quality - no padding or fluff
- Include a clear thesis statement in the introduction
- Develop 3-5 body paragraphs with topic sentences
- Use evidence from sources to support arguments with citations [1], [2], [3]
- Maintain a coherent argumentative flow
- Conclude by reinforcing the thesis and main points
- Use ${config.citationStyle} citation style

Sources to reference:
${sourcesText}

${instructions ? `Additional instructions: ${instructions}\n` : ""}
Write the complete essay now:`;
      break;

    case DocumentType.REPORT:
      basePrompt = `You are an expert report writer. Write a structured professional report on the topic: "${topic}".

Structure your report with: ${structure}.

Requirements:
- Target word count: ${wordCount} words (±10% tolerance)
- Acceptable range: ${Math.floor(wordCount * 0.9)}-${Math.ceil(wordCount * 1.1)} words
- Expand analysis depth to reach target - add more evidence and discussion
- Maintain quality - no padding or fluff
- Begin with an executive summary (200-300 words)
- Use clear section headings and subheadings
- Present findings objectively with data and evidence
- Use bullet points and lists where appropriate
- Include recommendations based on findings
- Cite sources using [1], [2], [3] format
- Use ${config.citationStyle} citation style

Sources to reference:
${sourcesText}

${instructions ? `Additional instructions: ${instructions}\n` : ""}
Write the complete report now:`;
      break;

    default:
      basePrompt = `Write a comprehensive document on the topic: "${topic}".

Target word count: ${wordCount} words (±10% tolerance)
Acceptable range: ${Math.floor(wordCount * 0.9)}-${Math.ceil(wordCount * 1.1)} words
Expand analysis depth to reach target - add more evidence and discussion
Maintain quality - no padding or fluff

Use the following sources and cite them with [1], [2], [3] format:
${sourcesText}

${instructions ? `Additional instructions: ${instructions}\n` : ""}
Write the document now:`;
  }

  return basePrompt;
}

// Format sources for inclusion in the prompt
export function formatSourcesForPrompt(
  sources: Array<{
    title: string;
    excerpt: string;
    fullContent?: string;
    author?: string;
    wordCount?: number;
  }>,
  options?: {
    preferFullContent?: boolean;
    maxWordsPerSource?: number;
  }
): string {
  const opts = {
    preferFullContent: true,
    maxWordsPerSource: 400,
    ...options,
  };

  return sources
    .map((source, index) => {
      const authorInfo = source.author ? ` by ${source.author}` : "";

      // Prioritize full content if available
      let content: string;
      let contentLabel: string;

      if (opts.preferFullContent && source.fullContent) {
        content = truncateToWords(source.fullContent, opts.maxWordsPerSource);
        contentLabel = `Content (${source.wordCount || 'full'} words)`;
      } else {
        content = source.excerpt;
        contentLabel = "Excerpt";
      }

      return `[${index + 1}] ${source.title}${authorInfo}
${contentLabel}: ${content}`;
    })
    .join("\n\n");
}

// Helper function for smart truncation
function truncateToWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;

  const truncated = words.slice(0, maxWords).join(' ');
  const lastSentence = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );

  if (lastSentence > truncated.length * 0.8) {
    return truncated.substring(0, lastSentence + 1);
  }

  return truncated + '...';
}

// Get word count recommendations as a string
export function getWordCountGuidance(documentType: DocumentType): string {
  const config = DOCUMENT_TYPE_CONFIGS[documentType];
  return `${config.suggestedWordCountMin}-${config.suggestedWordCountMax} words`;
}

// Calculate default word count for a document type (midpoint of range)
export function getDefaultWordCount(documentType: DocumentType): number {
  const config = DOCUMENT_TYPE_CONFIGS[documentType];
  return Math.floor(
    (config.suggestedWordCountMin + config.suggestedWordCountMax) / 2
  );
}

// Validate word count is within reasonable bounds
export function validateWordCount(
  wordCount: number,
  min: number = 500,
  max: number = 15000
): boolean {
  return wordCount >= min && wordCount <= max;
}

// Get system message for the AI based on document type and academic level (for research papers)
export function getSystemMessage(
  documentType: DocumentType,
  academicLevel?: AcademicLevel
): string {
  const config = DOCUMENT_TYPE_CONFIGS[documentType];

  // Base message for all types
  let baseMessage = `You are a professional academic and technical writer specializing in ${config.label.toLowerCase()}s.`;

  // Only apply level-specific instructions for research papers
  if (documentType === DocumentType.RESEARCH_PAPER && academicLevel) {
    const levelConfig = ACADEMIC_LEVEL_CONFIGS[academicLevel];
    baseMessage = `You are a professional academic writer specializing in research papers at the ${levelConfig.label} level.`;

    // Add level-specific writing guidelines
    switch (academicLevel) {
      case AcademicLevel.UNDERGRADUATE:
        baseMessage += `

Your writing style for undergraduate level:
- Clear explanations of concepts with proper context and definitions
- Direct citation of sources for key claims
- Basic critical analysis comparing different viewpoints
- ${levelConfig.citationsPerSection} citations per major section
- Accessible language with some specialized terminology
- Focus on demonstrating understanding of material
- Support claims with evidence from credible sources
- Compare different perspectives when appropriate`;
        break;

      case AcademicLevel.GRADUATE:
        baseMessage += `

Your writing style for graduate (Masters) level:
- Advanced analysis synthesizing multiple sources
- Critical evaluation of different theoretical perspectives
- ${levelConfig.citationsPerSection} citations per major point
- Specialized terminology used appropriately and precisely
- Integration of both primary and secondary sources
- Demonstrate critical thinking and original synthesis
- Compare and contrast methodologies and findings across sources
- Identify gaps and limitations in existing research
- Build sophisticated arguments supported by multiple sources
- Write comprehensive sections (300-500 words minimum per major section)`;
        break;

      case AcademicLevel.POSTGRADUATE:
        baseMessage += `

Your writing style for postgraduate (PhD) level:
- Exhaustive literature review showing deep domain knowledge
- Original critical analysis and theoretical contributions
- ${levelConfig.citationsPerSection} or more citations per major point
- Sophisticated use of field-specific specialized terminology
- Rigorous methodology with detailed justification
- Novel insights and identification of research gaps
- Critical synthesis across multiple theoretical frameworks
- Challenge assumptions and propose new directions
- Demonstrate expert-level understanding of the field
- Write detailed, comprehensive sections (500-800 words minimum per major section)
- Engage with cutting-edge research and emerging debates`;
        break;
    }

    baseMessage += `

Evidence-based writing requirements:
- Support ALL major claims with citations [1], [2], [3]
- Cite multiple sources for complex or contested points
- Use sources to build arguments, not just list facts
- Critically analyze what sources say, don't just summarize
- Compare different sources' perspectives and identify patterns
- Follows ${config.citationStyle} citation style guidelines

When citing sources, always use numbered markers like [1], [2], [3] that correspond to the sources provided. These markers should be placed immediately after the relevant statement or claim.

Structure your research paper with these sections: ${config.structure.join(
      ", "
    )}.`;
  } else {
    // Standard message for other document types
    baseMessage += `

Your writing style is:
- Clear and well-structured
- Appropriately formal and academic
- Evidence-based with proper citations
- Engaging yet professional
- Follows ${config.citationStyle} citation style guidelines

When citing sources, always use numbered markers like [1], [2], [3] that correspond to the sources provided. These markers should be placed immediately after the relevant statement or claim.

Structure your document according to standard ${config.label.toLowerCase()} format with these sections: ${config.structure.join(
      ", "
    )}.`;
  }

  baseMessage += `\n\n${getCompactHumanizationGuidance(academicLevel || AcademicLevel.UNDERGRADUATE)}`;

  return baseMessage;
}
