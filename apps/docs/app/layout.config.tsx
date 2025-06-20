import type { PageTree } from "fumadocs-core/server"
import type { DocsLayoutProps } from "fumadocs-ui/layouts/docs"
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"
import { Icons } from "../components/icons"

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: <Icons.logo className="text-white w-6 h-max border" />,
    url: "https://chat.lightfast.ai",
  },
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
