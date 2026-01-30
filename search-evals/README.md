# Search Evals

A small TypeScript runner for comparing search API gateways. It executes a set of queries against multiple gateway configurations, stores the raw responses, and optionally evaluates results against ground truth using an LLM.

## Quick Start

1) Copy `.env.example` to `.env` and add API keys.  
2) Install deps and run:

```bash
npm install
npm run eval
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run eval` | Run searches only, write results to `results/` |
| `npm run eval:full` | Run searches + LLM evaluation, write to both `results/` and `evals/` |
| `npm run eval:only` | Run LLM evaluation on the latest results file |
| `npm run eval:only -- <path>` | Run LLM evaluation on a specific results file |

## Queries and Results

- Queries live in `queries/queries-static.json` and `queries/queries-temporal.json`.
- Temporal queries are only run if their `validFrom` / `validUntil` window includes the current time.
- Results are saved as JSON in `results/` with a timestamped filename.
- LLM evaluations are saved in `evals/` with the same filename as the corresponding results.

## LLM Evaluator

The evaluator sends search results to an LLM (OpenAI by default) along with instructions from `EVALUATOR_INSTRUCTIONS.md`. It scores each result from 0-10 based on whether the ground truth can be extracted from the search results.

## Project Structure

- Gateways: `src/gateways/`
- Configs: `src/configs.ts`
- Runner: `src/runner.ts`
- Evaluator: `src/evaluator.ts`
- Types: `src/types.ts`
