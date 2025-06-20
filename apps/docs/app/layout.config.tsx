import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <div className="flex items-center gap-2">
        <svg
          width="104"
          height="70"
          viewBox="0 0 104 70"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Lightfast"
        >
          <title>Lightfast</title>
          <path
            d="M15.3354 57.3195H47.1597V69.7863H0.543457V0.632019H15.3354V57.3195Z"
            fill="currentColor"
          />
          <path
            d="M79.6831 69.7863H65.2798L89.0532 0.658386H103.457L79.6831 69.7863Z"
            fill="currentColor"
          />
        </svg>
        <span className="text-2xl font-bold">Lightfast Chat</span>
      </div>
    ),
  },
  links: [
    {
      text: "Documentation",
      url: "/",
      active: "nested-url",
    },
    {
      text: "GitHub",
      url: "https://github.com/lightfastai/chat",
      external: true,
    },
  ],
}
