import { siteConfig } from "@/src/lib/site-config"
import { Icons } from "@repo/ui/components/icons"
import type { PageTree } from "fumadocs-core/server"
import type { DocsLayoutProps } from "fumadocs-ui/layouts/docs"
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: <Icons.logo className="text-white w-6 h-max border" />,
    url: siteConfig.links.chat.href,
  },
  links: [
    {
      text: siteConfig.links.github.title,
      url: siteConfig.links.github.href,
      icon: <Icons.gitHub className="size-4" />,
      external: siteConfig.links.github.external,
    },
    {
      text: siteConfig.links.twitter.title,
      url: siteConfig.links.twitter.href,
      icon: <Icons.twitter className="size-3" />,
      external: siteConfig.links.twitter.external,
    },
    {
      text: siteConfig.links.discord.title,
      url: siteConfig.links.discord.href,
      icon: <Icons.discord className="size-4" />,
      external: siteConfig.links.discord.external,
    },
  ],
  themeSwitch: {
    enabled: false,
    mode: "light-dark-system",
  },
}

// We'll add the tree property in the layout file using the source object
export const createDocsOptions = (tree: PageTree.Root): DocsLayoutProps => ({
  ...baseOptions,
  tree, // Add tree from source
})
