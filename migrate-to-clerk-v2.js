#!/usr/bin/env node

/**
 * Clerk User Migration Script - V2 using Clerk Backend SDK
 * 
 * This script migrates users from Convex to Clerk using the official Clerk Backend SDK.
 * It reads user data from migration-users.json and:
 * 1. Checks if each user already exists in Clerk
 * 2. Creates new users if they don't exist
 * 3. Outputs detailed results to migration-results.json
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
 * Check if a user exists in Clerk by email
 */
async function checkUserExists(email) {
  try {
    const userList = await clerkClient.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });
    
    return userList.data.length > 0 ? userList.data[0] : null;
  } catch (error) {
    console.error(`   ⚠️  Error checking user ${email}:`, error.message);
    return null;
  }
}

/**
 * Create a new user in Clerk using the Backend SDK
 */
async function createUser(userData) {
  try {
    console.log(`   📝 Creating user with Clerk Backend SDK...`);
    
    const newUser = await clerkClient.users.createUser({
      emailAddresses: [userData.email],
      profileImageUrl: userData.image,
      firstName: userData.name || userData.email.split('@')[0], // Fallback to email username
      skipPasswordRequirement: true, // They'll use OAuth or set password later
      skipPasswordChecks: true,
    });

    return newUser;
  } catch (error) {
    console.error(`   ❌ Error creating user ${userData.email}:`, error.message);
    
    // Log additional error details if available
    if (error.errors && Array.isArray(error.errors)) {
      error.errors.forEach((err, i) => {
        console.error(`      Error ${i + 1}:`, {
          message: err.message,
          longMessage: err.longMessage || err.long_message,
          code: err.code,
          meta: err.meta,
        });
      });
    }
    
    throw error;
  }
}

/**
 * Sleep for specified milliseconds (for rate limiting)
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main migration function
 */
async function migrateUsers() {
  console.log('🚀 Starting Clerk user migration with Backend SDK...\n');

  // Read input data
  const inputPath = path.join(__dirname, 'migration-users.json');
  const users = JSON.parse(await fs.readFile(inputPath, 'utf8'));
  
  console.log(`📊 Found ${users.length} users to migrate\n`);

  const results = {
    summary: {
      total: users.length,
      created: 0,
      existed: 0,
      failed: 0,
    },
    results: [],
  };

  // Process each user
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const progress = `[${i + 1}/${users.length}]`;
    
    console.log(`${progress} Processing: ${user.email}`);
    
    try {
      // Check if user already exists
      const existingUser = await checkUserExists(user.email);
      
      if (existingUser) {
        console.log(`   ✅ User already exists (${existingUser.id})`);
        results.results.push({
          convexId: user._id,
          email: user.email,
          name: user.name,
          status: 'existed',
          clerkId: existingUser.id,
          message: 'User already exists in Clerk',
        });
        results.summary.existed++;
      } else {
        // Create new user
        const newUser = await createUser(user);
        console.log(`   🆕 Created new user (${newUser.id})`);
        
        results.results.push({
          convexId: user._id,
          email: user.email,
          name: user.name,
          status: 'created',
          clerkId: newUser.id,
          message: 'Successfully created in Clerk',
        });
        results.summary.created++;
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      results.results.push({
        convexId: user._id,
        email: user.email,
        name: user.name,
        status: 'failed',
        clerkId: null,
        message: error.message,
        errorDetails: error.errors || null,
      });
      results.summary.failed++;
    }

    // Rate limiting - wait between requests
    if (i < users.length - 1) {
      await sleep(200); // 200ms between requests for SDK
    }
  }

  // Save results
  const outputPath = path.join(__dirname, 'migration-results.json');
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
  
  console.log('\n📋 Migration Summary:');
  console.log(`   Total users: ${results.summary.total}`);
  console.log(`   ✅ Created: ${results.summary.created}`);
  console.log(`   ♻️  Existed: ${results.summary.existed}`);
  console.log(`   ❌ Failed: ${results.summary.failed}`);
  console.log(`\n💾 Detailed results saved to: migration-results.json`);

  return results;
}

// Handle errors and run migration
async function main() {
  try {
    await migrateUsers();
    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { migrateUsers };