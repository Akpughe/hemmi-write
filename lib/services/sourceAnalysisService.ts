/**
 * Source Analysis Service
 * Analyzes research sources and maps them to document sections using AI
 */

import { aiService, AIProvider } from '@/lib/services/aiService';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/server';
import type { SourceAnalysis, SectionMapping } from '@/lib/types/sourceAnalysis';

interface SourceInput {
  id: string;
  title: string;
  url: string;
  excerpt?: string;
  author?: string;
  publishedDate?: string;
  fullContent?: string;
}

interface DocumentSection {
  heading: string;
  description?: string;
}

function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
}

class SourceAnalysisService {
  /**
   * Analyze research sources to extract themes, claims, and relationships
   */
  async analyzeSources(params: {
    projectId: string;
    topic: string;
    documentType: string;
    academicLevel: string;
    sources: SourceInput[];
    provider?: AIProvider;
  }): Promise<SourceAnalysis> {
    const { projectId, topic, documentType, academicLevel, sources, provider = AIProvider.OPENAI } = params;

    const sourceSummaries = sources.map((s, i) => {
      const content = s.fullContent || s.excerpt || '';
      return `Source ${i + 1} (ID: ${s.id}):\nTitle: ${s.title}\nAuthor: ${s.author || 'Unknown'}\nDate: ${s.publishedDate || 'Unknown'}\nURL: ${s.url}\nContent: ${content.substring(0, 1500)}`;
    }).join('\n\n---\n\n');

    const systemMessage = 'You are an academic research analyst. Return ONLY valid JSON, no markdown fences.';

    const userMessage = `Analyze the following ${sources.length} research sources for a ${documentType} on "${topic}" at ${academicLevel} level.

For each source, identify:
- keyClaims: main arguments or claims made
- methodology: research methodology used
- keyFindings: primary findings or conclusions
- limitations: noted limitations
- themes: thematic tags
- bestUsedFor: how this source is best used in the document
- yearCategory: "recent" (last 3 years), "established" (3-10 years), or "seminal" (10+ years)

Then identify:
- thematicClusters: groups of sources that share themes, with consensus views and tensions
- researchGaps: gaps in the literature these sources reveal
- suggestedCentralArgument: a suggested central argument based on the sources

Return JSON matching this structure:
{
  "sources": [{ "sourceId": "...", "keyClaims": [...], "methodology": "...", "keyFindings": "...", "limitations": "...", "themes": [...], "bestUsedFor": "...", "yearCategory": "recent|established|seminal" }],
  "thematicClusters": [{ "themeId": "...", "label": "...", "sourceIds": [...], "consensusView": "...", "tensions": "..." }],
  "researchGaps": [...],
  "suggestedCentralArgument": "..."
}

Sources:
${sourceSummaries}`;

    const response = await aiService.getChatCompletion(
      provider,
      [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      0.4,
      4000
    );

    const cleaned = stripMarkdownFences(response);
    const analysis: SourceAnalysis = JSON.parse(cleaned);

    // Save to database
    try {
      const supabase = createServiceRoleSupabaseClient();

      await (supabase as any)
        .from('source_analysis')
        .upsert({
          project_id: projectId,
          analysis_data: analysis as any,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'project_id' });
    } catch (dbError) {
      console.error('[SourceAnalysisService] Failed to save source analysis to DB:', dbError);
    }

    return analysis;
  }

  /**
   * Map analyzed sources to document sections
   */
  async mapSourcesToSections(params: {
    projectId: string;
    analysis: SourceAnalysis;
    sections: DocumentSection[];
    topic: string;
    documentType: string;
    provider?: AIProvider;
  }): Promise<SectionMapping[]> {
    const { projectId, analysis, sections, topic, documentType, provider = AIProvider.OPENAI } = params;

    const systemMessage = 'You are an academic research analyst. Return ONLY valid JSON, no markdown fences.';

    const userMessage = `Given the following source analysis and document sections for a ${documentType} on "${topic}", map the most relevant sources to each section.

Source Analysis:
${JSON.stringify(analysis, null, 2)}

Document Sections:
${sections.map((s, i) => `${i + 1}. ${s.heading}${s.description ? ` - ${s.description}` : ''}`).join('\n')}

For each section, provide:
- sectionHeading: the section heading
- relevantSourceIds: IDs of sources most relevant to this section
- sectionThesis: a suggested thesis for the section
- argumentRole: one of "establishes_context", "builds_evidence", "addresses_counterarguments", or "synthesizes"
- suggestedApproach: how to use the sources in this section

Return a JSON array of section mappings:
[{ "sectionHeading": "...", "relevantSourceIds": [...], "sectionThesis": "...", "argumentRole": "...", "suggestedApproach": "..." }]`;

    const response = await aiService.getChatCompletion(
      provider,
      [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      0.4,
      3000
    );

    const cleaned = stripMarkdownFences(response);
    const mappings: SectionMapping[] = JSON.parse(cleaned);

    // Save to database
    try {
      const supabase = createServiceRoleSupabaseClient();

      await (supabase as any)
        .from('section_source_mappings')
        .upsert({
          project_id: projectId,
          mappings_data: mappings as any,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'project_id' });
    } catch (dbError) {
      console.error('[SourceAnalysisService] Failed to save section mappings to DB:', dbError);
    }

    return mappings;
  }
}

export const sourceAnalysisService = new SourceAnalysisService();
