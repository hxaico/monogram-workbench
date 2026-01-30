export interface SearchQuery {
  query: string;
  groundTruth?: string;
  validFrom?: string;
  validUntil?: string | null;
}

export interface SearchConfig {
  id: string;
  gateway: string;
  parameters: Record<string, unknown>;
}

export interface SearchGateway {
  search(query: string, parameters: Record<string, unknown>): Promise<SearchResponse>;
}

export interface SearchResponse {
  data: unknown;
  latencyMs: number;
  tokenCount: number;
  requestId?: string;
  error?: string;
}

export interface QueryResult {
  query: string;
  groundTruth?: string;
  validFrom?: string;
  validUntil?: string | null;

  configId: string;
  gateway: string;
  parameters: Record<string, unknown>;

  executedAt: string;

  response: SearchResponse;

  hasError: boolean;
}

export interface RunResult {
  id: string;
  executedAt: string;
  results: QueryResult[];
}
