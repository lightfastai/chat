import type React from "react"

type IconProps = React.SVGProps<SVGSVGElement>

export const Icons = {
  logo: (props: IconProps) => (
    <svg
      width="104"
      height="70"
      viewBox="0 0 104 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Lightfast"
      {...props}
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
  ),
  logoShort: (props: IconProps) => (
    <svg
      width="28"
      height="16"
      viewBox="0 0 28 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Lightfast"
      {...props}
    >
      <title>Lightfast</title>
      <path
        d="M0.00254059 15.9114V0.468937H3.30854V15.0197L1.48154 13.1274H10.4208V15.9114H0.00254059Z"
        fill="currentColor"
      />
      <path
        d="M18.1709 15.8683H14.3535L23.2735 0.418152H27.0909L18.1709 15.8683Z"
        fill="currentColor"
      />
    </svg>
  ),
}
