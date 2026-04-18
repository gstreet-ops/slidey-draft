import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        accent: {
          primary: "var(--accent-primary)",
          secondary: "var(--accent-secondary)",
          text: "var(--accent-text)",
          light: "var(--accent-light)",
        },
        surface: {
          page: "var(--bg-page)",
          card: "var(--bg-card)",
          section: "var(--bg-section)",
          nav: "var(--bg-nav)",
          // Legacy keys retained so existing utilities like `bg-surface-dark` keep compiling
          dark: "var(--bg-section)",
          elevated: "var(--bg-card)",
        },
        content: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        border: {
          DEFAULT: "var(--border)",
          light: "var(--border-light)",
        },
        // Steelers/slidey legacy aliases — kept so any leftover `bg-steelers-gold`
        // or `text-slidey` still compiles and renders the active accent.
        steelers: {
          gold: "var(--accent-primary)",
          black: "var(--bg-page)",
          white: "#FFFFFF",
          darkGold: "var(--accent-secondary)",
        },
        slidey: "var(--accent-primary)",
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
