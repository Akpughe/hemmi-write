import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import {
  DeepRegenerateRequest,
  DeepRegenerateResponse,
  DocumentStructure,
  ResearchSource,
  TargetedSearchResult,
  DOCUMENT_TYPE_CONFIGS,
} from '@/lib/types/document';
import { analyzeFeedback } from '@/lib/utils/feedbackAnalysis';
import { conductTargetedResearch } from '@/lib/utils/targetedResearch';
import { formatSourcesForPrompt } from '@/lib/utils/documentStructure';
import { createServerSupabaseClient, getCurrentUser } from '@/lib/supabase/server';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Extended request type to include projectId
interface ExtendedDeepRegenerateRequest extends DeepRegenerateRequest {
  projectId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExtendedDeepRegenerateRequest = await request.json();
    const {
      documentType,
      topic,
      instructions,
      wordCount,
      currentStructure,
      existingSources,
      userFeedback,
      projectId,
    } = body;

    if (!documentType || !topic || !userFeedback || !currentStructure) {
      return NextResponse.json(
        { error: 'Document type, topic, feedback, and current structure are required' },
        { status: 400 }
      );
    }

    // PHASE 1: Analyze feedback
    console.log('Phase 1: Analyzing feedback...');
    const feedbackAnalysis = await analyzeFeedback(
      userFeedback,
      currentStructure,
      topic,
      documentType
    );

    console.log('Feedback analysis:', {
      intents: feedbackAnalysis.intents,
      queries: feedbackAnalysis.searchQueries,
      requiresNewSources: feedbackAnalysis.requiresNewSources,
    });

    // PHASE 2: Conduct targeted research if needed
    console.log('Phase 2: Conducting targeted research...');
    let researchConducted: TargetedSearchResult[] = [];
    let newSourcesAdded: ResearchSource[] = [];

    if (feedbackAnalysis.requiresNewSources && feedbackAnalysis.searchQueries.length > 0) {
      const existingUrls = existingSources.map((s) => s.url);

      researchConducted = await conductTargetedResearch(
        feedbackAnalysis.searchQueries,
        documentType,
        existingUrls
      );

      // Collect all new sources from research
      researchConducted.forEach((result) => {
        newSourcesAdded.push(...result.sources);
      });

      console.log(`Found ${newSourcesAdded.length} new sources`);
    } else {
      console.log('No new sources needed');
    }

    // PHASE 3: Combine sources
    const allSources = [...existingSources, ...newSourcesAdded];
    console.log(`Total sources: ${allSources.length} (${existingSources.length} original + ${newSourcesAdded.length} new)`);

    // PHASE 4: Regenerate structure with full context
    console.log('Phase 4: Regenerating structure...');
    const newStructure = await regenerateStructure(
      documentType,
      topic,
      instructions,
      wordCount,
      allSources,
      currentStructure,
      feedbackAnalysis
    );

    // PHASE 5: Generate summary of changes
    console.log('Phase 5: Generating changes summary...');
    const changesSummary = await generateChangesSummary(
      currentStructure,
      newStructure,
      feedbackAnalysis
    );

    const regenerationReport = {
      feedbackAnalysis,
      researchConducted,
      newSourcesAdded,
      changesSummary,
    };

