/**
 * Category definitions for WikiData seed data
 * Focused on domains with step-by-step instructions
 */

export interface Category {
  id: string;
  name: string;
  description: string;
  queryFile: string;
  outputFile: string;
}

export const categories: Category[] = [
  // === COOKING & RECIPES ===
  {
    id: 'food-ingredients',
    name: 'Food Ingredients',
    description: 'Ingredients used in cooking recipes',
    queryFile: 'food-ingredients.sparql',
    outputFile: 'food-ingredients.json',
  },
  {
    id: 'cooking-techniques',
    name: 'Cooking Techniques',
    description: 'Methods and techniques used in food preparation',
    queryFile: 'cooking-techniques.sparql',
    outputFile: 'cooking-techniques.json',
  },
  {
    id: 'kitchen-tools',
    name: 'Kitchen Tools',
    description: 'Utensils and equipment for cooking',
    queryFile: 'kitchen-tools.sparql',
    outputFile: 'kitchen-tools.json',
  },

  // === DIY & HOME REPAIR ===
  {
    id: 'hand-tools',
    name: 'Hand Tools',
    description: 'Manual tools for DIY and construction',
    queryFile: 'hand-tools.sparql',
    outputFile: 'hand-tools.json',
  },
  {
    id: 'power-tools',
    name: 'Power Tools',
    description: 'Electric and battery-powered tools',
    queryFile: 'power-tools.sparql',
    outputFile: 'power-tools.json',
  },
  {
    id: 'building-materials',
    name: 'Building Materials',
    description: 'Materials used in construction and home improvement',
    queryFile: 'building-materials.sparql',
    outputFile: 'building-materials.json',
  },
  {
    id: 'home-repair-tasks',
    name: 'Home Repair Tasks',
    description: 'Common household repair and maintenance activities',
    queryFile: 'home-repair-tasks.sparql',
    outputFile: 'home-repair-tasks.json',
  },

  // === FITNESS & WORKOUTS ===
  {
    id: 'exercises',
    name: 'Physical Exercises',
    description: 'Individual exercises and movements',
    queryFile: 'exercises.sparql',
    outputFile: 'exercises.json',
  },
  {
    id: 'sports',
    name: 'Sports',
    description: 'Athletic activities and sports',
    queryFile: 'sports.sparql',
    outputFile: 'sports.json',
  },
  {
    id: 'fitness-equipment',
    name: 'Fitness Equipment',
    description: 'Gym and workout equipment',
    queryFile: 'fitness-equipment.sparql',
    outputFile: 'fitness-equipment.json',
  },
  {
    id: 'muscle-groups',
    name: 'Muscle Groups',
    description: 'Human muscles targeted in workouts',
    queryFile: 'muscle-groups.sparql',
    outputFile: 'muscle-groups.json',
  },
];

// Group categories by domain
export const categoryGroups = {
  cooking: ['food-ingredients', 'cooking-techniques', 'kitchen-tools'],
  diy: ['hand-tools', 'power-tools', 'building-materials', 'home-repair-tasks'],
  fitness: ['exercises', 'sports', 'fitness-equipment', 'muscle-groups'],
};
