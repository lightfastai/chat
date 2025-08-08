import type {
	GenericActionCtx,
	GenericMutationCtx,
	GenericQueryCtx,
} from "convex/server";
import { ConvexError } from "convex/values";
import type { DataModel, Id } from "../_generated/dataModel.js";

/**
 * Temporary mapping from Clerk user IDs to Convex user IDs during migration
 */
const CLERK_TO_CONVEX_USER_MAPPING: Record<string, Id<"users">> = {
	"user_30r1XMf2zFdlctUHRkyw9kir7u4": "k9790x60x9wwg6t7xzg7sdbmj57hqa26" as Id<"users">,
	"user_30zLsFGcSsOfimwJOAgdtlSO0ru": "k97adp8es829yanjmkbqkyd3hs7hrhxe" as Id<"users">,
	"user_30zLsGefNSjOERUW3IHo8fWFHHE": "k97dt209wbz52xv87qqsjykqan7j2rfp" as Id<"users">,
	"user_30zLsMvTa6YB9QTz3I9bWwdvXoP": "k972enf2bvfyk9ktytmhy0n6vd7j4fp8" as Id<"users">,
	"user_30zLsXOV9u76r633ihzrtu5qX2H": "k977vackk4cseqcmvxk4zvfnas7j66ev" as Id<"users">,
	"user_30zLscy5dYkvEZVI4iMYsIFACv7": "k973yvtmwffq5p6aa865zn35p57j7p90" as Id<"users">,
	"user_30zLsqufawjJjc9qA0B0djm2BjS": "k97c0cghpwypm4gxd143dxmmqd7j85ps" as Id<"users">,
	"user_30zLsvKKFHk5cVZLcbbMyuI0R8o": "k975rgx1d524qwycmvzxsx76w17j93fm" as Id<"users">,
	"user_30zLt3tAzwbOSolvOQgE0oygtDf": "k97ebvm7xx71t9sqy3gt9ybhg57j9kca" as Id<"users">,
	"user_30zLtCGnPyUDNWF987j61MmPTFt": "k973j7j6b70ytwe51w5j6rfg7x7j80qt" as Id<"users">,
	"user_30zLtC70oXk2LMzveWl0N4lLVRK": "k97fevgv7sdde3q72x2zddqec57j95he" as Id<"users">,
	"user_30zLtMRCfr5oNai43SD3VChRILj": "k978gnwyt3x385d28cq173pt4d7j973c" as Id<"users">,
	"user_30zLtQy8ylw3ngRwbXdVvtw9euG": "k9724c7tqr6d3pmzh2wxcvmd5h7j9yex" as Id<"users">,
	"user_30zLtWtDmF5U06ZZ1BmCdD2yCnm": "k978vs6nz6q30p9jyg4peakahs7jb2gx" as Id<"users">,
	"user_30zLteNZqhW89PZPABopKD5WMN6": "k9778h9m3c47r92qs4m2mthem97jdebz" as Id<"users">,
	"user_30tqvw9R6sI8WN96yC8TVQUlRVl": "k97fk08bqasgyr563mr80n9xk57jgqhj" as Id<"users">,
	"user_30zLtqqnmRvx5yVj7qpfRfSP7bF": "k979kv70rb90ebjtwxbxe5r5q97jkmxt" as Id<"users">,
	"user_30zLtstaIhXFD43oEHHZOsiBcUX": "k974dxda31s47y6pwygyazd4x97jjp1k" as Id<"users">,
	"user_30zLu3rD6fjwUHhAviP41vHNlkq": "k9727yaev3p1hwqmrg7ws9hzyx7jj1tw" as Id<"users">,
	"user_30zLuDxQsc9WKcJGEEvntzpWbHo": "k979g52c5pbz6sm2hgn94yn9457jk0tm" as Id<"users">,
	"user_30zLuIeDMpBMVyoYl2VlOUJrU4O": "k972y2qhs55kw96knxqv75szt57jjjy8" as Id<"users">,
	"user_30zLuR1Qn1zh8iismi4igecZlaU": "k971h1ar6dzzkmdbxes91d3sfn7jjmy4" as Id<"users">,
	"user_30zLuVyvCEXZRtRU7Or9kwvcRr7": "k97a51c6s9be5kwecn80smmcm17jtbza" as Id<"users">,
	"user_30zLuhUXdXINXJZvfZ6iKqYjnC3": "k978thj5gwg8c3mrxs10a9nwxn7jwn2g" as Id<"users">,
	"user_30zLugflpnRPktgYd5vBI8Pi7Mj": "k975mz471qckjxrc8p50qbx5kh7jybvj" as Id<"users">,
	"user_30zLun9qb8yW836LL9qXQbdJg7f": "k979xsytsjva4kf77h7d7ssgk17k8bh3" as Id<"users">,
	"user_30zLux4MJMdS4uk3mGIK1UPouLi": "k97bg9b8991sxb5cb8gdjg88bn7kjcfa" as Id<"users">,
	"user_30zLv1pC6RtzySxEJJ3vkmADnHp": "k979w7a5a1y9vmpd9cgx0rbp7s7knjph" as Id<"users">,
	"user_30zLv8SksvB7o1Qh4OOHA9eO9Dh": "k974mc23240emcz0qpgjejr8b17mcy51" as Id<"users">,
	"user_30zLvIKdtM6icQxFyudBA9KNZiX": "k9721nhjgvv6mtf97trycfkds97n4cyt" as Id<"users">,
	"user_30zLvUNywHUbkt8RHh7KgfvRRK4": "k97ad0sb79p39kt0recw4fb8cs7n5vy3" as Id<"users">,
};

/**
 * Get authenticated user ID with consistent error handling
 * Now uses Clerk authentication
 * @throws ConvexError with code "UNAUTHORIZED" if not authenticated
 */
export async function getAuthenticatedUserId(
	ctx:
		| GenericQueryCtx<DataModel>
		| GenericMutationCtx<DataModel>
		| GenericActionCtx<DataModel>,
): Promise<Id<"users">> {
	// Get the Clerk user identity
	const identity = await ctx.auth.getUserIdentity();
	
	if (!identity) {
		throw new ConvexError({
			code: "UNAUTHORIZED",
			message: "Not authenticated",
		});
	}

	// Get the Clerk user ID (subject field in JWT)
	const clerkUserId = identity.subject;
	
	// Map Clerk user ID to Convex user ID
	const convexUserId = CLERK_TO_CONVEX_USER_MAPPING[clerkUserId];
	
	if (!convexUserId) {
		throw new ConvexError({
			code: "USER_NOT_FOUND",
			message: `User mapping not found for Clerk ID: ${clerkUserId}`,
		});
	}

	return convexUserId;
}

/**
 * Check if a user owns a resource
 * @throws ConvexError with code "FORBIDDEN" if user doesn't own the resource
 */
export function requireOwnership<T extends { userId: string }>(
	resource: T,
	userId: string,
	resourceType: string,
): T {
	if (resource.userId !== userId) {
		throw new Error(`You don't have permission to access this ${resourceType}`);
	}
	return resource;
}
