/**
 * LLM Evaluator
 *
 * Evaluates search results against ground truth using OpenAI.
 * Reads results from results/, sends to LLM with instructions, writes to evals/.
 */

import "dotenv/config";
import OpenAI from "openai";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, dirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

const client = new OpenAI(); // Uses OPENAI_API_KEY from env

/**
 * Find the most recent results file in results/
 */
export async function findLatestResultsFile(): Promise<string> {
  const resultsDir = join(projectRoot, "results");
  const files = await readdir(resultsDir);

  // Filter for JSON files and sort by name (timestamp) descending
  const jsonFiles = files.filter((f) => f.endsWith(".json")).sort().reverse();

  if (jsonFiles.length === 0) {
    throw new Error("No results files found in results/");
  }

  return join(resultsDir, jsonFiles[0]);
}

/**
 * Evaluate search results using OpenAI
 */
export async function evaluate(resultsPath: string): Promise<string> {
  // 1. Read the results JSON file
  const results = await readFile(resultsPath, "utf-8");

  // 2. Read the evaluator instructions
  const instructions = await readFile(
    join(projectRoot, "EVALUATOR_INSTRUCTIONS.md"),
    "utf-8"
  );

  // 3. Call OpenAI
  const model = process.env.EVAL_MODEL || "gpt-4o";
  console.log(`Using model: ${model}`);

  const response = await client.chat.completions.create({
    model,
    max_completion_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `${instructions}\n\n## Results to Evaluate\n\n${results}`,
      },
    ],
  });

  // 4. Extract text response
  const output = response.choices[0]?.message?.content || "";

  // 5. Warn if output isn't valid JSON
  try {
    JSON.parse(output);
  } catch {
    console.warn("Warning: LLM output is not valid JSON. Writing raw output.");
  }

  // 6. Write to evals directory with same filename
  const filename = basename(resultsPath);
  const evalsDir = join(projectRoot, "evals");
  await mkdir(evalsDir, { recursive: true });
  const evalPath = join(evalsDir, filename);
  await writeFile(evalPath, output);

  console.log(`Evaluation written to: ${evalPath}`);

  return evalPath;
}

/**
 * Main function for standalone execution
 */
async function main(): Promise<void> {
  // Validate environment
  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY is not set in environment.");
    console.error("Set it in .env or export it before running.");
    process.exit(1);
  }

  const fileArg = process.argv[2];

  let resultsPath: string;
  if (fileArg) {
    // Use provided file path
    resultsPath = resolve(fileArg);
  } else {
    // Find latest results file
    resultsPath = await findLatestResultsFile();
  }

  console.log(`Evaluating: ${resultsPath}`);
  await evaluate(resultsPath);
}

// Only run main() when executed directly, not when imported
const isMainModule = process.argv[1]?.endsWith("evaluator.js");
if (isMainModule) {
  main().catch((error) => {
    console.error("Error during evaluation:", error);
    process.exit(1);
  });
}
