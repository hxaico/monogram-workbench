/**
 * Search Evaluation Runner
 *
 * Orchestrates running queries against gateway configurations and saving results.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  SearchQuery,
  SearchConfig,
  QueryResult,
  RunResult,
  SearchResponse,
} from "./types.js";
import { getGateway } from "./gateways/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

/**
 * Check if a query is runnable based on its validity window
 */
export function isQueryRunnable(query: SearchQuery, now: Date): boolean {
  // No validity window = always runnable (non-temporal)
  if (!query.validFrom && !query.validUntil) return true;

  // Check validity window
  if (query.validFrom && now < new Date(query.validFrom)) return false;
  if (query.validUntil && now > new Date(query.validUntil)) return false;

  return true;
}

/**
 * Load queries from JSON files
 */
async function loadQueries(): Promise<SearchQuery[]> {
  const queriesDir = join(projectRoot, "queries");

  const [staticQueries, temporalQueries] = await Promise.all([
    readFile(join(queriesDir, "queries-static.json"), "utf-8").then(
      (content) => JSON.parse(content) as SearchQuery[]
    ),
    readFile(join(queriesDir, "queries-temporal.json"), "utf-8").then(
      (content) => JSON.parse(content) as SearchQuery[]
    ),
  ]);

  return [...staticQueries, ...temporalQueries];
}

function isValidIsoDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function validateQueries(queries: SearchQuery[]): SearchQuery[] {
  const valid: SearchQuery[] = [];
  const warnings: string[] = [];

  queries.forEach((query, index) => {
    if (!query || typeof query !== "object") {
      warnings.push(`Query #${index + 1} is not an object.`);
      return;
    }

    if (typeof query.query !== "string" || query.query.trim().length === 0) {
      warnings.push(`Query #${index + 1} has an invalid or empty "query" field.`);
      return;
    }

    if (
      query.groundTruth !== undefined &&
      typeof query.groundTruth !== "string"
    ) {
      warnings.push(`Query #${index + 1} has a non-string "groundTruth".`);
      return;
    }

    if (query.validFrom && !isValidIsoDate(query.validFrom)) {
      warnings.push(`Query #${index + 1} has invalid "validFrom": ${query.validFrom}`);
      return;
    }

    if (
      query.validUntil !== undefined &&
      query.validUntil !== null &&
      (!query.validUntil || !isValidIsoDate(query.validUntil))
    ) {
      warnings.push(`Query #${index + 1} has invalid "validUntil": ${query.validUntil}`);
      return;
    }

    if (query.validFrom && query.validUntil) {
      const from = new Date(query.validFrom).getTime();
      const until = new Date(query.validUntil).getTime();
      if (from > until) {
        warnings.push(`Query #${index + 1} has validFrom after validUntil.`);
        return;
      }
    }

    valid.push(query);
  });

  if (warnings.length > 0) {
    console.warn(`Warning: Skipped ${warnings.length} invalid queries:`);
    warnings.slice(0, 10).forEach((warning) => console.warn(`  - ${warning}`));
    if (warnings.length > 10) {
      console.warn(`  - ...and ${warnings.length - 10} more.`);
    }
    console.warn("");
  }

  return valid;
}

/**
 * Generate a timestamp-based filename for results
 */
function generateResultFilename(): string {
  const now = new Date();
  // Replace colons with dashes for filesystem safety
  const timestamp = now.toISOString().replace(/:/g, "-");
  return `${timestamp}.json`;
}

/**
 * Execute a single query against a config and return the result
 */
async function executeQuery(
  query: SearchQuery,
  config: SearchConfig
): Promise<QueryResult> {
  const startTime = Date.now();
  const executedAt = new Date().toISOString();
  let response: SearchResponse;

  try {
    const gateway = getGateway(config.gateway);
    response = await gateway.search(query.query, config.parameters);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    response = {
      data: null,
      latencyMs: Date.now() - startTime,
      tokenCount: 0,
      error: errorMessage,
    };
  }

  return {
    // Query info
    query: query.query,
    groundTruth: query.groundTruth,
    validFrom: query.validFrom,
    validUntil: query.validUntil,

    // Config info
    configId: config.id,
    gateway: config.gateway,
    parameters: config.parameters,

    // Execution info
    executedAt,

    // Response
    response,

    // Quick flag for scanning
    hasError: !!response.error,
  };
}

/**
 * Run all query × config combinations and return results
 */
