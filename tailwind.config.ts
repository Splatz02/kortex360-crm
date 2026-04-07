import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        foreground: "#f5f5f5",
        card: "#1a1a1a",
        "card-hover": "#222222",
        border: "#2a2a2a",
        "text-primary": "#f5f5f5",
        "text-secondary": "#9ca3af",
        "text-muted": "#6b7280",
        neon: {
          cyan: "#00f0ff",
          green: "#39ff14",
          pink: "#ff00ff",
          purple: "#a855f7",
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 10px #00f0ff, 0 0 20px rgba(0, 240, 255, 0.3)',
        'neon-green': '0 0 10px #39ff14, 0 0 20px rgba(57, 255, 20, 0.3)',
        'neon-pink': '0 0 10px #ff00ff, 0 0 20px rgba(255, 0, 255, 0.3)',
        'neon-purple': '0 0 10px #a855f7, 0 0 20px rgba(168, 85, 247, 0.3)',
      },
    },
  },
  plugins: [],
};
export default config;