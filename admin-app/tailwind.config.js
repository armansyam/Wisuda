/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        dark: { 50: '#f5f5f5', 100: '#e0e0e0', 200: '#b0b0b0', 300: '#808080', 400: '#505050', 500: '#303030', 600: '#252525', 700: '#1a1a1a', 800: '#0f0f0f', 900: '#0a0a0a' },
      },
    },
  },
  plugins: [],
}