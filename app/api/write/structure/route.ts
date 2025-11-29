import { NextRequest, NextResponse } from "next/server";
import {
  StructureRequest,
  DocumentStructure,
  DOCUMENT_TYPE_CONFIGS,
  DocumentType,
  AcademicLevel,
  WritingStyle,
  ACADEMIC_LEVEL_CONFIGS,
  WRITING_STYLE_CONFIGS,
} from "@/lib/types/document";
import { formatSourcesForPrompt } from "@/lib/utils/documentStructure";
import { generateTableOfContents } from "@/lib/utils/tableOfContents";
import { aiService } from "@/lib/services/aiService";
import { AIProvider, DEFAULT_AI_PROVIDER } from "@/lib/config/aiModels";

function generateStructurePrompt(
  documentType: string,
  topic: string,
  instructions: string,
  wordCount: number,
  sourcesText: string,
  academicLevel?: AcademicLevel,
  writingStyle?: WritingStyle,
  userFeedback?: string
): string {
  const config =
    DOCUMENT_TYPE_CONFIGS[documentType as keyof typeof DOCUMENT_TYPE_CONFIGS];

  // Validate that the config exists
  if (!config) {
    throw new Error(
      `Invalid document type: ${documentType}. Valid types are: ${Object.keys(
        DOCUMENT_TYPE_CONFIGS
      ).join(", ")}`
    );
  }

  const isResearchPaper = documentType === DocumentType.RESEARCH_PAPER;

  let basePrompt = `You are an expert academic writer planning a ${config.label.toLowerCase()}.

TOPIC: "${topic}"
TARGET WORD COUNT: ${wordCount} words
${instructions ? `ADDITIONAL INSTRUCTIONS: ${instructions}` : ""}`;

  // Add level and style guidance for research papers
  if (isResearchPaper && academicLevel && writingStyle) {
    const levelConfig = ACADEMIC_LEVEL_CONFIGS[academicLevel];
    const styleConfig = WRITING_STYLE_CONFIGS[writingStyle];

    basePrompt += `

ACADEMIC LEVEL: ${levelConfig.label}
- Citations per section: ${levelConfig.citationsPerSection}
- Technical depth: ${levelConfig.technicalDepth}
- Analysis style: ${levelConfig.analysisStyle}

WRITING STYLE: ${styleConfig.label}
- ${styleConfig.description}
- Heading format: ${styleConfig.headingFormat}

LEVEL-SPECIFIC REQUIREMENTS:`;

    switch (academicLevel) {
      case AcademicLevel.UNDERGRADUATE:
        basePrompt += `
- Plan for clear explanations with context
- 2-3 citations per major point
- Each chapter should be 2,000-4,000 words`;
        break;
      case AcademicLevel.GRADUATE:
        basePrompt += `
- Plan for critical synthesis of multiple sources
- 3-5 citations per major point
- Each chapter should be 3,000-8,000 words (vary by importance)
- Include comparative analysis across sources`;
        break;
      case AcademicLevel.POSTGRADUATE:
        basePrompt += `
- Plan for exhaustive literature engagement
- 5-8+ citations per major point
- Each chapter should be 4,000-12,000 words (vary by importance)
- Include novel insights and theoretical contributions`;
        break;
    }

    // Add chapter-specific guidance for research papers
    basePrompt += `

CHAPTER STRUCTURE FOR RESEARCH PAPERS:`;

    // Level-specific chapter counts and word distributions
    switch (academicLevel) {
      case AcademicLevel.UNDERGRADUATE:
        basePrompt += `
- Create exactly 6 sections: Abstract + 5 chapters (standard undergraduate format)
- Each chapter should have 3-5 subsections listed as keyPoints
- Include "estimatedWordCount" for each section:
  * Abstract: 250-300 words (single paragraph, no subsections needed)
    (Concise summary of the entire research: background, methods, findings, conclusions)
  * Chapter 1 - Introduction: 2,000-2,500 words
    (Background, Problem Statement, Objectives, Research Questions, Significance, Scope)
  * Chapter 2 - Literature Review: 3,000-4,000 words
    (Theoretical Framework, Conceptual Framework, Review of Related Studies)
  * Chapter 3 - Methodology: 2,000-2,500 words
    (Research Design, Population & Sample, Instruments, Data Collection, Analysis Method)
  * Chapter 4 - Results and Analysis: 3,000-4,000 words
    (Presentation of Data, Discussion of Findings tied to research questions)
  * Chapter 5 - Summary, Conclusion, and Recommendations: 2,000-2,500 words
    (Summary of Findings, Conclusion, Recommendations for practice and future research)
- Total target: ${
          wordCount >= 12000 ? wordCount : "12,000-15,000"
        } words (40-60 pages)
- Each section will be generated separately with full token budget`;
        break;
      case AcademicLevel.GRADUATE:
        basePrompt += `
- Create 7-8 sections: Abstract + 6-7 chapters (standard graduate format)
- Each chapter should have 3-5 subsections listed as keyPoints
- Include "estimatedWordCount" for each section based on importance:
  * Abstract: 300-350 words (single paragraph, no subsections needed)
    (Comprehensive summary: background, objectives, methods, key findings, implications)
  * Introduction: 3,000-4,000 words
  * Literature Review: 5,000-7,000 words (most substantial)
  * Theoretical Framework: 3,000-4,000 words
  * Methodology: 4,000-5,000 words
  * Results: 4,000-6,000 words
  * Discussion: 4,000-6,000 words
  * Conclusion and Recommendations: 3,000-4,000 words
- Total target: ${wordCount >= 25000 ? wordCount : "25,000-35,000"} words
- Each section will be generated separately with full token budget`;
        break;
      case AcademicLevel.POSTGRADUATE:
        basePrompt += `
- Create 9-11 sections: Abstract + 8-10 chapters (comprehensive PhD dissertation format)
- Each chapter should have 3-5 subsections listed as keyPoints
- Include "estimatedWordCount" for each section based on importance:
  * Abstract: 350-400 words (single paragraph, no subsections needed)
    (Detailed summary: research problem, theoretical framework, methodology, findings, contributions, implications)
  * Introduction: 4,000-5,000 words
  * Literature Review: 8,000-12,000 words (most substantial)
  * Theoretical Framework: 5,000-7,000 words
  * Methodology: 6,000-8,000 words
  * Results/Findings: 7,000-10,000 words
  * Discussion: 7,000-10,000 words
  * Implications: 4,000-6,000 words
  * Conclusion and Recommendations: 4,000-6,000 words
  * Additional chapters as needed: 4,000-8,000 words each
- Total target: ${wordCount >= 50000 ? wordCount : "50,000-70,000"} words
- Each section will be generated separately with full token budget`;
        break;
    }
  }

  basePrompt += `

AVAILABLE SOURCES:
${sourcesText}

${
  userFeedback
    ? `USER FEEDBACK ON PREVIOUS STRUCTURE:\n${userFeedback}\n\nPlease revise the structure based on this feedback.\n`
    : ""
}

Create a detailed structure/outline for this ${config.label.toLowerCase()}. Think through your approach and break down exactly what you will write.

Return your response as a JSON object with this exact structure:
{
  "title": "A compelling title for the document",
  "approach": "Explain your overall approach and methodology for writing this (2-3 sentences)",
  "tone": "Describe the writing tone (e.g., formal academic, persuasive, analytical, etc.)",
  "sections": [
    {
      "heading": ${
        isResearchPaper && academicLevel
          ? '"Chapter 1: Introduction"'
          : '"Section heading"'
      },
      "description": "What this ${
        isResearchPaper && academicLevel ? "chapter" : "section"
      } will cover (1-2 sentences)",
      "keyPoints": ["${
        isResearchPaper && academicLevel
          ? "1.1 Subsection title"
          : "Key point 1"
      }", "${
    isResearchPaper && academicLevel ? "1.2 Subsection title" : "Key point 2"
  }", "${
    isResearchPaper && academicLevel ? "1.3 Subsection title" : "Key point 3"
  }"]${
    isResearchPaper && academicLevel
      ? ',\n      "estimatedWordCount": 3000'
      : ""
  }
    }
  ],
  "estimatedWordCount": ${wordCount}
}

IMPORTANT:`;

  // Add level-specific important notes
  if (isResearchPaper && academicLevel) {
    switch (academicLevel) {
      case AcademicLevel.UNDERGRADUATE:
        basePrompt += `
- Create EXACTLY 6 sections: Abstract (no subsections) + 5 chapters
- Abstract should have NO keyPoints (it's a single paragraph)
- Each chapter MUST have 3-5 subsections as keyPoints (e.g., "1.1 Background of the Study", "1.2 Problem Statement")
- Each section MUST include "estimatedWordCount" field with the word count specified in the guidance above
- Follow the standard undergraduate structure: Abstract, Introduction, Literature Review, Methodology, Results and Analysis, Summary/Conclusion/Recommendations
- Total word count should be ${
          wordCount >= 12000 ? wordCount : "12,000-15,000"
        } words`;
        break;
      case AcademicLevel.GRADUATE:
        basePrompt += `
- Create 7-8 sections: Abstract (no subsections) + 6-7 chapters
- Abstract should have NO keyPoints (it's a single paragraph)
- Each chapter MUST have 3-5 subsections as keyPoints
- Each section MUST include "estimatedWordCount" field with appropriate word count for that section's importance
- Total word count should be ${
          wordCount >= 25000 ? wordCount : "25,000-35,000"
        } words`;
        break;
      case AcademicLevel.POSTGRADUATE:
        basePrompt += `
- Create 9-11 sections: Abstract (no subsections) + 8-10 chapters
- Abstract should have NO keyPoints (it's a single paragraph)
- Each chapter MUST have 3-5 subsections as keyPoints
- Each section MUST include "estimatedWordCount" field with appropriate word count for that section's importance
- Total word count should be ${
          wordCount >= 50000 ? wordCount : "50,000-70,000"
        } words`;
        break;
    }
    basePrompt += `
- Be specific about what arguments, evidence, or analysis each chapter will contain
- Consider how you'll cite the provided sources throughout (${ACADEMIC_LEVEL_CONFIGS[academicLevel].citationsPerSection} citations per subsection)`;
  } else {
    basePrompt += `
- Include ${config.structure.length - 1} main sections (excluding references)
- Each section should have 3-5 key points
- Be specific about what arguments, evidence, or analysis each section will contain
- Consider how you'll cite the provided sources throughout`;
  }

  basePrompt += `
- Make sure the structure flows logically
- Return ONLY valid JSON, no markdown formatting or extra text`;

  return basePrompt;
}

