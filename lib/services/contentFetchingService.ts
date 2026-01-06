import PQueue from 'p-queue';
import retry from 'async-retry';
import { extractArticleContent, ExtractionOptions } from '@/lib/utils/contentExtractor';

export interface FetchRequest {
  id: string;
  url: string;
  title: string;
}

export interface FetchResult {
  sourceId: string;
  url: string;
  success: boolean;
  content?: string;
  wordCount?: number;
  error?: string;
  fetchDuration: number;

  // Academic metadata
  journalName?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  year?: number;
  publisher?: string;
  publicationType?: string;
  authorsStructured?: Array<{
    first: string;
    last: string;
    middle?: string;
  }>;
  author?: string;
}

export interface FetchOptions extends ExtractionOptions {
  maxConcurrent?: number;    // Default: 3
  retries?: number;          // Default: 2
}

export class ContentFetchingService {
  private queue: PQueue;

  constructor(maxConcurrent: number = 3) {
    this.queue = new PQueue({
      concurrency: maxConcurrent,
      interval: 1000,
      intervalCap: 5,
    });
  }

  async fetchMultiple(
    sources: FetchRequest[],
    options: FetchOptions = {}
  ): Promise<FetchResult[]> {
    const { retries = 2, maxWords = 500, timeout = 8000 } = options;

    const fetchTasks = sources.map(source =>
      this.queue.add(async () =>
        await this.fetchWithRetry(source, { retries, maxWords, timeout })
      )
    );

    const results = await Promise.all(fetchTasks);
    return results.filter((r): r is FetchResult => r !== undefined);
  }

  private async fetchWithRetry(
    source: FetchRequest,
    options: { retries: number; maxWords: number; timeout: number }
  ): Promise<FetchResult> {
    const startTime = Date.now();

    try {
      const result = await retry(
        async () => {
          const extraction = await extractArticleContent(source.url, {
            maxWords: options.maxWords,
            timeout: options.timeout,
          });

          if (!extraction.success) {
            throw new Error(extraction.error || 'Extraction failed');
          }

          return extraction;
        },
        {
          retries: options.retries,
          minTimeout: 100,
          maxTimeout: 2000,
          factor: 5,
        }
      );

      return {
        sourceId: source.id,
        url: source.url,
        success: true,
        content: result.content,
        wordCount: result.wordCount,
        fetchDuration: Date.now() - startTime,
        // Academic metadata
        journalName: result.journalName,
        volume: result.volume,
        issue: result.issue,
        pages: result.pages,
        doi: result.doi,
        year: result.year,
        publisher: result.publisher,
        publicationType: result.publicationType,
        authorsStructured: result.authorsStructured,
        author: result.author,
      };
    } catch (error: any) {
      console.error(`Failed to fetch ${source.url} after retries:`, error.message);
      return {
        sourceId: source.id,
        url: source.url,
        success: false,
        error: error.message,
        fetchDuration: Date.now() - startTime,
      };
    }
  }
}

// Singleton instance
export const contentFetchingService = new ContentFetchingService(3);
