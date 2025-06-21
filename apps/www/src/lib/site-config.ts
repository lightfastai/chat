import type { SiteConfig } from "@repo/ui/types/site"

type SiteLinks =
  | "twitter"
  | "github"
  | "discord"
  | "privacy"
  | "terms"
  | "chat"
  | "docs"

export const siteConfig: SiteConfig<SiteLinks> = {
  name: "Lightfast Chat",
  url: "https://chat.lightfast.ai",
  ogImage: "https://lightfast.ai/og.jpg",
  description:
    "Real-time AI chat application with Claude 4, GPT-4o, and streaming responses. Built with Next.js and Convex for intelligent conversations.",
  links: {
    twitter: {
      title: "Twitter",
      href: "https://x.com/lightfastai",
      external: true,
    },
    github: {
      title: "GitHub",
      href: "https://github.com/lightfastai/chat",
      external: true,
    },
    discord: {
      title: "Discord",
      href: "https://discord.gg/YqPDfcar2C",
      external: true,
    },
    privacy: {
      title: "Privacy Policy",
      href: "https://lightfast.ai/legal/privacy",
      external: true,
    },
    terms: {
      title: "Terms & Conditions",
      href: "https://lightfast.ai/legal/terms",
      external: true,
    },
    chat: {
      title: "Chat",
      href: "https://chat.lightfast.ai",
    },
    docs: {
      title: "Documentation",
      href: "https://chat.lightfast.ai/docs",
    },
  },
  location: "3141, Melbourne, VIC, Australia",
}

// Export additional metadata that was previously in the config
export const siteMetadata = {
  keywords: [
    "AI chat",
    "Claude 4",
    "GPT-4o",
    "real-time chat",
    "AI assistant",
    "streaming chat",
    "GitHub authentication",
    "Convex database",
    "Next.js chat",
    "Claude Sonnet",
    "AI conversation",
    "chat application",
    "Anthropic Claude",
    "OpenAI GPT",
    "Lightfast",
    "machine learning chat",
    "AI messaging",
    "conversational AI",
    "intelligent chat",
    "thread management",
  ] as string[],
  authors: [
    {
      name: "Lightfast",
      url: "https://lightfast.ai",
    },
  ],
  creator: "Lightfast",
}
