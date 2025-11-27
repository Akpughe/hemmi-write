import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import Exa from 'exa-js';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const exa = new Exa(process.env.EXA_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Get the last user message to check if we need to search
    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage.content;

    // Determine if we need to use Exa search based on the query
    const needsSearch = shouldUseSearch(userQuery);

    let contextFromSearch = '';

    if (needsSearch) {
      try {
        // Use Exa to search for relevant information
        const searchResults = await exa.searchAndContents(userQuery, {
          type: 'auto',
          numResults: 3,
          text: true,
        });

        if (searchResults.results && searchResults.results.length > 0) {
          contextFromSearch = '\n\nRelevant information from the web:\n' +
            searchResults.results
              .map((result: any, index: number) =>
                `${index + 1}. ${result.title}\n${result.text?.substring(0, 500)}...\nSource: ${result.url}`
              )
              .join('\n\n');
        }
      } catch (searchError) {
        console.error('Exa search error:', searchError);
        // Continue without search results if search fails
      }
    }

    // Prepare messages for Groq
    const groqMessages = [...messages];

    // If we have search context, add it to the last user message
    if (contextFromSearch) {
      groqMessages[groqMessages.length - 1] = {
        ...lastMessage,
        content: userQuery + contextFromSearch,
      };
    }

    // Call Groq API with openai/gpt-oss-120b model
    const completion = await groq.chat.completions.create({
      messages: groqMessages,
      model: 'openai/gpt-oss-120b',
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 1,
      stream: false,
    });

    const assistantMessage = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    return NextResponse.json({
      message: assistantMessage,
      usedSearch: needsSearch && contextFromSearch.length > 0,
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}

// Helper function to determine if we should use search
function shouldUseSearch(query: string): boolean {
  const searchKeywords = [
    'search',
    'find',
    'look up',
    'what is',
    'who is',
    'when did',
    'where is',
    'how to',
    'latest',
    'current',
    'recent',
    'news',
    'information about',
  ];

  const lowerQuery = query.toLowerCase();
  return searchKeywords.some(keyword => lowerQuery.includes(keyword));
}
