import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        lien: {
          bg: "var(--lien-bg)",
          surface: "var(--lien-surface)",
          soft: "var(--lien-surface-soft)",
          ink: "var(--lien-ink)",
          muted: "var(--lien-muted)",
          primary: "var(--lien-primary)",
          primaryDark: "var(--lien-primary-dark)",
          accent: "var(--lien-accent)",
          sage: "var(--lien-sage)",
          border: "var(--lien-border)"
        }
      },
      borderRadius: {
        lien: "20px",
        "lien-sm": "14px"
      },
      boxShadow: {
        lien: "var(--lien-shadow)",
        "lien-sm": "var(--lien-shadow-sm)"
      },
      fontFamily: {
        sans: [
          "Noto Sans JP",
          "Zen Kaku Gothic New",
          "Hiragino Sans",
          "Yu Gothic UI",
          "system-ui",
          "sans-serif"
        ],
        display: [
          "Noto Serif JP",
          "Yu Mincho",
          "Hiragino Mincho ProN",
          "serif"
        ]
      }
    }
  },
  plugins: []
};

export default config;
