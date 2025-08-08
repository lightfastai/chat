#!/usr/bin/env node

/**
 * Clerk User Migration Script
 * 
 * This script migrates users from Convex to Clerk using the Clerk Management API.
 * It reads user data from migration-users.json and:
 * 1. Checks if each user already exists in Clerk
 * 2. Creates new users if they don't exist
 * 3. Outputs detailed results to migration-results.json
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Clerk Management API configuration
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_API_BASE = 'https://api.clerk.com/v1';

if (!CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY environment variable is required');
  process.exit(1);
}

/**
 * Make authenticated request to Clerk API
 */
async function clerkApiRequest(endpoint, options = {}) {
  const url = `${CLERK_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Clerk API Error: ${response.status} ${JSON.stringify(data)}`);
  }
  
  return data;
}

/**
 * Check if a user exists in Clerk by email
 */
async function checkUserExists(email) {
  try {
    const users = await clerkApiRequest(`/users?email_address=${encodeURIComponent(email)}`);
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error(`Error checking user ${email}:`, error.message);
    return null;
  }
}

/**
 * Create a new user in Clerk
 */
async function createUser(userData) {
  try {
    // Try different payload formats based on Clerk requirements
    const createPayload = {
      email_addresses: [{
        email_address: userData.email,
        verified: true, // Mark as verified since they had emailVerificationTime
      }],
      profile_image_url: userData.image,
      first_name: userData.name || userData.email.split('@')[0], // Fallback to email username
      skip_password_requirement: true, // They'll use OAuth or set password later
      skip_password_checks: true,
      public_metadata: {},
      private_metadata: {},
      unsafe_metadata: {},
    };

    console.log(`   📤 Creating with payload:`, JSON.stringify(createPayload, null, 2));

    const newUser = await clerkApiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(createPayload),
    });

    return newUser;
  } catch (error) {
    console.error(`   📤 Failed payload:`, JSON.stringify({
      email_addresses: [{
        email_address: userData.email,
        verified: true,
      }],
    }, null, 2));
    console.error(`   ❌ Error creating user ${userData.email}:`, error.message);
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
 * Check Clerk instance configuration
 */
async function checkClerkConfig() {
  try {
    console.log('🔍 Checking Clerk instance configuration...');
    
    // Try to get instance configuration
    const response = await fetch(`${CLERK_API_BASE}/instance`, {
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const config = await response.json();
      console.log('   Instance config:', JSON.stringify({
        restrictions: config.restrictions || 'None found',
        sign_up: config.sign_up || 'None found',
      }, null, 2));
    } else {
      console.log('   Could not fetch instance config (this is OK)');
    }
  } catch (error) {
    console.log('   Could not check instance config (this is OK)');
  }
}

/**
 * Main migration function
 */
async function migrateUsers() {
  console.log('🚀 Starting Clerk user migration...\n');
  
  // Check instance configuration
  await checkClerkConfig();
  console.log('');

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
      });
      results.summary.failed++;
    }

    // Rate limiting - wait between requests
    if (i < users.length - 1) {
      await sleep(100); // 100ms between requests
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