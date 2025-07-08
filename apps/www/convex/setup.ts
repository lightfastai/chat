import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Setup function for preview deployments
 * This runs automatically when creating preview deployments
 * to populate them with initial test data
 */
export const setupInitialData = mutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		// Check if we already have data to avoid duplicates
		const existingMessages = await ctx.db.query("messages").first();
		if (existingMessages) {
			console.log("Preview deployment already has data, skipping setup");
			return null;
		}

		console.log("Setting up initial data for preview deployment...");

		// Create a test user for preview deployments
		const testUserId = await ctx.db.insert("users", {
			name: "Preview User",
			image:
				"https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face&auto=format",
			email: "preview@example.com",
			emailVerificationTime: Date.now(),
		});

		const now = Date.now();

		// Create a sample thread
		const threadId = await ctx.db.insert("threads", {
			title: "Welcome to Lightfast Chat",
			userId: testUserId,
			metadata: {
				usage: {
					totalInputTokens: 0,
					totalOutputTokens: 0,
					totalTokens: 0,
					totalReasoningTokens: 0,
					totalCachedInputTokens: 0,
					messageCount: 0,
				},
			},
		});

		// Add welcome message
		await ctx.db.insert("messages", {
			threadId: threadId,
			timestamp: now,
			messageType: "assistant",
			parts: [
				{
					type: "text",
					text: "Welcome to Lightfast Chat! 🚀\n\nThis is a preview deployment with fresh test data. You can:\n- Send messages and see real-time updates\n- Test AI integrations\n- Explore the chat interface\n\nEnjoy testing! 💬",
					timestamp: now,
				},
			],
			status: "ready",
			metadata: {
				usage: {
					inputTokens: 0,
					outputTokens: 0,
					totalTokens: 0,
					reasoningTokens: 0,
					cachedInputTokens: 0,
				},
			},
		});

		// Add a few sample messages to demonstrate the chat
		const sampleMessages = [
			{
				text: "Hello! This is a sample message in the preview environment.",
				timestamp: now + 1000,
				messageType: "user" as const,
			},
			{
				text: "Preview deployments are great for testing features before production!",
				timestamp: now + 2000,
				messageType: "user" as const,
			},
			{
				text: "Each preview deployment gets its own fresh Convex backend with authentication support.",
				timestamp: now + 3000,
				messageType: "assistant" as const,
			},
			{
				text: "Try creating a new chat or exploring the existing conversation!",
				timestamp: now + 4000,
				messageType: "assistant" as const,
			},
		];

		for (const message of sampleMessages) {
			await ctx.db.insert("messages", {
				threadId: threadId,
				timestamp: message.timestamp,
				messageType: message.messageType,
				parts: [
					{
						type: "text",
						text: message.text,
						timestamp: message.timestamp,
					},
				],
				status: "ready",
				metadata: {
					usage: {
						inputTokens: 0,
						outputTokens: 0,
						totalTokens: 0,
						reasoningTokens: 0,
						cachedInputTokens: 0,
					},
				},
			});
		}

		console.log("✅ Preview deployment setup complete!");
		console.log(`Created test user: ${testUserId}`);
		console.log(`Created sample thread: ${threadId}`);
		console.log(`Added ${sampleMessages.length + 1} initial messages`);

		return null;
	},
});
