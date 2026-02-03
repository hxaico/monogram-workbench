/**
 * Perplexity Search Gateway Implementation
 */

import Perplexity from "@perplexity-ai/perplexity_ai";
import type { SearchGateway, SearchResponse } from "../types.js";
import { countTokens } from "../utils/tokens.js";

let client: Perplexity | null = null;

function getClient(): Perplexity {
  if (!client) {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new Error("PERPLEXITY_API_KEY environment variable is not set");
    }
    client = new Perplexity({ apiKey });
  }
  return client;
}

export class PerplexityGateway implements SearchGateway {
  async search(
    query: string,
    parameters: Record<string, unknown>
  ): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      const perplexityClient = getClient();

      // Build search options from parameters
      // Note: Perplexity SDK uses snake_case for parameter names
      const searchOptions: {
        query: string;
        max_results?: number;
        max_tokens_per_page?: number;
        search_recency_filter?: "hour" | "day" | "week" | "month" | "year";
        country?: string;
        search_domain_filter?: string[];
      } = {
        query,
        max_results: (parameters.max_results as number) ?? 5,
      };

      // Optional parameters
      if (parameters.max_tokens_per_page) {
        searchOptions.max_tokens_per_page = parameters.max_tokens_per_page as number;
      }
      if (parameters.search_recency_filter) {
        searchOptions.search_recency_filter = parameters.search_recency_filter as
          | "hour"
          | "day"
          | "week"
          | "month"
          | "year";
      }
      if (parameters.country) {
        searchOptions.country = parameters.country as string;
      }
      if (parameters.search_domain_filter) {
        searchOptions.search_domain_filter =
          parameters.search_domain_filter as string[];
      }

      const response = await perplexityClient.search.create(searchOptions);

      const latencyMs = Date.now() - startTime;
      const tokenCount = countTokens(response);

      return {
        data: response,
        latencyMs,
        tokenCount,
        // Extract request ID if available
        requestId: response.id,
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
