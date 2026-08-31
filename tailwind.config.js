/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        popover: 'var(--popover)',
        'popover-foreground': 'var(--popover-foreground)',
        primary: '#5A413F',
        'primary-foreground': '#ffffff',
        secondary: '#B77767',
        'secondary-foreground': '#ffffff',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: '#B77767',
        'accent-foreground': '#ffffff',
        destructive: 'var(--destructive)',
        'destructive-foreground': 'var(--destructive-foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
      },
      fontFamily: {
        figtree: ['var(--font-figtree)', 'sans-serif'],
        abhaya: ['var(--font-abhaya)', 'serif'],
      },
    },
  },
  plugins: [],
}
