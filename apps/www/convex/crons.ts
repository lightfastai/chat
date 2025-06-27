import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up expired/abandoned streams every hour
crons.interval(
  "cleanup expired streams",
  { hours: 1 },
  internal.streams.cleanupExpiredStreams,
  {
    maxAgeMs: 60 * 60 * 1000, // 1 hour
  }
);

export default crons;