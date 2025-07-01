import { asyncMap } from "convex-helpers"
import { v } from "convex/values"
import { internalQuery, mutation, query } from "./_generated/server"
import { getAuthenticatedUserId } from "./lib/auth.js"
import { getWithOwnership } from "./lib/database.js"
import { throwConflictError } from "./lib/errors.js"
import {
  fileMetadataValidator,
  fileNameValidator,
  mimeTypeValidator,
  storageIdValidator,
} from "./validators"

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed file types
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    // Ensure user is authenticated
    await getAuthenticatedUserId(ctx)

    // Generate a storage upload URL
    return await ctx.storage.generateUploadUrl()
  },
})

export const createFile = mutation({
  args: {
    storageId: storageIdValidator,
    fileName: fileNameValidator,
    fileType: mimeTypeValidator,
    fileSize: v.number(),
    metadata: fileMetadataValidator,
  },
  returns: v.id("files"),
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)

    // Validate file size
    if (args.fileSize > MAX_FILE_SIZE) {
      throwConflictError(
        `File is too large. Maximum size allowed is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      )
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(args.fileType)) {
      const friendlyTypes = [
        "PDF",
        "Text files",
        "Markdown",
        "CSV",
        "JSON",
        "Images (JPEG, PNG, GIF, WebP)",
        "Word documents",
      ]
      throwConflictError(
        `This file type is not supported. Please upload: ${friendlyTypes.join(", ")}`,
      )
    }

    // Create file record
    const fileId = await ctx.db.insert("files", {
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      uploadedBy: userId,
      uploadedAt: Date.now(),
      metadata: args.metadata,
    })

    return fileId
  },
})

export const getFile = query({
  args: { fileId: v.id("files") },
  returns: v.union(
    v.object({
      _id: v.id("files"),
      _creationTime: v.number(),
      storageId: storageIdValidator,
      fileName: fileNameValidator,
      fileType: mimeTypeValidator,
      fileSize: v.number(),
      uploadedBy: v.id("users"),
      uploadedAt: v.number(),
      metadata: fileMetadataValidator,
      url: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    try {
      const userId = await getAuthenticatedUserId(ctx)
      const file = await getWithOwnership(ctx.db, "files", args.fileId, userId)
      const url = await ctx.storage.getUrl(file.storageId)
      if (!url) return null

      return { ...file, url }
    } catch {
      return null
    }
  },
})

export const getFiles = query({
  args: { fileIds: v.array(v.id("files")) },
  returns: v.array(
    v.object({
      _id: v.id("files"),
      _creationTime: v.number(),
      storageId: storageIdValidator,
      fileName: fileNameValidator,
      fileType: mimeTypeValidator,
      fileSize: v.number(),
      uploadedBy: v.id("users"),
      uploadedAt: v.number(),
      metadata: fileMetadataValidator,
      url: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const files = await asyncMap(args.fileIds, async (fileId) => {
      const file = await ctx.db.get(fileId)
      if (!file) return null

      const url = await ctx.storage.getUrl(file.storageId)
      return { ...file, url }
    })
    return files.filter((f): f is NonNullable<typeof f> => f !== null)
  },
})

export const listFiles = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("files"),
      _creationTime: v.number(),
      storageId: storageIdValidator,
      fileName: fileNameValidator,
      fileType: mimeTypeValidator,
      fileSize: v.number(),
      uploadedBy: v.id("users"),
      uploadedAt: v.number(),
      metadata: fileMetadataValidator,
      url: v.string(),
    }),
  ),
  handler: async (ctx) => {
    try {
      const userId = await getAuthenticatedUserId(ctx)
      const files = await ctx.db
        .query("files")
        .withIndex("by_user", (q) => q.eq("uploadedBy", userId))
        .order("desc")
        .collect()

      // Get URLs for all files
      const filesWithUrls = await asyncMap(files, async (file) => {
        const url = await ctx.storage.getUrl(file.storageId)
        return url ? { ...file, url } : null
      })

      return filesWithUrls.filter(
        (file): file is NonNullable<typeof file> => file !== null,
      )
    } catch {
      return []
    }
  },
})

export const deleteFile = mutation({
  args: { fileId: v.id("files") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)
    const file = await getWithOwnership(ctx.db, "files", args.fileId, userId)

    // Delete from storage
    await ctx.storage.delete(file.storageId)

    // Delete from database
    await ctx.db.delete(args.fileId)

    return null
  },
})

// Internal query to get file with URL (for use in actions)
export const getFileWithUrl = internalQuery({
  args: { fileId: v.id("files") },
  returns: v.union(
    v.object({
      _id: v.id("files"),
      _creationTime: v.number(),
      storageId: storageIdValidator,
      fileName: fileNameValidator,
      fileType: mimeTypeValidator,
      fileSize: v.number(),
      uploadedBy: v.id("users"),
      uploadedAt: v.number(),
      metadata: fileMetadataValidator,
      url: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId)
    if (!file) return null

    const url = await ctx.storage.getUrl(file.storageId)
    if (!url) return null

    return { ...file, url }
  },
})
