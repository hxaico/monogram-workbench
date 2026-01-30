/**
 * Token counting utilities using tiktoken
 */

import { encoding_for_model } from "tiktoken";
import type { TiktokenModel } from "tiktoken";

const tokenModel = (process.env.SEARCH_EVALS_TOKEN_MODEL ?? "gpt-4") as TiktokenModel;
let encoder: ReturnType<typeof encoding_for_model>;
try {
  encoder = encoding_for_model(tokenModel);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(
    `Invalid SEARCH_EVALS_TOKEN_MODEL "${tokenModel}": ${message}`
  );
}

/**
 * Count tokens in a string or object using tiktoken
 * @param data - String or object to count tokens for
 * @returns Number of tokens
 */
export function countTokens(data: unknown): number {
  const text = typeof data === "string" ? data : JSON.stringify(data);
  const tokens = encoder.encode(text);
  return tokens.length;
}
