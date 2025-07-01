import type { NavItem } from "./nav";

/**
 * The high-level configuration for a website.
 *
 * @param T - The keys of the links object.
 * @example ```ts
 * const siteConfig: SiteConfig<"twitter" | "github"> = {
 *   name: "site-name",
 *   url: "https://site-url.com",
 *   ogImage: "https://site-url.com/og.jpg",
 *   description: "site-description",
 *   links: {
 *     twitter: {
 *       name: "Twitter",
 *       href: "https://twitter.com/site-twitter",
 *     },
 *     github: {
 *       name: "GitHub",
 *       href: "https://github.com/site-github",
 *     },
 *   },
 * };
 * ```
 */
export interface SiteConfig<T extends string> {
  name: string;
  url: string;
  ogImage: string;
  description: string;
  links: Record<T, NavItem>;
  location?: string;
}