    // PHASE 6: Save to database if projectId provided
    if (projectId) {
      try {
        const user = await getCurrentUser();
        if (user) {
          const supabase = await createServerSupabaseClient();
          
          // Save new sources if any
          if (newSourcesAdded.length > 0) {
            const sourcesToInsert = newSourcesAdded.map((source, index) => ({
              project_id: projectId,
              title: source.title,
              url: source.url,
              author: source.author || null,
              published_date: source.publishedDate || null,
              excerpt: source.excerpt,
              full_content: null,
              highlights: null,
              source_type: 'web' as const,
              relevance_score: source.score || null,
              is_selected: true,
              position: existingSources.length + index,
            }));
            
            await supabase
              .from('research_sources')
              .insert(sourcesToInsert);
            
            console.log(`Saved ${newSourcesAdded.length} new sources to database`);
          }
          
          // Mark existing current structure as not current
          await supabase
            .from('document_structures')
            .update({ is_current: false })
            .eq('project_id', projectId)
            .eq('is_current', true);
          
          // Get next version number
          const { count } = await supabase
            .from('document_structures')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId);
          
          const nextVersion = (count || 0) + 1;
          
          // Insert new structure with regeneration report
          const { data: insertedStructure, error: structureError } = await supabase
            .from('document_structures')
            .insert({
              project_id: projectId,
              version: nextVersion,
              title: newStructure.title,
              approach: newStructure.approach,
              tone: newStructure.tone,
              table_of_contents: null,
              estimated_word_count: newStructure.estimatedWordCount || wordCount,
              is_current: true,
              is_approved: false,
              regeneration_report: JSON.parse(JSON.stringify(regenerationReport)),
            })
            .select()
            .single();
          
          if (structureError) {
            console.error('Failed to save structure:', structureError);
          } else if (insertedStructure) {
            // Insert sections
            const sectionsToInsert = newStructure.sections.map((section, index) => ({
              structure_id: insertedStructure.id,
              heading: section.heading,
              description: (section as any).description || '',
              key_points: { points: section.keyPoints || [] },
              position: index,
              estimated_word_count: (section as any).estimatedWordCount || null,
              section_number: null,
            }));
            
            await supabase
              .from('document_sections')
              .insert(sectionsToInsert);
            
            // Create version snapshot
            await supabase
              .from('document_versions')
              .insert({
                project_id: projectId,
                version_number: nextVersion,
                version_name: `Regenerated Structure v${nextVersion}`,
                description: `Regenerated based on feedback: ${userFeedback.substring(0, 100)}...`,
                structure_snapshot: JSON.parse(JSON.stringify(newStructure)),
                sources_snapshot: JSON.parse(JSON.stringify(allSources)),
                content_snapshot: null,
                checkpoint_type: 'structure_regeneration',
                word_count: null,
                created_by: user.id,
              });
            
            console.log(`Saved regenerated structure with ID: ${insertedStructure.id}`);
          }
        }
      } catch (dbError) {
        console.error('Database operation failed:', dbError);
      }
    }

    const response: DeepRegenerateResponse = {
      structure: newStructure,
      regenerationReport,
    };

    return NextResponse.json(response);

  } catch (error: unknown) {
    console.error('Deep regeneration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate structure';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Regenerate structure using all available context
 */
async function regenerateStructure(
  documentType: string,
  topic: string,
  instructions: string,
  wordCount: number,
  sources: ResearchSource[],
  currentStructure: DocumentStructure,
  feedbackAnalysis: any
): Promise<DocumentStructure> {
  const config = DOCUMENT_TYPE_CONFIGS[documentType as keyof typeof DOCUMENT_TYPE_CONFIGS];

  const sourcesText = formatSourcesForPrompt(
    sources.map((s) => ({
      title: s.title,
      excerpt: s.excerpt,
      author: s.author,
    }))
  );

  const prompt = `You are an expert academic writer revising a document structure based on user feedback.

DOCUMENT CONTEXT:
Topic: "${topic}"
Document Type: ${config.label}
Target Word Count: ${wordCount} words
${instructions ? `Additional Instructions: ${instructions}` : ''}

CURRENT STRUCTURE:
Title: ${currentStructure.title}
Approach: ${currentStructure.approach}
Tone: ${currentStructure.tone}
Sections:
${currentStructure.sections.map((s, i) => `${i + 1}. ${s.heading}
   ${s.description}
   Key Points: ${s.keyPoints.join(', ')}`).join('\n')}

USER FEEDBACK ANALYSIS:
- User Intents: ${feedbackAnalysis.intents.join(', ')}
- Specific Requests: ${feedbackAnalysis.specificRequests.join('; ')}
- Knowledge Gaps Identified: ${feedbackAnalysis.knowledgeGaps.join('; ')}

AVAILABLE SOURCES (${sources.length} total):
${sourcesText}

TASK:
Revise the structure to address the user's feedback. Make meaningful changes that directly respond to their requests.

Return your response as a JSON object with this exact structure:
{
  "title": "Revised document title (can be same or updated)",
  "approach": "Updated overall approach and methodology (2-3 sentences)",
  "tone": "Updated writing tone or keep same",
  "sections": [
    {
      "heading": "Section heading",
      "description": "What this section will cover (1-2 sentences)",
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3"]
    }
  ],
  "estimatedWordCount": ${wordCount}
}

IMPORTANT:
- Address ALL specific requests from the feedback
- Include ${config.structure.length - 1} main sections (excluding references)
- Add new sections if requested
- Expand sections with more key points if requested
- Change tone/approach if requested
- Use the new sources to support requested changes
- Make sure changes are VISIBLE and MEANINGFUL
- Return ONLY valid JSON, no markdown formatting`;

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You are an expert academic writer who revises document structures based on feedback. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    model: 'openai/gpt-oss-120b',
    temperature: 0.7,
    max_tokens: 2000,
  });

  const responseText = completion.choices[0]?.message?.content || '';

  try {
    const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonText);
  } catch (parseError) {
    console.error('Failed to parse regenerated structure:', responseText);
    throw new Error('Failed to parse structure from AI response');
  }
}

/**
 * Generate a human-readable summary of what changed
 */
async function generateChangesSummary(
  oldStructure: DocumentStructure,
  newStructure: DocumentStructure,
  feedbackAnalysis: any
): Promise<string> {
  const prompt = `Compare these two document structures and summarize the changes made.

OLD STRUCTURE:
Title: ${oldStructure.title}
Approach: ${oldStructure.approach}
Tone: ${oldStructure.tone}
Sections: ${oldStructure.sections.map(s => s.heading).join(', ')}

NEW STRUCTURE:
Title: ${newStructure.title}
Approach: ${newStructure.approach}
Tone: ${newStructure.tone}
Sections: ${newStructure.sections.map(s => s.heading).join(', ')}

USER REQUESTED:
${feedbackAnalysis.specificRequests.join(', ')}

Write a brief summary (3-5 bullet points) of the key changes made to address the feedback.
Start each point with a dash (-). Be specific and concise.`;

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You are concise and specific. Return only the bullet-pointed summary.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    model: 'openai/gpt-oss-120b',
    temperature: 0.3,
    max_tokens: 300,
  });

  return completion.choices[0]?.message?.content || 'Structure regenerated based on feedback.';
}
