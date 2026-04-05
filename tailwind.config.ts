import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        lions: { blue: "#0076B6", silver: "#B0B7BC", black: "#000000" },
        gtown: { navy: "#041E42", gray: "#8D817B", accent: "#5B6B80", highlight: "#4A7AB5" },
        slidey: "#4A7AB5",
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
