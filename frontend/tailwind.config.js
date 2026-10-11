/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#030303',
        secondary: '#090909',
        panel: 'rgba(18, 18, 18, 0.78)',
        border: 'rgba(255, 255, 255, 0.10)',
        'accent-violet': '#8B5CF6',
        'accent-cyan': '#06B6D4',
        'accent-blue': '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
