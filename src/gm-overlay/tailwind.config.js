/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.{js,ts,jsx,tsx}",
    "./index.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./store/**/*.{js,ts,jsx,tsx}",
    "./types/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neutral: {
          850: '#1f1f1f',
        },
        gm: {
          bg: {
            primary: '#171717',
            secondary: '#262626',
            tertiary: '#1f1f1f',
          },
          text: {
            primary: '#fafafa',
            secondary: '#a3a3a3',
            muted: '#737373',
          },
          accent: {
            cyan: '#06b6d4',
            amber: '#f59e0b',
            green: '#22c55e',
            red: '#ef4444',
          },
          border: {
            DEFAULT: '#404040',
            dim: '#525252',
          },
        },
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
