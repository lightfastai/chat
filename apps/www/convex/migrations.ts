import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api.js";
import { DataModel } from "./_generated/dataModel.js";
import { internal } from "./_generated/api.js";

/**
 * Official Convex migrations setup
 * See: https://www.convex.dev/components/migrations
 */

export const migrations = new Migrations<DataModel>(components.migrations);

// Export runner functions
export const run = migrations.runner();
export const runAddClerkUserIds = migrations.runner(internal.migrations.addClerkUserIds);

/**
 * Mapping from Convex user IDs to Clerk user IDs (from migration-results.json)
 */
const USER_ID_MAPPING: Record<string, string> = {
  "k9790x60x9wwg6t7xzg7sdbmj57hqa26": "user_30r1XMf2zFdlctUHRkyw9kir7u4",
  "k97adp8es829yanjmkbqkyd3hs7hrhxe": "user_30zLsFGcSsOfimwJOAgdtlSO0ru",
  "k97dt209wbz52xv87qqsjykqan7j2rfp": "user_30zLsGefNSjOERUW3IHo8fWFHHE",
  "k972enf2bvfyk9ktytmhy0n6vd7j4fp8": "user_30zLsMvTa6YB9QTz3I9bWwdvXoP",
  "k977vackk4cseqcmvxk4zvfnas7j66ev": "user_30zLsXOV9u76r633ihzrtu5qX2H",
  "k973yvtmwffq5p6aa865zn35p57j7p90": "user_30zLscy5dYkvEZVI4iMYsIFACv7",
  "k97c0cghpwypm4gxd143dxmmqd7j85ps": "user_30zLsqufawjJjc9qA0B0djm2BjS",
  "k975rgx1d524qwycmvzxsx76w17j93fm": "user_30zLsvKKFHk5cVZLcbbMyuI0R8o",
  "k97ebvm7xx71t9sqy3gt9ybhg57j9kca": "user_30zLt3tAzwbOSolvOQgE0oygtDf",
  "k973j7j6b70ytwe51w5j6rfg7x7j80qt": "user_30zLtCGnPyUDNWF987j61MmPTFt",
  "k97fevgv7sdde3q72x2zddqec57j95he": "user_30zLtC70oXk2LMzveWl0N4lLVRK",
  "k978gnwyt3x385d28cq173pt4d7j973c": "user_30zLtMRCfr5oNai43SD3VChRILj",
  "k9724c7tqr6d3pmzh2wxcvmd5h7j9yex": "user_30zLtQy8ylw3ngRwbXdVvtw9euG",
  "k978vs6nz6q30p9jyg4peakahs7jb2gx": "user_30zLtWtDmF5U06ZZ1BmCdD2yCnm",
  "k9778h9m3c47r92qs4m2mthem97jdebz": "user_30zLteNZqhW89PZPABopKD5WMN6",
  "k97fk08bqasgyr563mr80n9xk57jgqhj": "user_30tqvw9R6sI8WN96yC8TVQUlRVl",
  "k979kv70rb90ebjtwxbxe5r5q97jkmxt": "user_30zLtqqnmRvx5yVj7qpfRfSP7bF",
  "k974dxda31s47y6pwygyazd4x97jjp1k": "user_30zLtstaIhXFD43oEHHZOsiBcUX",
  "k9727yaev3p1hwqmrg7ws9hzyx7jj1tw": "user_30zLu3rD6fjwUHhAviP41vHNlkq",
  "k979g52c5pbz6sm2hgn94yn9457jk0tm": "user_30zLuDxQsc9WKcJGEEvntzpWbHo",
  "k972y2qhs55kw96knxqv75szt57jjjy8": "user_30zLuIeDMpBMVyoYl2VlOUJrU4O",
  "k971h1ar6dzzkmdbxes91d3sfn7jjmy4": "user_30zLuR1Qn1zh8iismi4igecZlaU",
  "k97a51c6s9be5kwecn80smmcm17jtbza": "user_30zLuVyvCEXZRtRU7Or9kwvcRr7",
  "k978thj5gwg8c3mrxs10a9nwxn7jwn2g": "user_30zLuhUXdXINXJZvfZ6iKqYjnC3",
  "k975mz471qckjxrc8p50qbx5kh7jybvj": "user_30zLugflpnRPktgYd5vBI8Pi7Mj",
  "k979xsytsjva4kf77h7d7ssgk17k8bh3": "user_30zLun9qb8yW836LL9qXQbdJg7f",
  "k97bg9b8991sxb5cb8gdjg88bn7kjcfa": "user_30zLux4MJMdS4uk3mGIK1UPouLi",
  "k979w7a5a1y9vmpd9cgx0rbp7s7knjph": "user_30zLv1pC6RtzySxEJJ3vkmADnHp",
  "k974mc23240emcz0qpgjejr8b17mcy51": "user_30zLv8SksvB7o1Qh4OOHA9eO9Dh",
  "k9721nhjgvv6mtf97trycfkds97n4cyt": "user_30zLvIKdtM6icQxFyudBA9KNZiX",
  "k97ad0sb79p39kt0recw4fb8cs7n5vy3": "user_30zLvUNywHUbkt8RHh7KgfvRRK4",
};

/**
 * Migration to add Clerk user IDs to all threads
 */
export const addClerkUserIds = migrations.define({
  table: "threads",
  migrateOne: async (ctx, thread) => {
    // Skip if already has Clerk user ID
    if (thread.clerkUserId) {
      return;
    }
    
    // Get the Clerk user ID from mapping
    const clerkUserId = USER_ID_MAPPING[thread.userId];
    
    if (clerkUserId) {
      await ctx.db.patch(thread._id, {
        clerkUserId,
      });
    } else {
      console.warn(`No Clerk user ID mapping found for user ${thread.userId}`);
    }
  },
});