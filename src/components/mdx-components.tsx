import defaultComponents from "fumadocs-ui/mdx"

export function useMDXComponents(components?: any): any {
  return {
    ...defaultComponents,
    ...components,
  }
}
