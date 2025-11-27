import { NextRequest } from 'next/server';
import { GenerateRequest, ResearchSource } from '@/lib/types/document';
import { generateDocumentPrompt, formatSourcesForPrompt, getSystemMessage } from '@/lib/utils/documentStructure';
import { aiService } from '@/lib/services/aiService';
import { AIProvider, DEFAULT_AI_PROVIDER } from '@/lib/config/aiModels';

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { documentType, topic, instructions, sources, wordCount, structure, academicLevel, writingStyle, aiProvider } = body;

    if (!documentType || !topic || !sources || sources.length === 0 || !structure) {
      return new Response(
        JSON.stringify({ error: 'Document type, topic, sources, and structure are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Determine AI provider
    const provider = (aiProvider as AIProvider) || DEFAULT_AI_PROVIDER;

    // Format sources for the prompt
    const sourcesText = formatSourcesForPrompt(
      sources.map((s: ResearchSource) => ({
        title: s.title,
        excerpt: s.excerpt,
        author: s.author,
      }))
    );

    // Format the structure for the prompt
    const structureText = `
APPROVED DOCUMENT STRUCTURE:
Title: ${structure.title}
Approach: ${structure.approach}
Tone: ${structure.tone}

SECTIONS TO WRITE:
${structure.sections.map((section, index) => `
${index + 1}. ${section.heading}
   Description: ${section.description}
   Key Points to Cover:
${section.keyPoints.map(point => `   - ${point}`).join('\n')}
`).join('\n')}`;

    // Generate the system message and user prompt
    const systemMessage = getSystemMessage(documentType, academicLevel);
    const userPrompt = generateDocumentPrompt(
      documentType,
      topic,
      instructions || '',
      wordCount || 3000,
      sourcesText,
      academicLevel,
      writingStyle
    ) + '\n\n' + structureText + '\n\nIMPORTANT: Follow the approved structure above exactly. Write each section with the specified key points. Maintain the approved tone and approach throughout.';

    // Create a ReadableStream for Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream from AI service
          for await (const chunk of aiService.streamChatCompletion(
            provider,
            [
              { role: 'system', content: systemMessage },
              { role: 'user', content: userPrompt },
            ],
            0.7,
            8000
          )) {
            if (chunk.done) {
              const doneMessage = `data: ${JSON.stringify({ done: true })}\n\n`;
              controller.enqueue(encoder.encode(doneMessage));
            } else if (chunk.content) {
              const sseData = `data: ${JSON.stringify({ content: chunk.content })}\n\n`;
              controller.enqueue(encoder.encode(sseData));
            }
          }

          controller.close();
        } catch (error: any) {
          console.error('Streaming error:', error);
          const errorMessage = `data: ${JSON.stringify({ error: error.message || 'Generation failed' })}\n\n`;
          controller.enqueue(encoder.encode(errorMessage));
          controller.close();
        }
      },
    });

    // Return the stream with appropriate headers for SSE
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Generation API error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred during generation' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
