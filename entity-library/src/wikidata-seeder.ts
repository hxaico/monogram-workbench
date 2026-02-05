/* WikiData Seeder */
import { readFileSync } from 'fs'

const query = readFileSync('queries/food-ingredients.sparql', 'utf-8');

/* POST it to https://query.wikidata.org/sparql
Parse and log the JSON response */
const wikidata_url = "https://query.wikidata.org/sparql"

async function fetchIngredients() {
  const response = await fetch(wikidata_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': 'entity-library/1.0'
    },
    body: `query=${encodeURIComponent(query)}`
  });
  const data = await response.json();
  return data;
}

fetchIngredients().then(data => {
  console.log(data);
})

