/**
 * Search Evals - Main Entry Point
 *
 * Run search evaluations against multiple gateway configurations.
 *
 * Usage:
 *   npm run eval          - Run searches only
 *   npm run eval:full     - Run searches + LLM evaluation
 */

import "dotenv/config";
import { configs } from "./configs.js";
import { runEvaluation, saveResults, printSummary } from "./runner.js";
import { evaluate } from "./evaluator.js";

async function main(): Promise<void> {
  const withEval = process.argv.includes("--with-eval");

  console.log("Search Evals - Evaluation Framework");
  console.log("===================================");
  console.log("");

  // Validate environment
  const missingKeys: string[] = [];
  if (!process.env.TAVILY_API_KEY) {
    missingKeys.push("TAVILY_API_KEY");
  }
  if (!process.env.PARALLEL_API_KEY) {
    missingKeys.push("PARALLEL_API_KEY");
  }

  if (missingKeys.length > 0) {
    console.warn(`Warning: Missing API keys: ${missingKeys.join(", ")}`);
    console.warn("Configs requiring missing keys will be skipped. Set them in .env.");
    console.warn("");
  }

  // Warn if --with-eval but no OpenAI key
  if (withEval && !process.env.OPENAI_API_KEY) {
    console.warn("Warning: --with-eval specified but OPENAI_API_KEY is not set.");
    console.warn("LLM evaluation will fail. Set it in .env.");
    console.warn("");
  }

  try {
    // Run evaluation
    const runResult = await runEvaluation(configs);

    // Save results
    const filepath = await saveResults(runResult);
    console.log("");
    console.log(`Results saved to: ${filepath}`);

    // Print summary
    printSummary(runResult);

    // Run LLM evaluation if requested
    if (withEval) {
      console.log("");
      console.log("Running LLM evaluation...");
      await evaluate(filepath);
    }

    // Exit with error code if there were failures
    const errorCount = runResult.results.filter((r) => r.hasError).length;
    if (errorCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Fatal error during evaluation:", error);
    process.exit(1);
  }
}

main();
