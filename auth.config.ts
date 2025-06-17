export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
  // site: process.env.VERCEL_URL
  //   ? `https://${process.env.VERCEL_URL}`
  //   : process.env.SITE_URL || "http://localhost:3000",
}
