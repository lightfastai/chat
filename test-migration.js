#!/usr/bin/env node

/**
 * Test script to validate the migration setup without actually running it
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testSetup() {
  console.log('🧪 Testing migration setup...\n');

  // Check if input file exists and is valid
  try {
    const inputPath = path.join(__dirname, 'migration-users.json');
    const users = JSON.parse(await fs.readFile(inputPath, 'utf8'));
    console.log(`✅ Input file: Found ${users.length} users`);
    console.log(`   First user: ${users[0].email}`);
    console.log(`   Last user: ${users[users.length - 1].email}`);
  } catch (error) {
    console.log(`❌ Input file error: ${error.message}`);
    return false;
  }

  // Check environment variable
  const clerkKey = process.env.CLERK_SECRET_KEY;
  if (clerkKey) {
    console.log(`✅ Clerk API key: Set (${clerkKey.substring(0, 10)}...)`);
  } else {
    console.log('❌ Clerk API key: Not set (CLERK_SECRET_KEY)');
    console.log('   Set it with: export CLERK_SECRET_KEY="sk_..."');
    return false;
  }

  // Test Clerk API connection (without making changes)
  try {
    const response = await fetch('https://api.clerk.com/v1/users?limit=1', {
      headers: {
        'Authorization': `Bearer ${clerkKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      console.log('✅ Clerk API: Connection successful');
    } else {
      const error = await response.json();
      console.log(`❌ Clerk API: Connection failed (${response.status})`);
      console.log(`   Error: ${JSON.stringify(error)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Clerk API: Network error - ${error.message}`);
    return false;
  }

  console.log('\n🎉 All checks passed! Ready to run migration.');
  console.log('\n📝 To run the actual migration:');
  console.log('   pnpm run migrate:clerk');
  
  return true;
}

testSetup().catch(console.error);