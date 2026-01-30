/**
 * You.com Search Gateway Implementation
 */

import { You } from "@youdotcom-oss/sdk";
import type { SearchGateway, SearchResponse } from "../types.js";
import { countTokens } from "../utils/tokens.js";

let client: You | null = null;

function getClient(): You {
  if (!client) {
    const apiKey = process.env.YOU_API_KEY;
    if (!apiKey) {
      throw new Error("YOU_API_KEY environment variable is not set");
    }
    client = new You({ apiKeyAuth: apiKey });
  }
  return client;
}

export class YouGateway implements SearchGateway {
  async search(
    query: string,
    parameters: Record<string, unknown>
  ): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      const youClient = getClient();

      // Build search options from parameters
      const searchRequest: {
        query: string;
        count?: number;
        freshness?: string;
        country?: string;
        safesearch?: string;
      } = {
        query,
        count: (parameters.count as number) ?? 10,
      };

      // Optional parameters
      if (parameters.freshness) {
        searchRequest.freshness = parameters.freshness as string;
      }
      if (parameters.country) {
        searchRequest.country = parameters.country as string;
      }
      if (parameters.safesearch) {
        searchRequest.safesearch = parameters.safesearch as string;
      }

      const response = await youClient.search(searchRequest);

      const latencyMs = Date.now() - startTime;
      const tokenCount = countTokens(response);

      return {
        data: response,
        latencyMs,
        tokenCount,
        // Extract search UUID if available
        requestId: response.metadata?.searchUuid,
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
