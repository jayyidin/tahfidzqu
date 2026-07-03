/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
        arabic: ['Amiri', 'serif'],
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(0,0,0,0.05)'
      }
    },
  },
  plugins: [],
}
