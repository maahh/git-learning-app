import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#060807",
        panel: "#101612",
        panel2: "#172019",
        accent: "#55d887",
        success: "#6ee7a8",
        warn: "#f5b65b",
        danger: "#ff6b6b",
        text: "#e7f3ea",
        textMuted: "#94a39a",
        border: "#29342d",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Noto Sans JP",
          "-apple-system",
          "BlinkMacSystemFont",
          "Hiragino Kaku Gothic ProN",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "SFMono-Regular",
          "Menlo",
          "ui-monospace",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
