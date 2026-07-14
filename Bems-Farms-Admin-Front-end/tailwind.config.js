/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        green: {
          primary: '#1B4332',
          mid:     '#40916C',
          light:   '#D8F3DC',
        },
        orange: {
          accent: '#F57C00',
          light:  '#FFF3E0',
        },
      },
      fontFamily: {
        syne:   ['Syne', 'sans-serif'],
        nunito: ['Nunito', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        btn:  '8px',
      },
      boxShadow: {
        card:  '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        green: '0 8px 24px rgba(27,67,50,0.10)',
      },
    },
  },
  plugins: [],
}
