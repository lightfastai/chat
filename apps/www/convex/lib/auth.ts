import type {
	GenericActionCtx,
	GenericMutationCtx,
	GenericQueryCtx,
} from "convex/server";
import { ConvexError } from "convex/values";
import type { DataModel } from "../_generated/dataModel.js";

/**
 * Get authenticated Clerk user ID
 * Returns the Clerk user ID directly without mapping
 * @throws ConvexError with code "UNAUTHORIZED" if not authenticated
 */
export async function getAuthenticatedClerkUserId(
	ctx:
		| GenericQueryCtx<DataModel>
		| GenericMutationCtx<DataModel>
		| GenericActionCtx<DataModel>,
): Promise<string> {
	// Get the Clerk user identity
	const identity = await ctx.auth.getUserIdentity();

	if (!identity) {
		throw new ConvexError({
			code: "UNAUTHORIZED",
			message: "Not authenticated",
		});
	}

	// Return the Clerk user ID directly
	return identity.subject;
}


/**
 * Check if a user owns a resource
 * @throws ConvexError with code "FORBIDDEN" if user doesn't own the resource
 */
export function requireOwnership<T extends { clerkUserId: string }>(
	resource: T,
	clerkUserId: string,
	resourceType: string,
): T {
	if (resource.clerkUserId !== clerkUserId) {
		throw new Error(`You don't have permission to access this ${resourceType}`);
	}
	return resource;
}
