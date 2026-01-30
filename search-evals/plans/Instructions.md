# Search Evals - Project Instructions

## Overview

This is a Node.js/TypeScript project for evaluating search API providers (gateways) like Tavily, Perplexity, and others. The goal is to test how well these APIs perform for LLM-oriented search tasks by running queries, capturing responses, and storing results for inspection and later evaluation.

## Core Concepts

### Queries and Ground Truth

- A **SearchQuery** is a simple string query with an optional ground truth
- **Ground truth** is plain text describing what the answer should contain
- Ground truth relates to the query, not to any specific gateway configuration
- Queries are temporal - the answer to "What's Real Madrid's latest game?" depends on when you ask

### Gateways

- A **SearchGateway** is an interface that wraps a search API provider
- Each gateway implements a single `search(query, parameters)` function
- Gateways return raw, unprocessed API responses - we're testing the APIs themselves
- Examples: Tavily, Perplexity, and others to be added

### Configurations

- A **SearchConfig** specifies which gateway to use and what parameters to pass
- The same query can be run against multiple configs
- The same gateway can appear in multiple configs with different parameters
- This allows testing across two dimensions: different providers AND different parameter settings
- Each config has an `id` for easy identification (e.g., "tavily-basic", "tavily-advanced")

### Results

- A **QueryResult** is fully self-contained - no indices or lookups required
- Each result embeds the query, ground truth, config details, and response
- This redundancy is intentional - it makes results easy to read and inspect
- Results include a `hasError` flag for quick scanning of failures
- Errors are stored at the response level (`response.error`) since that's where failures occur

### Runs

- A **RunResult** is a collection of QueryResults from a single execution
- Stored as JSON files in the `results/` directory
- Named by timestamp (e.g., `2025-01-30T14-30-00Z.json`)
- Each run file is self-contained and human-readable

## Project Structure

```
search-evals/
├── package.json
├── tsconfig.json
├── src/
│   ├── types.ts              # All type definitions (provided)
│   ├── index.ts              # Main entry point
│   ├── gateways/
│   │   ├── index.ts          # Gateway registry/factory
│   │   ├── tavily.ts         # Tavily implementation
│   │   └── parallel.ts       # Parallel implementation
│   ├── configs.ts            # Search configurations to test
│   └── runner.ts             # Orchestrates running queries against configs
├── queries/
│   ├── queries-static.json   # Non-temporal queries (fixed answers)
│   └── queries-temporal.json # Temporal queries (with validity windows)
├── results/                  # Output directory for run results
└── .env                      # API keys (not committed)
```

## Implementation Tasks

### 1. Project Setup

- Initialize Node.js project with TypeScript
- Configure tsconfig.json for ES modules
- Install dependencies:
  - `tiktoken` for token counting
  - `dotenv` for environment variables
  - Provider SDKs as needed (or use fetch directly)

### 2. Gateway Implementations

Each gateway must implement the `SearchGateway` interface:

```typescript
interface SearchGateway {
  search(query: string, parameters: Record<string, unknown>): Promise<SearchResponse>;
}
```

For each gateway implementation:
- Make the API call with the provided query and parameters
- Measure latency (start time to response time)
- Calculate token count of the response using tiktoken
- Capture the request ID if the API provides one
- Return the raw response as `data` - do not process or transform it
- Catch errors and return them in `response.error`

#### Tavily Implementation Example

Package: `"@tavily/core": "0.5.12"`

```typescript
import { tavily, TavilyClient, TavilySearchResponse } from "@tavily/core";

let client: TavilyClient | null = null;

function getClient(): TavilyClient {
  if (!client) {
    const apiKey = process.env.TAVILY_API_KEY!;
    client = tavily({ apiKey });
  }
  return client;
}

// Example search call
const tavilyResponse: TavilySearchResponse = await getClient().search(query, {
  searchDepth: "basic",        // or "advanced"
  includeAnswer: false,
  includeRawContent: false,
  includeImageDescriptions: false,
  includeFavicon: true,
  // ... other options from parameters
});
```

#### Parallel Implementation Example

Package: `"parallel-web"`

```typescript
import Parallel from "parallel-web";
import type { SearchResult as ParallelSearchResult } from "parallel-web/resources/beta/beta";

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

// Example search call
const searchResponse: ParallelSearchResult = await getClient().beta.search({
  search_queries: [query],
  max_results: 2,
  excerpts: {
    max_chars_per_result: 4000,
  },
});
```

### 3. Queries Files

Queries are stored in two separate JSON files for easier management:
- `queries-static.json` - non-temporal queries (fixed answers, no validity window)
- `queries-temporal.json` - temporal queries (answers change over time, with validity windows)

Both files contain arrays of `SearchQuery` objects. The runner loads and combines them.

#### Non-temporal queries

These have answers that don't change (after the relevant event):
- "Who won the 2022 World Cup?" → "Argentina" (forever true)
- "What year did the Berlin Wall fall?" → "1989"

No `validFrom` or `validUntil` needed.

**queries-static.json**
```json
[
  {
    "query": "Who won the 2022 World Cup?",
    "groundTruth": "Argentina"
  },
  {
    "query": "What year did the Berlin Wall fall?",
    "groundTruth": "1989"
  }
]
```

#### Temporal queries

These have answers that depend on when you ask:
- "What was Real Madrid's latest game?" → depends on today
- "Who is the current CEO of OpenAI?" → could change

