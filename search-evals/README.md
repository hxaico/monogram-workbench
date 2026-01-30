# Search Evals

A small TypeScript runner for comparing search API gateways. It executes a set of queries against multiple gateway configurations, stores the raw responses, and outputs a summary for quick inspection.

## Quick Start

1) Copy `.env.example` to `.env` and add API keys.  
2) Install deps and run:

```bash
npm install
npm run eval
```

## Queries and Results

- Queries live in `queries/queries-static.json` and `queries/queries-temporal.json`.
- Temporal queries are only run if their `validFrom` / `validUntil` window includes the current time.
- Results are saved as JSON in `results/` with a timestamped filename.

## Project Structure

- Gateways: `src/gateways/`
- Configs: `src/configs.ts`
- Runner: `src/runner.ts`
- Types: `src/types.ts`
