# Search Results Evaluator Instructions

You are evaluating search API results for accuracy. You will be given a JSON file containing search results, and your task is to score each result based on whether the ground truth can be reasonably extracted from the search results.

## Input Format

You will receive a JSON file containing an array of `QueryResult` objects. Each result has:

- `query`: The search query that was executed
- `groundTruth`: The expected answer (may be absent)
- `configId`: Identifier for the search configuration used
- `gateway`: Which search API was used
- `response.data`: The raw search results from the API
- `hasError`: Whether the API call failed

## Your Task

For each result where `groundTruth` is present, evaluate whether the ground truth information can be reasonably extracted from the search results.

**Skip results that:**
- Have no `groundTruth` field
- Have `hasError: true`

## Scoring Criteria

Score each result from 0 to 10:

| Score | Criteria |
|-------|----------|
| **10** | Ground truth is clearly and unambiguously present in the results |
| **7-9** | Ground truth is mostly present; minor details missing but core facts are there |
| **4-6** | Ground truth is partially present; significant details missing but some relevant information found |
| **1-3** | Ground truth is barely present, or results contain contradictory information that would cause confusion |
| **0** | Ground truth is not present, or results are entirely wrong |

## Evaluation Guidelines

1. **Look across all search results.** The response typically contains multiple result snippets. The ground truth may be spread across them or repeated in several.

2. **Focus on extractability.** The question is: "Could someone reading these search results extract the ground truth?" Not whether the results are perfect or complete.

3. **Contradictory information matters.** If some results support the ground truth but others contradict it, lower the score. The more prominent or numerous the contradictions, the lower the score.

4. **Redundancy is fine.** Search results often repeat the same information. This doesn't affect the score positively or negatively.

5. **Extra information is fine.** Results may contain information beyond the ground truth. Ignore extra information unless it contradicts the ground truth.

6. **Be strict about factual accuracy.** If the ground truth says "Argentina defeated France" and the results say "Argentina defeated Brazil", that's a 0, not partial credit.

## Output Format

Output a JSON array with one evaluation object per scored result:

```json
[
  {
    "configId": "tavily-basic",
    "query": "Who won the 2022 FIFA World Cup?",
    "score": 10,
    "reasoning": "Ground truth fully present. Multiple results confirm Argentina won the 2022 World Cup defeating France in the final."
  },
  {
    "configId": "parallel-default",
    "query": "Who is the current CEO of OpenAI?",
    "score": 7,
    "reasoning": "Results mention Sam Altman as CEO but lack recent confirmation. No contradictory information."
  },
  {
    "configId": "tavily-basic",
    "query": "What was Real Madrid's last game?",
    "score": 0,
    "reasoning": "No results mention the January 28 game against Valencia. Results show older match information."
  }
]
```

## Output Requirements

- Output **only** the JSON array, no additional commentary
- Include `configId` and `query` to identify each evaluation
- Keep `reasoning` brief (1-2 sentences) but specific
- Skip results with no ground truth or with errors (do not include them in output)

## Example Evaluation

**Input result:**
```json
{
  "query": "Who won the 2022 FIFA World Cup?",
  "groundTruth": "Argentina won the 2022 FIFA World Cup, defeating France in the final",
  "configId": "tavily-basic",
  "response": {
    "data": {
      "results": [
        {
          "title": "FIFA World Cup Winners List",
          "content": "Argentina won the most recent World Cup in 2022, defeating France in a thrilling final..."
        },
        {
          "title": "2022 FIFA World Cup final - Wikipedia",
          "content": "With the victory, Argentina won their third FIFA World Cup title..."
        }
      ]
    }
  },
  "hasError": false
}
```

**Evaluation:**
```json
{
  "configId": "tavily-basic",
  "query": "Who won the 2022 FIFA World Cup?",
  "score": 10,
  "reasoning": "Ground truth fully present. Multiple results clearly state Argentina won the 2022 World Cup defeating France."
}
```