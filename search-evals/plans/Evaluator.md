# LLM Evaluator Implementation Instructions

## Overview

This document describes how to implement an LLM-based evaluator that scores search results against ground truth. The evaluator reads a results JSON file, sends it to an LLM along with evaluation instructions, and writes the evaluation output to an `evals/` directory.

## Dependencies

Add to `package.json`:

```json
{
  "@anthropic-ai/sdk": "latest"
}
```

## Environment Variables

Add to `.env`:

```
ANTHROPIC_API_KEY=...
EVAL_MODEL=claude-sonnet-4-20250514
```

The `EVAL_MODEL` is optional and defaults to `claude-sonnet-4-20250514` if not specified.

## Directory Structure

```
search-evals/
├── src/
│   ├── evaluator.ts          # LLM evaluation logic (new)
│   ├── runner.ts
│   ├── index.ts
│   └── ...
├── EVALUATOR_INSTRUCTIONS.md   # Instructions for the LLM
├── results/                   # Raw search results (written by runner)
│   └── 2025-01-30T14-30-00Z.json
├── evals/                     # LLM evaluation outputs (written by evaluator)
│   └── 2025-01-30T14-30-00Z.json
└── .env
```

## Evaluator Implementation

Create `src/evaluator.ts` with the following functionality:

### Core Function

```typescript
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs/promises";
import path from "path";

const client = new Anthropic();  // Uses ANTHROPIC_API_KEY from env

export async function evaluate(resultsPath: string): Promise<string> {
  // 1. Read the results JSON file
  const results = await fs.readFile(resultsPath, "utf-8");
  
  // 2. Read the evaluator instructions
  const instructions = await fs.readFile(
    path.join(process.cwd(), "plans", "EVALUATOR_INSTRUCTIONS.md"), 
    "utf-8"
  );
  
  // 3. Call the LLM
  const response = await client.messages.create({
    model: process.env.EVAL_MODEL || "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `${instructions}\n\n## Results to Evaluate\n\n${results}`
      }
    ]
  });
  
  // 4. Extract text response
  const output = response.content[0].type === "text" 
    ? response.content[0].text 
    : "";
  
  // 5. Write to evals directory with same filename
  const filename = path.basename(resultsPath);
  await fs.mkdir(path.join(process.cwd(), "evals"), { recursive: true });
  const evalPath = path.join(process.cwd(), "evals", filename);
  await fs.writeFile(evalPath, output);
  
  console.log(`Evaluation written to: ${evalPath}`);
  
  return evalPath;
}
```

### Helper: Find Latest Results File

```typescript
export async function findLatestResultsFile(): Promise<string> {
  const resultsDir = path.join(process.cwd(), "results");
  const files = await fs.readdir(resultsDir);
  
  // Filter for JSON files and sort by name (timestamp) descending
  const jsonFiles = files
    .filter(f => f.endsWith(".json"))
    .sort()
    .reverse();
  
  if (jsonFiles.length === 0) {
    throw new Error("No results files found in results/");
  }
  
  return path.join(resultsDir, jsonFiles[0]);
}
```

### Standalone Execution

Allow the evaluator to be run directly with an optional file path argument:

```typescript
// At the bottom of evaluator.ts
async function main() {
  const fileArg = process.argv[2];
  
  let resultsPath: string;
  if (fileArg) {
    // Use provided file path
    resultsPath = path.resolve(fileArg);
  } else {
    // Find latest results file
    resultsPath = await findLatestResultsFile();
  }
  
  console.log(`Evaluating: ${resultsPath}`);
  await evaluate(resultsPath);
}

main().catch(console.error);
```

## NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "eval": "ts-node src/index.ts",
    "eval:full": "ts-node src/index.ts --with-eval",
    "eval:only": "ts-node src/evaluator.ts"
  }
}
```

Usage:
- `npm run eval` - Run searches only, write to `results/`
- `npm run eval:full` - Run searches, then run LLM evaluation, write to both `results/` and `evals/`
- `npm run eval:only` - Run LLM evaluation on the latest results file
- `npm run eval:only -- results/2025-01-30T14-30-00Z.json` - Run LLM evaluation on a specific file

## Integration with Runner

Modify `src/index.ts` to support the `--with-eval` flag:

```typescript
import { runSearches } from "./runner";
import { evaluate, findLatestResultsFile } from "./evaluator";

async function main() {
  const withEval = process.argv.includes("--with-eval");
  
  // Run searches
  const resultsPath = await runSearches();
  console.log(`Results written to: ${resultsPath}`);
  
  // Optionally run evaluation
  if (withEval) {
    console.log("Running LLM evaluation...");
    await evaluate(resultsPath);
  }
}

main().catch(console.error);
```

The `runSearches()` function in `runner.ts` should return the path to the written results file.

## Error Handling

The evaluator writes whatever the LLM returns, even if it's not valid JSON. This allows manual inspection and fixing if the LLM produces malformed output.

If you want to add a warning when the output isn't valid JSON:

```typescript
// After getting output from LLM
try {
  JSON.parse(output);
} catch {
  console.warn("Warning: LLM output is not valid JSON. Writing raw output.");
}

// Still write the output regardless
await fs.writeFile(evalPath, output);
```

## Overwriting Behavior

When `eval:only` is run with a specific file, or when `eval:full` is run, the evaluator will overwrite any existing evaluation file with the same name in `evals/`. This is intentional - it allows re-running evaluations.

## Example Workflow

```bash
# Run searches only
npm run eval
# -> writes results/2025-01-30T14-30-00Z.json

# Run evaluation on that file
npm run eval:only
# -> reads results/2025-01-30T14-30-00Z.json (latest)
# -> writes evals/2025-01-30T14-30-00Z.json

# Or do both in one command
npm run eval:full
# -> writes results/2025-01-30T14-30-00Z.json
# -> writes evals/2025-01-30T14-30-00Z.json

# Re-run evaluation on a specific old file
npm run eval:only -- results/2025-01-28T10-00-00Z.json
# -> overwrites evals/2025-01-28T10-00-00Z.json
```

## Summary

1. Install `@anthropic-ai/sdk`
2. Add `ANTHROPIC_API_KEY` and optionally `EVAL_MODEL` to `.env`
3. Create `src/evaluator.ts` with `evaluate()` and `findLatestResultsFile()`
4. Update `src/index.ts` to support `--with-eval` flag
5. Add npm scripts for `eval`, `eval:full`, and `eval:only`
6. Create `evals/` directory (or let it be created automatically)