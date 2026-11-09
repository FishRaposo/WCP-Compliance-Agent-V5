import type { Config } from "tailwindcss";

const brass = {
  50: "#f7f1e4",
  100: "#eadcc4",
  200: "#d9c39b",
  300: "#c9a86d",
  400: "#b88d4f",
  500: "#a97c3f",
  600: "#8a6a33",
  700: "#6a5128",
  800: "#49391f",
  900: "#302716",
  950: "#19140b",
};

const ledgerNeutral = {
  50: "#f7f2e8",
  100: "#ece4d6",
  200: "#d8cdbb",
  300: "#c9bba5",
  400: "#b8a78f",
  500: "#9c8b73",
  600: "#7f705b",
  700: "#655746",
  800: "#493e32",
  900: "#302921",
  950: "#1b1711",
};

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        indigo: brass,
        violet: brass,
        purple: brass,
        gray: ledgerNeutral,
        zinc: ledgerNeutral,
        slate: ledgerNeutral,
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
