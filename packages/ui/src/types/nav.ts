import type { Icons } from "../components/ui/icons"

export interface NavItem {
  title: string
  href: string
  disabled?: boolean
  external?: boolean
  icon?: keyof typeof Icons
  label?: string
}

export interface NavItemWithChildren extends NavItem {
  items: NavItemWithChildren[]
}

/**
 * A record of nav items with a string key.
 * @example ```ts
 * const nav: NavItemRecord<"home" | "about"> = {
 *   home: { title: "Home", href: "/" },
 *   about: { title: "About", href: "/about" },
 * };
 * ```
 */
export type NavItemRecord<T extends string> = Record<T, NavItem>
