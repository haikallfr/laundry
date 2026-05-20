import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e40af"
        },
        emeraldx: {
          50: "#ecfdf5",
          500: "#10b981",
          600: "#059669"
        }
      },
      boxShadow: {
        soft: "0 14px 45px rgba(16, 24, 40, 0.08)",
        subtle: "0 1px 2px rgba(16, 24, 40, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
