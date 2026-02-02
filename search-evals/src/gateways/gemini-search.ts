/**
 * Gemini Search Gateway Implementation
 * Uses Google's Gemini API with Google Search grounding
 */

import { GoogleGenAI } from "@google/genai";
import type { SearchGateway, SearchResponse } from "../types.js";
import { countTokens } from "../utils/tokens.js";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export class GeminiSearchGateway implements SearchGateway {
  async search(
    query: string,
    parameters: Record<string, unknown>
  ): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      const ai = getClient();

      // Get model from parameters or use default
      const model = (parameters.model as string) ?? "gemini-3-flash-preview";

      // Configure Google Search grounding tool
      const groundingTool = {
        googleSearch: {},
      };

      const config = {
        tools: [groundingTool],
      };

      const response = await ai.models.generateContent({
        model,
        contents: query,
        config,
      });

      const latencyMs = Date.now() - startTime;

      // Build response data including grounding metadata
      const responseData = {
        text: response.text,
        candidates: response.candidates,
        // Include grounding metadata if available
        groundingMetadata: response.candidates?.[0]?.groundingMetadata,
      };

      const tokenCount = countTokens(responseData);

      return {
        data: responseData,
        latencyMs,
        tokenCount,
        // Gemini doesn't provide a request ID in the standard response
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
