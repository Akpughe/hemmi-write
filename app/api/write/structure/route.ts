import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";
import {
  DOCUMENT_TYPE_CONFIGS,
  DocumentType,
  AcademicLevel,
  WritingStyle,
  ACADEMIC_LEVEL_CONFIGS,
  WRITING_STYLE_CONFIGS,
} from "@/lib/types/document";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

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
          : '"Section heading (e.g., Introduction, Findings, Analysis - NO chapter numbers)"'
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
- **CRITICAL**: Use ONLY simple section headings (e.g., "Introduction", "Findings", "Analysis")
- **DO NOT** use chapter numbers or "Chapter X:" format - this is NOT a research paper
- Use direct, descriptive section titles that match standard ${config.label.toLowerCase()} structure
- Be specific about what arguments, evidence, or analysis each section will contain
- Consider how you'll cite the provided sources throughout`;
  }

  basePrompt += `
- Make sure the structure flows logically
- Return ONLY valid JSON, no markdown formatting or extra text`;

  return basePrompt;
}

export async function POST(req: NextRequest) {
  try {
    const {
      documentType,
      topic,
      instructions,
      wordCount,
      sources,
      academicLevel,
      writingStyle,
      chapters,
    } = await req.json();

    // Get config for the document type
    const config =
      DOCUMENT_TYPE_CONFIGS[documentType as keyof typeof DOCUMENT_TYPE_CONFIGS];

    if (!config) {
      return NextResponse.json(
        { error: "Invalid document type" },
        { status: 400 }
      );
    }

    // Construct the prompt
    const isResearchPaper = documentType === "RESEARCH_PAPER";
    const prompt = `
      Create a detailed structure for a ${
        config.label
      } on the topic: "${topic}".
      
      DOCUMENT TYPE: ${config.label.toUpperCase()}
      ${
        !isResearchPaper
          ? `
      ⚠️ CRITICAL FORMAT RULE: This is a ${config.label.toUpperCase()}, NOT a research paper.
      - DO NOT use "Chapter 1:", "Chapter 2:", etc.
      - Use ONLY simple section headings: "Introduction", "Findings", "Analysis", "Conclusion", etc.
      - NO chapter numbering in section titles
      `
          : ""
      }
      
      CONTEXT:
      - Document Type: ${config.label}
      - Academic Level: ${academicLevel || "Undergraduate"}
      - Writing Style: ${writingStyle || "Analytical"}
      - Target Word Count: ${wordCount || config.suggestedWordCountMin} words
      ${chapters ? `- Number of Chapters: ${chapters}` : ""}
      ${instructions ? `- User Instructions: ${instructions}` : ""}
      
      SOURCES:
      ${
        sources && sources.length > 0
          ? sources
              .map(
                (s: { title: string; snippet: string }) =>
                  `- ${s.title}: ${s.snippet}`
              )
              .join("\n")
          : "No specific sources provided. Use general knowledge."
      }
      
      HUMANIZATION INSTRUCTIONS (CRITICAL):
      - Write in a clear, simple, and spartan style.
      - Use active voice and impactful sentences.
      - Focus on actionable insights, data, and examples.
      - Address the reader directly ("you", "your").
      - AVOID: Glassmorphism, complex metaphors, generalizations, setup language, warnings, unnecessary adjectives/adverbs, hashtags, semicolons, asterisks.
      - AVOID WORDS: "delve", "landscape", "tapestry", "comprehensive", "insightful", "nuanced", "pivotal", "crucial".
      
      STRUCTURE REQUIREMENTS:
      - Title: A catchy and relevant title.
      - Approach: A brief description of how the document will be written.
      - Tone: The tone of the document (e.g., Formal, Persuasive).
      - Sections: A list of sections with specific formatting:
        ${
          isResearchPaper
            ? `
        FOR RESEARCH PAPERS:
        - Use "Chapter X: Title" format (e.g., "Chapter 1: Introduction", "Chapter 2: Literature Review")
        - Create exactly ${chapters || 5} main body chapters plus Abstract
        `
            : `
        FOR ${config.label.toUpperCase()}S:
        - Use SIMPLE section headings WITHOUT chapter numbers
        - Examples: "Introduction", "Background", "Findings", "Analysis", "Recommendations", "Conclusion"
        - DO NOT write "Chapter 1:", "Chapter 2:", etc.
        - Follow standard ${config.label.toLowerCase()} structure with ${
                config.structure.length - 1
              } main sections
        `
        }
        - Each section must have a 'heading' and a list of 'keyPoints'.
      
      
      Return the response in JSON format with the following schema:
      {
        "title": "string",
        "approach": "string",
        "tone": "string",
        "sections": [
          {
            "heading": "string",
            "keyPoints": ["string", "string"]
          }
        ]
      }
    `;

    const result = await generateObject({
      model: groq("openai/gpt-oss-120b"),
      schema: z.object({
        title: z.string(),
        approach: z.string(),
        tone: z.string(),
        sections: z.array(
          z.object({
            heading: z.string(),
            keyPoints: z.array(z.string()),
          })
        ),
      }),
      prompt,
    });
      if (isResearchPaper) {
    result.object.sections.push({
      heading: "References",
      keyPoints: [], // Empty keyPoints since References is auto-generated from citations
    });
  }

    // Generate Table of Contents from sections
    const tocItems: any[] = [];
    let chapterNumber = 0; // Track chapter numbers separately from index

    result.object.sections.forEach((section, index) => {
      // Check if this is an Abstract (should not be numbered)
      const isAbstract = section.heading.toLowerCase().includes("abstract");

      // Increment chapter number only for non-abstract sections
      if (!isAbstract && isResearchPaper) {
        chapterNumber++;
      }

      // Add chapter/section as level 1
      tocItems.push({
        level: 1,
        title: section.heading,
        sectionNumber: isResearchPaper && !isAbstract ? `${chapterNumber}` : undefined,
      });

      // Add subsections/keyPoints as level 2 for research papers
      if (isResearchPaper && section.keyPoints && section.keyPoints.length > 0) {
        section.keyPoints.forEach((keyPoint, subIndex) => {
          // Extract or generate subsection number
          let subsectionTitle = keyPoint;

          // Check if keyPoint already has numbering (e.g., "1.1 Title" or "1.1. Title")
          const hasNumbering = /^\d+\.\d+[\.\s]/.test(keyPoint);

          // If not numbered and not abstract, add subsection numbering
          if (!hasNumbering && !isAbstract) {
            subsectionTitle = `${chapterNumber}.${subIndex + 1} ${keyPoint}`;
          }

          tocItems.push({
            level: 2,
            title: subsectionTitle,
            sectionNumber: undefined,
          });
        });
      }
    });

    // Add References to TOC for Research Papers
    if (isResearchPaper) {
      tocItems.push({
        level: 1,
        title: "References",
        sectionNumber: undefined,
      });
    }

    const tableOfContents = {
      items: tocItems,
    };

    return NextResponse.json({
      structure: {
        ...result.object,
        tableOfContents,
      },
    });
  } catch (error) {
    console.error("Structure generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate structure" },
      { status: 500 }
    );
  }
}
