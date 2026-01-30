/**
 * Search Configurations
 * 
 * Define different gateway + parameter combinations to test.
 * Each config has a unique ID for identification in results.
 */

import type { SearchConfig } from "./types.js";

export const configs: SearchConfig[] = [
  // Tavily configurations
  {
    id: "tavily-basic",
    gateway: "tavily",
    parameters: {
      searchDepth: "basic",
      includeAnswer: false,
      maxResults: 5,
    },
  },
  {
    id: "tavily-advanced",
    gateway: "tavily",
    parameters: {
      searchDepth: "advanced",
      includeAnswer: true,
      maxResults: 5,
    },
  },

  // Parallel configurations
  {
    id: "parallel-default",
    gateway: "parallel",
    parameters: {
      max_results: 2,
      max_chars_per_result: 4000,
    },
  },
  {
    id: "parallel-extended",
    gateway: "parallel",
    parameters: {
      max_results: 5,
      max_chars_per_result: 8000,
    },
  },

  // You.com configurations
  {
    id: "you-default",
    gateway: "you",
    parameters: {
      count: 5,
    },
  },
  {
    id: "you-fresh",
    gateway: "you",
    parameters: {
      count: 5,
      freshness: "week",
    },
  },
];
