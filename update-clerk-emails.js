#!/usr/bin/env node

/**
 * Update Clerk Users with Email Addresses
 * 
 * This script reads the migration results and updates each user's email address in Clerk.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClerkClient } from '@clerk/backend';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate environment
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY environment variable is required');
  process.exit(1);
}

// Initialize Clerk client
const clerkClient = createClerkClient({
  secretKey: CLERK_SECRET_KEY,
});

console.log('✅ Clerk Backend SDK initialized');

/**
 * Update user's email address in Clerk
 */
async function updateUserEmail(clerkId, email) {
  try {
    // First, get the current user to see their email addresses
    const user = await clerkClient.users.getUser(clerkId);
    
    // Check if email already exists
    const hasEmail = user.emailAddresses?.some(e => e.emailAddress === email);
    
    if (hasEmail) {
      console.log(`   ✅ Email already set: ${email}`);
      return { success: true, message: 'Email already exists' };
    }
    
    // Create the email address for the user
    const emailAddress = await clerkClient.emailAddresses.createEmailAddress({
      userId: clerkId,
      emailAddress: email,
      verified: true, // Mark as verified since they came from a verified system
      primary: !user.primaryEmailAddressId, // Make primary if no primary email exists
    });
    
    console.log(`   ✅ Email added: ${email} (${emailAddress.id})`);
    
    // If this is the first email, make it primary
    if (!user.primaryEmailAddressId) {
      await clerkClient.users.updateUser(clerkId, {
        primaryEmailAddressId: emailAddress.id,
      });
      console.log(`   ✅ Set as primary email`);
    }
    
    return { success: true, message: 'Email successfully added', emailId: emailAddress.id };
  } catch (error) {
    console.error(`   ❌ Error updating email for ${clerkId}:`, error.message);
    
    // Log additional error details if available
    if (error.errors && Array.isArray(error.errors)) {
      error.errors.forEach((err, i) => {
        console.error(`      Error ${i + 1}:`, {
          message: err.message,
          longMessage: err.longMessage || err.long_message,
          code: err.code,
        });
      });
    }
    
    return { success: false, message: error.message, error };
  }
}

/**
 * Sleep for specified milliseconds (for rate limiting)
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main update function
 */
async function updateEmails() {
  console.log('🚀 Starting Clerk email update process...\n');

  // Read migration results
  const resultsPath = path.join(__dirname, 'migration-results.json');
  const migrationData = JSON.parse(await fs.readFile(resultsPath, 'utf8'));
  
  // Filter users that were created or existed (exclude failed)
  const usersToUpdate = migrationData.results.filter(
    user => user.status === 'created' || user.status === 'existed'
  );
  
  console.log(`📊 Found ${usersToUpdate.length} users to update\n`);

  const updateResults = {
    summary: {
      total: usersToUpdate.length,
      updated: 0,
      alreadySet: 0,
      failed: 0,
    },
    results: [],
  };

  // Process each user
  for (let i = 0; i < usersToUpdate.length; i++) {
    const user = usersToUpdate[i];
    const progress = `[${i + 1}/${usersToUpdate.length}]`;
    
    console.log(`${progress} Updating: ${user.email} (${user.clerkId})`);
    
    const result = await updateUserEmail(user.clerkId, user.email);
    
    if (result.success) {
      if (result.message === 'Email already exists') {
        updateResults.summary.alreadySet++;
      } else {
        updateResults.summary.updated++;
      }
    } else {
      updateResults.summary.failed++;
    }
    
    updateResults.results.push({
      ...user,
      updateResult: result,
    });

    // Rate limiting - wait between requests
    if (i < usersToUpdate.length - 1) {
      await sleep(200); // 200ms between requests
    }
  }

  // Save update results
  const outputPath = path.join(__dirname, 'email-update-results.json');
  await fs.writeFile(outputPath, JSON.stringify(updateResults, null, 2));
  
  console.log('\n📋 Update Summary:');
  console.log(`   Total users: ${updateResults.summary.total}`);
  console.log(`   ✅ Updated: ${updateResults.summary.updated}`);
  console.log(`   ♻️  Already set: ${updateResults.summary.alreadySet}`);
  console.log(`   ❌ Failed: ${updateResults.summary.failed}`);
  console.log(`\n💾 Detailed results saved to: email-update-results.json`);

  return updateResults;
}

// Handle errors and run update
async function main() {
  try {
    await updateEmails();
    console.log('\n🎉 Email update completed successfully!');
  } catch (error) {
    console.error('\n💥 Email update failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { updateEmails };