export async function POST(request: NextRequest) {
  try {
    const body: StructureRequest = await request.json();
    const {
      documentType,
      topic,
      instructions,
      sources,
      wordCount,
      userFeedback,
      academicLevel,
      writingStyle,
      aiProvider,
    } = body;

    if (!documentType || !topic || !sources || sources.length === 0) {
      return NextResponse.json(
        { error: "Document type, topic, and sources are required" },
        { status: 400 }
      );
    }

    // Determine AI provider
    const provider = (aiProvider as AIProvider) || DEFAULT_AI_PROVIDER;

    // Format sources for the prompt
    const sourcesText = formatSourcesForPrompt(
      sources.map((s) => ({
        title: s.title,
        excerpt: s.excerpt,
        author: s.author,
      }))
    );

    // Generate the prompt
    const prompt = generateStructurePrompt(
      documentType,
      topic,
      instructions || "",
      wordCount || 3000,
      sourcesText,
      academicLevel,
      writingStyle,
      userFeedback
    );

    // Call AI service
    const responseText = await aiService.getChatCompletion(
      provider,
      [
        {
          role: "system",
          content:
            "You are an expert academic writer who creates detailed document structures. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      0.7,
      4000
    );

    // Parse JSON from response (handle potential markdown code blocks)
    let structure: DocumentStructure;
    try {
      // Remove markdown code blocks if present
      const jsonText = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      structure = JSON.parse(jsonText);
    } catch {
      console.error("Failed to parse structure JSON:", responseText);
      throw new Error("Failed to parse structure from AI response");
    }

    // Generate table of contents for research papers
    if (documentType === DocumentType.RESEARCH_PAPER && writingStyle) {
      const toc = generateTableOfContents(structure, writingStyle);
      structure.tableOfContents = toc;
    }

    return NextResponse.json({ structure });
  } catch (error: unknown) {
    console.error("Structure generation error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate structure";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
