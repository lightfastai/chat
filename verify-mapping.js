#!/usr/bin/env node

import fs from 'fs/promises';

// Read migration results
const migrationResults = JSON.parse(await fs.readFile('migration-results.json', 'utf8'));

// Extract mapping
const mapping = {};
for (const user of migrationResults.results) {
  if (user.clerkId) {
    mapping[user.convexId] = user.clerkId;
  }
}

// Format as TypeScript code
console.log('const USER_ID_MAPPING: Record<string, string> = {');
for (const [convexId, clerkId] of Object.entries(mapping)) {
  console.log(`  "${convexId}": "${clerkId}",`);
}
console.log('};');

console.log('\nTotal mappings:', Object.keys(mapping).length);