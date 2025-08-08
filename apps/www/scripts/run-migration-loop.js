#!/usr/bin/env node

/**
 * Script to run usage to metadata migration in batches
 * Handles pagination automatically to avoid memory limits
 */

import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

async function runMigrationBatch(cursor) {
  const args = cursor ? `{"cursor": "${cursor}"}` : "{}";
  const command = `npx convex run --prod migrationRunners:runUsageToMetadata '${args}'`;
  
  try {
    const { stdout } = await execAsync(command);
    return JSON.parse(stdout);
  } catch (error) {
    console.error('Error running migration batch:', error);
    throw error;
  }
}

async function runFullMigration() {
  console.log('🚀 Starting usage → metadata migration...\n');
  
  let cursor = null;
  let totalProcessed = 0;
  let totalSkipped = 0;
  let batchNum = 1;
  let isDone = false;
  
  while (!isDone) {
    console.log(`📦 Running batch ${batchNum}...`);
    
    try {
      const result = await runMigrationBatch(cursor);
      
      totalProcessed += result.processed;
      totalSkipped += result.skipped;
      isDone = result.isDone;
      cursor = result.continueCursor;
      
      console.log(`  ✅ Processed: ${result.processed} messages`);
      console.log(`  ⏭️  Skipped: ${result.skipped} messages`);
      console.log('');
      
      batchNum++;
      
      // Small delay to avoid rate limiting
      if (!isDone) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('❌ Migration batch failed:', error);
      process.exit(1);
    }
  }
  
  console.log('✅ Migration complete!');
  console.log(`  Total processed: ${totalProcessed} messages`);
  console.log(`  Total skipped: ${totalSkipped} messages\n`);
  
  // Check final status
  console.log('📊 Checking final migration status...');
  try {
    const { stdout } = await execAsync('npx convex run --prod migrationStatus:check');
    const status = JSON.parse(stdout);
    console.log('  Usage to metadata migration:');
    console.log(`    - Migrated: ${status.usageToMetadata.migrated}`);
    console.log(`    - Needs migration: ${status.usageToMetadata.needsMigration}`);
  } catch (error) {
    console.error('Error checking status:', error);
  }
}

// Run the migration
runFullMigration().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});