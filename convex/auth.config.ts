import { env } from "./env.js"

export default {
  providers: [
    {
      domain: env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
  // site: env.VERCEL_URL
  //   ? `https://${env.VERCEL_URL}`
  //   : env.SITE_URL || "http://localhost:3000",
}
