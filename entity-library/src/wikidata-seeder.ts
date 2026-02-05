/**
 * WikiData Multi-Category Seeder
 *
 * Fetches seed data from WikiData for step-by-step instruction domains:
 * - Cooking & Recipes
 * - DIY & Home Repair
 * - Fitness & Workouts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { categories, categoryGroups, type Category } from './categories';

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';
const QUERIES_DIR = 'queries';
const OUTPUT_DIR = 'output';

// Rate limiting to be respectful to WikiData
const DELAY_BETWEEN_REQUESTS_MS = 1000;

interface WikiDataBinding {
  item: { value: string };
  itemLabel: { value: string; 'xml:lang'?: string };
  [key: string]: any;
}

interface WikiDataResponse {
  results: {
    bindings: WikiDataBinding[];
  };
}

interface SeedEntity {
  id: string;
  label: string;
}

// Setup output directory
mkdirSync(OUTPUT_DIR, { recursive: true });

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWikiData(query: string): Promise<WikiDataResponse> {
  const response = await fetch(WIKIDATA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': 'entity-library/1.0 (https://github.com/monogram; contact@monogram.com)'
    },
    body: `query=${encodeURIComponent(query)}`
  });

  if (!response.ok) {
    throw new Error(`WikiData API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function processResults(bindings: WikiDataBinding[]): SeedEntity[] {
  return bindings
    .filter((item) => {
      // Accept items with English labels or no language tag
      const lang = item.itemLabel['xml:lang'];
      return !lang || lang === 'en';
    })
    .map((item) => ({
      id: item.item.value.split('/').pop()!,
      label: item.itemLabel.value
    }))
    // Remove duplicates by ID
    .filter((item, index, self) =>
      index === self.findIndex(t => t.id === item.id)
    );
}

async function seedCategory(category: Category): Promise<{ success: boolean; count: number; error?: string }> {
  const queryPath = `${QUERIES_DIR}/${category.queryFile}`;

  if (!existsSync(queryPath)) {
    return { success: false, count: 0, error: `Query file not found: ${queryPath}` };
  }

  try {
    const query = readFileSync(queryPath, 'utf-8');
    const data = await fetchWikiData(query);
    const entities = processResults(data.results.bindings);

    const outputPath = `${OUTPUT_DIR}/${category.outputFile}`;
    writeFileSync(outputPath, JSON.stringify(entities, null, 2));

    return { success: true, count: entities.length };
  } catch (error) {
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function seedAll(categoryIds?: string[]): Promise<void> {
  const categoriesToSeed = categoryIds
    ? categories.filter(c => categoryIds.includes(c.id))
    : categories;

  console.log(`\n🌱 WikiData Entity Seeder`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Seeding ${categoriesToSeed.length} categories...\n`);

  const results: { category: string; success: boolean; count: number; error?: string }[] = [];

  for (const category of categoriesToSeed) {
    process.stdout.write(`  📦 ${category.name.padEnd(25)} `);

    const result = await seedCategory(category);
    results.push({ category: category.name, ...result });

    if (result.success) {
      console.log(`✅ ${result.count} entities`);
    } else {
      console.log(`❌ ${result.error}`);
    }

    // Rate limiting
    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }

  // Summary
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalEntities = successful.reduce((sum, r) => sum + r.count, 0);

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Summary`);
  console.log(`   Categories: ${successful.length}/${results.length} successful`);
  console.log(`   Total entities: ${totalEntities.toLocaleString()}`);

  if (failed.length > 0) {
    console.log(`\n⚠️  Failed categories:`);
    failed.forEach(f => console.log(`   - ${f.category}: ${f.error}`));
  }

  console.log(`\n✨ Output written to ./${OUTPUT_DIR}/\n`);
}

async function seedGroup(groupName: keyof typeof categoryGroups): Promise<void> {
  const categoryIds = categoryGroups[groupName];
  if (!categoryIds) {
    console.error(`Unknown group: ${groupName}`);
    console.log(`Available groups: ${Object.keys(categoryGroups).join(', ')}`);
    process.exit(1);
  }
  await seedAll(categoryIds);
}

// CLI handling
const args = process.argv.slice(2);

if (args.length === 0) {
  // Seed all categories
  seedAll();
} else if (args[0] === '--group' && args[1]) {
  // Seed a specific group
  seedGroup(args[1] as keyof typeof categoryGroups);
} else if (args[0] === '--category' && args[1]) {
  // Seed specific categories (comma-separated)
  const categoryIds = args[1].split(',');
  seedAll(categoryIds);
} else if (args[0] === '--list') {
  // List available categories and groups
  console.log('\n📋 Available Categories:\n');
  for (const [group, ids] of Object.entries(categoryGroups)) {
    console.log(`  ${group}:`);
    ids.forEach(id => {
      const cat = categories.find(c => c.id === id);
      console.log(`    - ${id}: ${cat?.description || ''}`);
    });
    console.log();
  }
} else {
  console.log(`
Usage: ts-node src/wikidata-seeder.ts [options]

Options:
  (no args)              Seed all categories
  --list                 List available categories and groups
  --group <name>         Seed a specific group (cooking, diy, fitness)
  --category <ids>       Seed specific categories (comma-separated IDs)

Examples:
  ts-node src/wikidata-seeder.ts
  ts-node src/wikidata-seeder.ts --list
  ts-node src/wikidata-seeder.ts --group fitness
  ts-node src/wikidata-seeder.ts --category exercises,muscle-groups,fitness-equipment
`);
}
