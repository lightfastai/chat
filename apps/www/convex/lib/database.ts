import type {
	GenericDatabaseReader,
	GenericDatabaseWriter,
} from "convex/server";
import type { DataModel, Doc, Id } from "../_generated/dataModel.js";
import { requireAccess, requireResource } from "./errors.js";

/**
 * Get a document by ID or throw a standardized error
 * @throws ConvexError with code "NOT_FOUND" if document doesn't exist
 */
export async function getOrThrow<T extends keyof DataModel>(
	db: GenericDatabaseReader<DataModel>,
	table: T,
	id: Id<T>,
): Promise<Doc<T>> {
	const doc = await db.get(id);
	requireResource(doc, `${table} with ID ${id}`);
	return doc;
}

/**
 * Get a document by ID and verify ownership
 * @throws ConvexError with code "NOT_FOUND" if document doesn't exist
 * @throws ConvexError with code "FORBIDDEN" if user doesn't own the document
 */
export async function getWithOwnership<T extends keyof DataModel>(
	db: GenericDatabaseReader<DataModel>,
	table: T,
	id: Id<T>,
	userId: Id<"users">,
): Promise<Doc<T>> {
	const doc = await getOrThrow(db, table, id);

	// Type-safe ownership check
	if ("userId" in doc && doc.userId === userId) {
		return doc;
	}

	// Also handle uploadedBy field for files
	if ("uploadedBy" in doc && doc.uploadedBy === userId) {
		return doc;
	}

	requireAccess(false, `${table} with ID ${id}`);
	return doc; // TypeScript needs this even though requireAccess throws
}

/**
 * Update a document with ownership verification
 * @throws ConvexError with code "NOT_FOUND" if document doesn't exist
 * @throws ConvexError with code "FORBIDDEN" if user doesn't own the document
 */
export async function updateWithOwnership<T extends keyof DataModel>(
	db: GenericDatabaseWriter<DataModel>,
	table: T,
	id: Id<T>,
	userId: Id<"users">,
	updates: Partial<Doc<T>>,
): Promise<void> {
	await getWithOwnership(
		db as GenericDatabaseReader<DataModel>,
		table,
		id,
		userId,
	);
	// TypeScript requires the cast due to partial type variance
	await db.patch(id, updates as Partial<Doc<T>>);
}

/**
 * Delete a document with ownership verification
 * @throws ConvexError with code "NOT_FOUND" if document doesn't exist
 * @throws ConvexError with code "FORBIDDEN" if user doesn't own the document
 */
export async function deleteWithOwnership<T extends keyof DataModel>(
	db: GenericDatabaseWriter<DataModel>,
	table: T,
	id: Id<T>,
	userId: Id<"users">,
): Promise<void> {
	await getWithOwnership(
		db as GenericDatabaseReader<DataModel>,
		table,
		id,
		userId,
	);
	await db.delete(id);
}
