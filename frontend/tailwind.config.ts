import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f6ff',
          500: '#2f6ef4',
          600: '#1f5adb',
          900: '#0f2456'
        }
      }
    }
  },
  plugins: []
}

export default config
