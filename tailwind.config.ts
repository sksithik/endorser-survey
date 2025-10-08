import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['ui-sans-serif', 'system-ui', 'Inter', 'Arial'],
        body: ['ui-sans-serif', 'system-ui', 'Inter', 'Arial']
      }
    },
  },
  plugins: [],
} satisfies Config
