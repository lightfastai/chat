#!/usr/bin/env node

/**
 * Script to remove deprecated fields from messages
 * Handles pagination automatically to avoid memory limits
 */

import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

async function checkStatus() {
  try {
    const { stdout } = await execAsync('npx convex run --prod cleanupDeprecatedFields:checkDeprecatedFields');
    return JSON.parse(stdout);
  } catch (error) {
    console.error('Error checking status:', error);
    throw error;
  }
}

async function runCleanupBatch(cursor) {
  const args = cursor ? `{"cursor": "${cursor}"}` : "{}";
  const command = `npx convex run --prod cleanupDeprecatedFields:removeDeprecatedFields '${args}'`;
  
  try {
    const { stdout } = await execAsync(command);
    return JSON.parse(stdout);
  } catch (error) {
    console.error('Error running cleanup batch:', error);
    throw error;
  }
}

async function runFullCleanup() {
  console.log('🔍 Checking for deprecated fields...\n');
  
  // Check initial status
  const initialStatus = await checkStatus();
  console.log('📊 Initial status:');
  console.log(`  Total messages: ${initialStatus.total}`);
  console.log(`  Messages with deprecated fields: ${initialStatus.withDeprecatedFields}`);
  console.log('\n  Field counts:');
  for (const [field, count] of Object.entries(initialStatus.fieldCounts)) {
    if (count > 0) {
      console.log(`    - ${field}: ${count}`);
    }
  }
  console.log('');
  
  if (initialStatus.withDeprecatedFields === 0) {
    console.log('✅ No deprecated fields found. Nothing to clean up!');
    return;
  }
  
  console.log('🚀 Starting cleanup of deprecated fields...\n');
  
  let cursor = null;
  let totalProcessed = 0;
  let totalSkipped = 0;
  let batchNum = 1;
  let isDone = false;
  
  while (!isDone) {
    console.log(`📦 Running batch ${batchNum}...`);
    
    try {
      const result = await runCleanupBatch(cursor);
      
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
      console.error('❌ Cleanup batch failed:', error);
      process.exit(1);
    }
  }
  
  console.log('✅ Cleanup complete!');
  console.log(`  Total processed: ${totalProcessed} messages`);
  console.log(`  Total skipped: ${totalSkipped} messages\n`);
  
  // Check final status
  console.log('📊 Checking final status...');
  const finalStatus = await checkStatus();
  console.log(`  Messages with deprecated fields remaining: ${finalStatus.withDeprecatedFields}`);
  
  if (finalStatus.withDeprecatedFields === 0) {
    console.log('\n🎉 All deprecated fields have been successfully removed!');
  } else {
    console.log('\n⚠️  Some deprecated fields remain. You may need to run the cleanup again.');
  }
}

// Run the cleanup
runFullCleanup().catch(error => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});