Use `validFrom` and `validUntil` to define when the ground truth is accurate:
- `validFrom`: when the ground truth became true (e.g., after a game ended)
- `validUntil`: when the ground truth expires (e.g., before the next game starts, minus ~1 hour buffer)

Set `validUntil` to just before the next relevant event (e.g., 1 hour before the next game kickoff). This avoids the ambiguous "during event" state and maximizes your testing window.

Set `validUntil` to `null` for things that are currently true but could change (e.g., current CEO).

**queries-temporal.json**
```json
[
  {
    "query": "What was Real Madrid's last game?",
    "groundTruth": "Real Madrid beat Valencia 3-1 on January 28, 2025",
    "validFrom": "2025-01-28T23:00:00Z",
    "validUntil": "2025-02-01T19:00:00Z"
  },
  {
    "query": "What was Real Madrid's last game?",
    "groundTruth": "Real Madrid drew 2-2 with Atletico on February 1, 2025",
    "validFrom": "2025-02-01T23:00:00Z",
    "validUntil": "2025-02-05T19:00:00Z"
  },
  {
    "query": "Who is the current CEO of OpenAI?",
    "groundTruth": "Sam Altman",
    "validFrom": "2024-01-01T00:00:00Z",
    "validUntil": null
  }
]
```

#### Filtering queries at runtime

The runner should skip temporal queries outside their validity window:

```typescript
function isQueryRunnable(query: SearchQuery, now: Date): boolean {
  // No validity window = always runnable (non-temporal)
  if (!query.validFrom && !query.validUntil) return true;
  
  // Check validity window
  if (query.validFrom && now < new Date(query.validFrom)) return false;
  if (query.validUntil && now > new Date(query.validUntil)) return false;
  
  return true;
}
```

#### Analyzing recency

Since `QueryResult` captures `executedAt` and `SearchQuery` has `validFrom`, you can later compute how long after an event the query was run:

```typescript
const timeSinceEvent = new Date(result.executedAt).getTime() - new Date(query.validFrom).getTime();
```

This helps analyze whether search APIs return better results 6 hours vs 48 hours after an event.

### 4. Configs File

Create search configurations to test:
- Multiple gateways (tavily, perplexity, etc.)
- Same gateway with different parameters
- Give each config a descriptive `id`

Example:
```typescript
export const configs: SearchConfig[] = [
  {
    id: "tavily-basic",
    gateway: "tavily",
    parameters: { searchDepth: "basic" }
  },
  {
    id: "tavily-advanced",
    gateway: "tavily",
    parameters: { searchDepth: "advanced", includeAnswer: true }
  },
  {
    id: "parallel-default",
    gateway: "parallel",
    parameters: { max_results: 2 }
  },
  {
    id: "parallel-extended",
    gateway: "parallel",
    parameters: { max_results: 5, max_chars_per_result: 8000 }
  }
];
```

### 5. Runner

The runner orchestrates execution:
- Load queries from `queries/queries-static.json` and `queries/queries-temporal.json`
- Load configs from `configs.ts`
- Filter out queries outside their validity window (using `isQueryRunnable`)
- For each runnable query × config combination:
  - Resolve the gateway from the config
  - Call `gateway.search(query.query, config.parameters)`
  - Build a `QueryResult` with all context embedded (including `validFrom`/`validUntil` if present)
  - Set `hasError: true` if `response.error` is present
  - Capture `executedAt` timestamp for each individual call
- Collect all results into a `RunResult`
- Save to `results/{timestamp}.json`

### 6. Gateway Registry

Create a simple registry to resolve gateway names to implementations:

```typescript
const gateways: Record<string, SearchGateway> = {
  tavily: new TavilyGateway(),
  parallel: new ParallelGateway(),
};

export function getGateway(name: string): SearchGateway {
  const gateway = gateways[name];
  if (!gateway) throw new Error(`Unknown gateway: ${name}`);
  return gateway;
}
```

### 7. Main Entry Point

The main script should:
- Load queries and configs
- Run all combinations
- Save results to JSON
- Optionally print a summary (total queries, errors, etc.)

## Key Design Decisions

1. **Raw responses only** - We store the unprocessed API response because we're evaluating the APIs themselves, not our processing of them.

2. **Self-contained results** - Each `QueryResult` embeds all context (query, ground truth, config). This introduces redundancy but makes results easy to read and inspect without cross-referencing.

3. **Errors at response level** - Errors belong in `SearchResponse` because that's where failures happen. The `hasError` flag on `QueryResult` is just for convenience when scanning.

4. **Flexible parameters** - `parameters` is `Record<string, unknown>` to accommodate different APIs. Each gateway knows how to interpret its own parameters.

5. **Config IDs required** - Every config needs an `id` for easy identification in results.

6. **Token counting required** - Always calculate token count using tiktoken, as this affects LLM context usage.

## Environment Variables

```
TAVILY_API_KEY=...
PARALLEL_API_KEY=...
```

## Dependencies

```json
{
  "@tavily/core": "0.5.12",
  "parallel-web": "latest",
  "tiktoken": "latest",
  "dotenv": "latest"
}
```

## Running

```bash
npm run eval  # or whatever script name you choose
```

This will:
1. Load queries and configs
2. Execute all query × config combinations
3. Save results to `results/{timestamp}.json`

## Future Considerations (Not for Initial Implementation)

- LLM-based evaluation of results against ground truth
- Scoring system (relevance, accuracy, latency normalized)
- Comparison reports across gateways
- Web UI for browsing results
- More sophisticated ground truth formats
