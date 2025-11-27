import Groq from 'groq-sdk';
import { FeedbackAnalysis, DocumentStructure, DocumentType, DOCUMENT_TYPE_CONFIGS } from '@/lib/types/document';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Analyze user feedback on a document structure to extract actionable insights
 */
export async function analyzeFeedback(
  feedback: string,
  currentStructure: DocumentStructure,
  topic: string,
  documentType: DocumentType
): Promise<FeedbackAnalysis> {
  const config = DOCUMENT_TYPE_CONFIGS[documentType];

  const analysisPrompt = `You are an expert at analyzing user feedback on academic document structures.

CURRENT STRUCTURE:
Title: ${currentStructure.title}
Approach: ${currentStructure.approach}
Tone: ${currentStructure.tone}
Sections: ${currentStructure.sections.map((s, i) => `${i + 1}. ${s.heading}: ${s.description}`).join('\n')}

DOCUMENT CONTEXT:
Topic: "${topic}"
Document Type: ${config.label}

USER FEEDBACK:
"${feedback}"

Analyze this feedback and extract structured information. Return a JSON object with this exact structure:
{
  "intents": ["add_section", "expand_section", "change_tone", "add_detail", "restructure"],
  "specificRequests": ["List specific things user wants", "Each as a separate item"],
  "knowledgeGaps": ["What information is missing", "What needs to be researched"],
  "searchQueries": ["Specific search query 1 about ${topic}", "Specific search query 2"],
  "requiresNewSources": true
}

INTENT CATEGORIES:
- "add_section": User wants a new section added
- "expand_section": User wants existing section expanded
- "change_tone": User wants tone/style changed
- "add_detail": User wants more specific details/examples
- "restructure": User wants sections reordered or restructured

GUIDELINES:
- Extract 2-5 specific requests from the feedback
- Identify 1-3 knowledge gaps that need research
- Generate 1-4 targeted search queries (focused on the topic)
- Set requiresNewSources to true if feedback suggests missing information
- Search queries should be specific and directly related to the feedback
- If feedback is vague, interpret it in the context of the document type

Return ONLY valid JSON, no markdown formatting.`;

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You are an expert at analyzing academic document feedback. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: analysisPrompt,
      },
    ],
    model: 'openai/gpt-oss-120b',
    temperature: 0.3, // Lower temperature for more consistent analysis
    max_tokens: 1000,
  });

  const responseText = completion.choices[0]?.message?.content || '';

  // Parse JSON from response
  try {
    const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis: FeedbackAnalysis = JSON.parse(jsonText);

    // Validate and provide defaults
    return {
      intents: analysis.intents || [],
      specificRequests: analysis.specificRequests || [],
      knowledgeGaps: analysis.knowledgeGaps || [],
      searchQueries: analysis.searchQueries || [],
      requiresNewSources: analysis.requiresNewSources || false,
    };
  } catch (parseError) {
    console.error('Failed to parse feedback analysis:', responseText);

    // Fallback: Simple analysis without AI parsing
    return {
      intents: ['expand_section'],
      specificRequests: [feedback],
      knowledgeGaps: ['Additional information needed based on feedback'],
      searchQueries: [`${topic} ${feedback.substring(0, 50)}`],
      requiresNewSources: true,
    };
  }
}
