/**
 * Parallel Search Gateway Implementation
 */

import Parallel from "parallel-web";
import type { SearchGateway, SearchResponse } from "../types.js";
import { countTokens } from "../utils/tokens.js";

let client: Parallel | null = null;

function getClient(): Parallel {
  if (!client) {
    const apiKey = process.env.PARALLEL_API_KEY;
    if (!apiKey) {
      throw new Error("PARALLEL_API_KEY environment variable is not set");
    }
    client = new Parallel({ apiKey });
  }
  return client;
}

export class ParallelGateway implements SearchGateway {
  async search(
    query: string,
    parameters: Record<string, unknown>
  ): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      const parallelClient = getClient();

      // Build search options from parameters
      const maxResults = (parameters.max_results as number) ?? 2;
      const maxCharsPerResult =
        (parameters.max_chars_per_result as number) ?? 4000;

      const response = await parallelClient.beta.search({
        search_queries: [query],
        max_results: maxResults,
        excerpts: {
          max_chars_per_result: maxCharsPerResult,
        },
      });

      const latencyMs = Date.now() - startTime;
      const tokenCount = countTokens(response);

      return {
        data: response,
        latencyMs,
        tokenCount,
        // Check if Parallel provides a request ID
        requestId: (response as unknown as Record<string, unknown>).request_id as
          | string
          | undefined,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        data: null,
        latencyMs,
        tokenCount: 0,
        error: errorMessage,
      };
    }
  }
}
