/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#5A413F',
        secondary: '#B77767',
        accent: '#B77767',
      },
      fontFamily: {
        figtree: ['var(--font-figtree)', 'sans-serif'],
        abhaya: ['var(--font-abhaya)', 'serif'],
      },
    },
  },
  plugins: [],
}
