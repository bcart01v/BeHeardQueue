import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#ffa300',
          dark: '#ffa300',
        },
        secondary: {
          light: '#3e2802',
          dark: '#3e2802',
        },
        background: {
          light: '#ffffff',
          dark: '#1e1b1b',
        },
        surface: {
          light: '#f3f4f6',
          dark: '#2a1c01',
        },
        text: {
          light: '#3e2802',
          dark: '#ffa300',
        },
      },
    },
  },
  plugins: [],
};

export default config; 