export async function runEvaluation(
  configs: SearchConfig[]
): Promise<RunResult> {
  const now = new Date();
  const runId = now.toISOString().replace(/:/g, "-");

  console.log(`Starting evaluation run: ${runId}`);

  const requiredEnvByGateway: Record<string, string[]> = {
    tavily: ["TAVILY_API_KEY"],
    parallel: ["PARALLEL_API_KEY"],
  };

  const runnableConfigs = configs.filter((config) => {
    const required = requiredEnvByGateway[config.gateway] ?? [];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      console.warn(
        `Skipping config ${config.id} (missing ${missing.join(", ")})`
      );
      return false;
    }
    return true;
  });

  if (runnableConfigs.length === 0) {
    console.warn("No runnable configs. Set missing API keys to run evaluations.");
    return { id: runId, executedAt: now.toISOString(), results: [] };
  }

  // Load all queries
  const allQueries = await loadQueries();
  console.log(`Loaded ${allQueries.length} total queries`);
  const validatedQueries = validateQueries(allQueries);

  // Filter to runnable queries
  const runnableQueries = validatedQueries.filter((q) => isQueryRunnable(q, now));
  console.log(`${runnableQueries.length} queries are within validity window`);

  const skippedCount = allQueries.length - runnableQueries.length;
  if (skippedCount > 0) {
    console.log(`Skipped ${skippedCount} queries outside validity window`);
  }

  // Calculate total combinations
  const totalCombinations = runnableQueries.length * runnableConfigs.length;
  console.log(
    `Running ${runnableQueries.length} queries × ${runnableConfigs.length} configs = ${totalCombinations} combinations`
  );
  console.log("");

  // Execute all combinations
  const results: QueryResult[] = [];
  let completed = 0;

  for (const query of runnableQueries) {
    for (const config of runnableConfigs) {
      completed++;
      console.log(
        `[${completed}/${totalCombinations}] "${query.query.substring(0, 40)}..." → ${config.id}`
      );

      const result = await executeQuery(query, config);
      results.push(result);

      if (result.hasError) {
        console.log(`  ⚠ Error: ${result.response.error}`);
      } else {
        console.log(
          `  ✓ ${result.response.latencyMs}ms, ${result.response.tokenCount} tokens`
        );
      }
    }
  }

  return {
    id: runId,
    executedAt: now.toISOString(),
    results,
  };
}

/**
 * Save run results to a JSON file
 */
export async function saveResults(runResult: RunResult): Promise<string> {
  const resultsDir = join(projectRoot, "results");

  // Ensure results directory exists
  await mkdir(resultsDir, { recursive: true });

  const filename = `${runResult.id}.json`;
  const filepath = join(resultsDir, filename);

  await writeFile(filepath, JSON.stringify(runResult, null, 2), "utf-8");

  return filepath;
}

/**
 * Print a summary of the run results
 */
export function printSummary(runResult: RunResult): void {
  const { results } = runResult;
  const totalResults = results.length;
  const errorCount = results.filter((r) => r.hasError).length;
  const successCount = totalResults - errorCount;

  console.log("");
  console.log("=".repeat(60));
  console.log("RUN SUMMARY");
  console.log("=".repeat(60));
  console.log(`Run ID: ${runResult.id}`);
  console.log(`Total results: ${totalResults}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);

  if (totalResults > 0) {
    // Calculate averages for successful results
    const successfulResults = results.filter((r) => !r.hasError);
    if (successfulResults.length > 0) {
      const avgLatency =
        successfulResults.reduce((sum, r) => sum + r.response.latencyMs, 0) /
        successfulResults.length;
      const avgTokens =
        successfulResults.reduce((sum, r) => sum + r.response.tokenCount, 0) /
        successfulResults.length;

      console.log(`Average latency: ${avgLatency.toFixed(0)}ms`);
      console.log(`Average tokens: ${avgTokens.toFixed(0)}`);
    }

    // Group by config
    console.log("");
    console.log("Results by config:");
    const byConfig = new Map<string, QueryResult[]>();
    for (const result of results) {
      const existing = byConfig.get(result.configId) || [];
      existing.push(result);
      byConfig.set(result.configId, existing);
    }

    for (const [configId, configResults] of byConfig) {
      const configErrors = configResults.filter((r) => r.hasError).length;
      const configSuccess = configResults.length - configErrors;
      console.log(`  ${configId}: ${configSuccess}/${configResults.length} successful`);
    }

    console.log("");
    console.log("Results by gateway:");
    const byGateway = new Map<string, QueryResult[]>();
    for (const result of results) {
      const existing = byGateway.get(result.gateway) || [];
      existing.push(result);
      byGateway.set(result.gateway, existing);
    }

    for (const [gateway, gatewayResults] of byGateway) {
      const gatewayErrors = gatewayResults.filter((r) => r.hasError).length;
      const gatewaySuccess = gatewayResults.length - gatewayErrors;
      console.log(`  ${gateway}: ${gatewaySuccess}/${gatewayResults.length} successful`);
    }
  }

  console.log("=".repeat(60));
}
