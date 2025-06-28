import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up expired/abandoned streams every minute (matching persistent-text-streaming)
crons.interval(
	"cleanup expired streams",
	{ minutes: 1 }, // Run every minute like persistent-text-streaming
	internal.streams.cleanupExpiredStreams,
	{
		maxAgeMs: 20 * 60 * 1000, // 20 minutes timeout like persistent-text-streaming
	},
);

export default crons;
