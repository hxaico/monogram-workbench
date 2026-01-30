/**
 * Tavily Search Gateway Implementation
 */

import { tavily, TavilyClient } from "@tavily/core";
import type { SearchGateway, SearchResponse } from "../types.js";
import { countTokens } from "../utils/tokens.js";

let client: TavilyClient | null = null;

function getClient(): TavilyClient {
  if (!client) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      throw new Error("TAVILY_API_KEY environment variable is not set");
    }
    client = tavily({ apiKey });
  }
  return client;
}

export class TavilyGateway implements SearchGateway {
  async search(
    query: string,
    parameters: Record<string, unknown>
  ): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      const tavilyClient = getClient();

      // Build search options from parameters
      const searchOptions = {
        searchDepth: (parameters.searchDepth as "basic" | "advanced") ?? "basic",
        includeAnswer: (parameters.includeAnswer as boolean) ?? false,
        includeRawContent:
          (parameters.includeRawContent as false | "markdown" | "text") ?? false,
        includeImageDescriptions:
          (parameters.includeImageDescriptions as boolean) ?? false,
        includeFavicon: (parameters.includeFavicon as boolean) ?? true,
        maxResults: (parameters.maxResults as number) ?? 5,
      };

      const response = await tavilyClient.search(query, searchOptions);

      const latencyMs = Date.now() - startTime;
      const tokenCount = countTokens(response);

      return {
        data: response,
        latencyMs,
        tokenCount,
        // Tavily doesn't provide a request ID in the response
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
