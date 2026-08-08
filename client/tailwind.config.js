/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2E7D32', dark: '#1B5E20', light: '#4CAF50' },
        accent:  { DEFAULT: '#F57C00', light: '#FF9800' },
        cream:   { DEFAULT: '#FBF8F3', dark: '#F3EDE1' },
      },
      fontFamily: {
        sans:    ['Nunito', 'system-ui', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
      },
    },
  },
  plugins: [],
}