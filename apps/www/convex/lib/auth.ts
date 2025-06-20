import { getAuthUserId } from "@convex-dev/auth/server"
import type {
  GenericActionCtx,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server"
import type { DataModel, Id } from "../_generated/dataModel.js"
import { requireAuth } from "./errors.js"

/**
 * Get authenticated user ID with consistent error handling
 * @throws ConvexError with code "UNAUTHORIZED" if not authenticated
 */
export async function getAuthenticatedUserId(
  ctx:
    | GenericQueryCtx<DataModel>
    | GenericMutationCtx<DataModel>
    | GenericActionCtx<DataModel>,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx)
  requireAuth(userId)
  return userId
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
    throw new Error(`You don't have permission to access this ${resourceType}`)
  }
  return resource
}
