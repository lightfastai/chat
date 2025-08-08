#!/usr/bin/env node

/**
 * Script to run Convex migrations
 * 
 * Usage: node run-convex-migration.js
 */

console.log('🚀 Running Convex migration to add Clerk user IDs to threads...\n');

console.log('To run the migration, execute this in the Convex dashboard console:');
console.log('----------------------------------------');
console.log('await ctx.runMutation(api.runMigrations.runAllMigrations)');
console.log('----------------------------------------\n');

console.log('Or run this command:');
console.log('----------------------------------------');
console.log('npx convex run runMigrations:runAllMigrations');
console.log('----------------------------------------\n');

console.log('To check migration status:');
console.log('----------------------------------------');
console.log('npx convex run runMigrations:checkMigrationStatus');
console.log('----------------------------------------\n');