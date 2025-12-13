import { NextRequest } from "next/server";
import { GenerateRequest, ResearchSource } from "@/lib/types/document";
import {
  generateDocumentPrompt,
  formatSourcesForPrompt,
  getSystemMessage,
} from "@/lib/utils/documentStructure";
import { aiService } from "@/lib/services/aiService";
import { AIProvider, DEFAULT_AI_PROVIDER } from "@/lib/config/aiModels";
import { getHumanizationPrompt } from "@/lib/config/humanizationGuidelines";
import { AcademicLevel } from "@/lib/types/document";
import { createServerSupabaseClient, getCurrentUser } from "@/lib/supabase/server";

// Extended request type to include projectId and structureId
interface ExtendedGenerateRequest extends GenerateRequest {
  projectId?: string;
  structureId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExtendedGenerateRequest = await request.json();
    const {
      documentType,
      topic,
      instructions,
      sources,
      wordCount,
      structure,
      academicLevel,
      writingStyle,
      aiProvider,
      projectId,
      structureId,
    } = body;

    if (
      !documentType ||
      !topic ||
      !sources ||
      sources.length === 0 ||
      !structure
    ) {
      return new Response(
        JSON.stringify({
          error: "Document type, topic, sources, and structure are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Determine AI provider
    const provider = (aiProvider as AIProvider) || DEFAULT_AI_PROVIDER;

    // Fetch sources from database to get full_content
    let enrichedSources = sources;
    if (projectId) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data: dbSources } = await supabase
          .from('research_sources')
          .select('id, title, url, author, excerpt, full_content')
          .eq('project_id', projectId)
          .eq('is_selected', true)
          .order('relevance_score', { ascending: false });

        if (dbSources) {
          // Merge full_content into sources
          enrichedSources = sources.map(s => {
            const dbSource = dbSources.find((db: any) => db.url === s.url || db.title === s.title);
            return {
              ...s,
              fullContent: dbSource?.full_content || undefined,
              wordCount: (dbSource as any)?.content_word_count || undefined,
            };
          });

          const withFullContent = enrichedSources.filter((s: any) => s.fullContent).length;
          console.log(`[Generate] Using full content for ${withFullContent}/${sources.length} sources`);
        }
      } catch (error) {
        console.warn('[Generate] Failed to fetch full content, using excerpts:', error);
      }
    }

    // Calculate word budget (20% of available tokens for sources)
    const sourceWordBudget = Math.floor((wordCount || 3000) * 0.3);

    // Format sources for the prompt
    const sourcesText = formatSourcesForPrompt(
      enrichedSources.map((s: any) => ({
        title: s.title,
        excerpt: s.excerpt,
        fullContent: s.fullContent,
        author: s.author,
        wordCount: s.wordCount,
      })),
      {
        preferFullContent: true,
        maxWordsPerSource: Math.min(400, Math.floor(sourceWordBudget / 5)),
      }
    );

    // Format the structure for the prompt
    const structureText = `
APPROVED DOCUMENT STRUCTURE:
Title: ${structure.title}
Approach: ${structure.approach}
Tone: ${structure.tone}

SECTIONS TO WRITE:
${structure.sections
  .map(
    (section, index) => `
${index + 1}. ${section.heading}
   Description: ${section.description}
   Key Points to Cover:
${(section.keyPoints ?? []).map((point) => `   - ${point}`).join("\n")}
`
  )
  .join("\n")}`;

    // Generate the system message and user prompt
    const systemMessage = getSystemMessage(documentType, academicLevel);
    const userPrompt =
      generateDocumentPrompt(
        documentType,
        topic,
        instructions || "",
        wordCount || 3000,
        sourcesText,
        academicLevel,
        writingStyle
      ) +
      "\n\n" +
      structureText +
      "\n\n" +
      getHumanizationPrompt(documentType, academicLevel || AcademicLevel.UNDERGRADUATE, true) +
      "\n\nIMPORTANT: Follow the approved structure above exactly. Write each section with the specified key points. Maintain the approved tone and approach throughout.";

    // Create a ReadableStream for Server-Sent Events
    const encoder = new TextEncoder();
    // Calculate dynamic token limit based on target word count
    const estimatedTokens = Math.ceil((wordCount ?? 3000) * 1.33 * 1.2);
    const maxTokenLimit = Math.min(estimatedTokens, 16000);

    console.log(`[Generate Document] ========================================`);
    console.log(`[Generate Document] Target: ${wordCount ?? 3000} words (~${estimatedTokens} tokens)`);
    console.log(`[Generate Document] Token limit: ${maxTokenLimit}`);
    console.log(`[Generate Document] Provider: ${provider}`);
    console.log(`[Generate Document] Document type: ${documentType}`);

    // Accumulate content for database saving
    let accumulatedContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Update workflow step to 'writing' when generation starts
          if (projectId) {
            const user = await getCurrentUser();
            if (user) {
              const supabase = await createServerSupabaseClient();
              await supabase
                .from('writing_projects')
                .update({ workflow_step: 'writing' })
                .eq('id', projectId);
            }
          }

          let totalWords = 0;

          // Stream from AI service
          for await (const chunk of aiService.streamChatCompletion(
            provider,
            [
              { role: "system", content: systemMessage },
              { role: "user", content: userPrompt },
            ],
            0.7,
            maxTokenLimit
          )) {
            if (chunk.done) {
              // Check for truncation
              if (chunk.truncated) {
                console.error(`[Generate Document] ⚠️  TRUNCATION DETECTED!`);
                console.error(`[Generate Document] Finish reason: ${chunk.finishReason}`);
                console.error(`[Generate Document] Tokens used: ${chunk.tokensUsed}/${maxTokenLimit}`);
                console.error(`[Generate Document] Words generated: ${totalWords}/${wordCount ?? 3000}`);

                // Send warning to frontend
                const warningMessage = `data: ${JSON.stringify({
                  warning: {
                    type: 'truncation',
                    message: `Document was truncated. Generated ${totalWords} words out of ${wordCount ?? 3000} target.`,
                    finishReason: chunk.finishReason,
                    tokensUsed: chunk.tokensUsed,
                    tokensRequested: maxTokenLimit
                  }
                })}\n\n`;
                controller.enqueue(encoder.encode(warningMessage));
              } else {
                console.log(`[Generate Document] ✓ Completed successfully`);
                console.log(`[Generate Document] Finish reason: ${chunk.finishReason}`);
                console.log(`[Generate Document] Tokens used: ${chunk.tokensUsed}/${maxTokenLimit}`);
                console.log(`[Generate Document] Words generated: ${totalWords}`);
              }


              // Save to database if projectId is provided
              if (projectId && accumulatedContent) {
                try {
                  const user = await getCurrentUser();
                  if (user) {
                    const supabase = await createServerSupabaseClient();
                    
                    // Calculate word count
                    const finalWordCount = accumulatedContent.split(/\s+/).length;
                    const characterCount = accumulatedContent.length;
                    
                    // Mark any existing current document as not current
                    await supabase
                      .from('generated_documents')
                      .update({ is_current: false })
                      .eq('project_id', projectId)
                      .eq('is_current', true);
                    
                    // Insert new document
                    const { data: insertedDoc, error: docError } = await supabase
                      .from('generated_documents')
                      .insert({
                        project_id: projectId,
                        structure_id: structureId || null,
                        content: accumulatedContent,
                        references_text: null,
                        generation_method: 'full',
                        block_info: null,
                        word_count: finalWordCount,
                        character_count: characterCount,
                        is_current: true,
                        generation_completed: true,
                        completed_at: new Date().toISOString(),
                      })
                      .select()
                      .single();
                    
                    if (docError) {
                      console.error('Failed to save document to database:', docError);
                    } else if (insertedDoc) {
                      // Save citations to the database
                      if (sources && sources.length > 0) {
                        // Get the project's citation style
                        const { data: projectData } = await supabase
                          .from('writing_projects')
                          .select('citation_style')
                          .eq('id', projectId)
                          .single();

                        const citationStyle = projectData?.citation_style || 'APA';

                        // Get research sources to link citations
                        const { data: researchSources } = await supabase
                          .from('research_sources')
                          .select('id, title, url')
                          .eq('project_id', projectId);

                        if (researchSources && researchSources.length > 0) {
                          // Create citations for each source
                          const citationsToInsert = sources.map((source: ResearchSource, index: number) => {
                            // Find matching research source by URL or title
                            const matchingSource = researchSources.find(
                              rs => rs.url === source.url || rs.title === source.title
                            );

                            if (!matchingSource) {
                              console.warn(`No matching research source found for: ${source.title}`);
                              return null;
                            }

                            const author = source.author || 'Anonymous';
                            const year = source.publishedDate ? new Date(source.publishedDate).getFullYear() : 'n.d.';

                            // Format in-text citation based on style
                            let inTextFormat = '';
                            let referenceFormat = '';

                            switch (citationStyle) {
                              case 'APA':
                                inTextFormat = `(${author}, ${year})`;
                                referenceFormat = `${author}. (${year}). ${source.title}. Retrieved from ${source.url}`;
                                break;
                              case 'MLA':
                                inTextFormat = `(${author})`;
                                const fullDate = source.publishedDate ? new Date(source.publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'n.d.';
                                referenceFormat = `${author}. "${source.title}." Web. ${fullDate}. ${source.url}`;
                                break;
                              case 'HARVARD':
                                inTextFormat = `(${author} ${year})`;
                                referenceFormat = `${author} (${year}) ${source.title}. Available at: ${source.url}`;
                                break;
                              case 'CHICAGO':
                                inTextFormat = `(${author} ${year})`;
                                referenceFormat = `${author}. ${year}. "${source.title}." ${source.url}.`;
                                break;
                              default:
                                inTextFormat = `[${index + 1}]`;
                                referenceFormat = `${author}. ${source.title}. ${source.url}`;
                            }

                            return {
                              project_id: projectId,
                              source_id: matchingSource.id,
                              marker: `[${index + 1}]`,
                              in_text_format: inTextFormat,
                              reference_format: referenceFormat,
                              citation_style: citationStyle,
                              position: index,
                              used_in_sections: null,
                            };
                          }).filter((citation): citation is NonNullable<typeof citation> => citation !== null);

                          if (citationsToInsert.length > 0) {
                            const { error: citationsError } = await supabase
                              .from('citations')
                              .insert(citationsToInsert);

                            if (citationsError) {
                              console.error('Failed to save citations:', citationsError);
                            } else {
                              console.log(`Saved ${citationsToInsert.length} citations to database`);
                            }
                          }
                        }
                      }

                      // Get current version count
                      const { count } = await supabase
                        .from('document_versions')
                        .select('*', { count: 'exact', head: true })
                        .eq('project_id', projectId);

                      const nextVersion = (count || 0) + 1;

                      // Create version snapshot
                      await supabase
                        .from('document_versions')
                        .insert({
                          project_id: projectId,
                          version_number: nextVersion,
                          version_name: `Document v${nextVersion}`,
                          description: 'Document generation completed',
                          structure_snapshot: JSON.parse(JSON.stringify(structure)),
                          sources_snapshot: JSON.parse(JSON.stringify(sources || [])),
                          content_snapshot: accumulatedContent,
                          checkpoint_type: 'final_complete',
                          word_count: finalWordCount,
                          created_by: user.id,
                        });

                      // Update project workflow step and completion status
                      await supabase
                        .from('writing_projects')
                        .update({
                          workflow_step: 'complete',
                          is_complete: true,
                          completed_at: new Date().toISOString(),
                        })
                        .eq('id', projectId);

                      console.log(`Saved document to database with ID: ${insertedDoc.id}`);
                    }
                  }
                } catch (dbError) {
                  console.error('Database operation failed:', dbError);
                }
              }
              
              const doneMessage = `data: ${JSON.stringify({ done: true })}\n\n`;
              controller.enqueue(encoder.encode(doneMessage));
            } else if (chunk.content) {
              // Accumulate content for database saving
              accumulatedContent += chunk.content;

              // Track word count
              totalWords = accumulatedContent.split(/\s+/).filter(w => w.length > 0).length;

              const sseData = `data: ${JSON.stringify({
                content: chunk.content,
              })}\n\n`;
              controller.enqueue(encoder.encode(sseData));
            }
          }

          controller.close();
        } catch (error: unknown) {
          console.error("Streaming error:", error);
          const errorMessage = error instanceof Error ? error.message : "Generation failed";
          const sseError = `data: ${JSON.stringify({
            error: errorMessage,
          })}\n\n`;
          controller.enqueue(encoder.encode(sseError));
          controller.close();
        }
      },
    });

    // Return the stream with appropriate headers for SSE
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("Generation API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred during generation";
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
