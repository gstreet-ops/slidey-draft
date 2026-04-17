import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        steelers: {
          gold: "#FFB612",
          black: "#101820",
          white: "#FFFFFF",
          darkGold: "#CC9200",
        },
        surface: {
          dark: "#1a2433",
          card: "#243040",
          elevated: "#2d3a4d",
        },
        slidey: "#FFB612",
      },
      fontFamily: {
        display: ["Bebas Neue", "sans-serif"],
        sans: ["IBM Plex Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
