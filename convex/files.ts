import { asyncMap } from "convex-helpers"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { internalQuery, mutation, query } from "./_generated/server"

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
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error("Not authenticated")
    }

    // Generate a storage upload URL
    return await ctx.storage.generateUploadUrl()
  },
})

export const createFile = mutation({
  args: {
    storageId: v.string(),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    metadata: v.optional(
      v.object({
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        pages: v.optional(v.number()),
        extractedText: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error("Not authenticated")
    }

    // Validate file size
    if (args.fileSize > MAX_FILE_SIZE) {
      throw new Error(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      )
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(args.fileType)) {
      throw new Error(
        `File type ${args.fileType} is not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`,
      )
    }

    const userId = user.subject as Id<"users">

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
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId)
    if (!file) {
      return null
    }

    // Get the download URL for the file
    const url = await ctx.storage.getUrl(file.storageId)

    return {
      ...file,
      url,
    }
  },
})

export const getFiles = query({
  args: { fileIds: v.array(v.id("files")) },
  handler: async (ctx, args) => {
    const files = await asyncMap(args.fileIds, async (fileId) => {
      const file = await ctx.db.get(fileId)
      if (!file) return null

      const url = await ctx.storage.getUrl(file.storageId)
      return {
        ...file,
        url,
      }
    })

    return files.filter(Boolean)
  },
})

// Internal query for getting files without URLs (for server-side use)
export const getFilesInternal = internalQuery({
  args: { fileIds: v.array(v.id("files")) },
  handler: async (ctx, args) => {
    const files = await asyncMap(args.fileIds, async (fileId) => {
      return await ctx.db.get(fileId)
    })
    return files.filter(Boolean)
  },
})

export const deleteFile = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error("Not authenticated")
    }

    const file = await ctx.db.get(args.fileId)
    if (!file) {
      throw new Error("File not found")
    }

    const userId = user.subject as Id<"users">
    if (file.uploadedBy !== userId) {
      throw new Error("Not authorized to delete this file")
    }

    // Delete from storage
    await ctx.storage.delete(file.storageId)

    // Delete from database
    await ctx.db.delete(args.fileId)
  },
})
