import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import axios from 'axios';

export interface ExtractionResult {
  content: string;           // Clean markdown
  title: string;
  author?: string;
  wordCount: number;
  excerpt: string;           // First 200 words
  success: boolean;
  error?: string;
}

export interface ExtractionOptions {
  maxWords?: number;         // Default: 500
  timeout?: number;          // Default: 8000ms
}

export async function extractArticleContent(
  url: string,
  options: ExtractionOptions = {}
): Promise<ExtractionResult> {
  const { maxWords = 500, timeout = 8000 } = options;

  try {
    // 1. Fetch HTML with timeout
    const response = await axios.get(url, {
      timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WriteNutonBot/1.0)',
      },
    });

    // 2. Parse with JSDOM for Readability
    const dom = new JSDOM(response.data, { url });

    // 3. Extract readable content
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.content) {
      return {
        content: '',
        title: '',
        success: false,
        error: 'Failed to extract content',
        wordCount: 0,
        excerpt: '',
      };
    }

    // 4. Convert to Markdown
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });

    const markdown = turndownService.turndown(article.content);

    // 5. Intelligent truncation
    const truncated = truncateToWords(markdown, maxWords);
    const wordCount = truncated.split(/\s+/).length;

    // 6. Generate excerpt (first 200 words)
    const excerpt = truncateToWords(markdown, 200);

    return {
      content: truncated,
      title: article.title || '',
      author: article.byline || undefined,
      wordCount,
      excerpt,
      success: true,
    };
  } catch (error: any) {
    console.error(`Content extraction failed for ${url}:`, error.message);
    return {
      content: '',
      title: '',
      success: false,
      error: error.message,
      wordCount: 0,
      excerpt: '',
    };
  }
}

function truncateToWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;

  const truncated = words.slice(0, maxWords).join(' ');

  // Try to end at sentence boundary
  const lastPeriod = truncated.lastIndexOf('.');
  const lastExclamation = truncated.lastIndexOf('!');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastSentence = Math.max(lastPeriod, lastExclamation, lastQuestion);

  if (lastSentence > truncated.length * 0.8) {
    return truncated.substring(0, lastSentence + 1);
  }

  return truncated + '...';
}
