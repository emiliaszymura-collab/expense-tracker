/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Kolory kategorii — spójne z markerami na mapie.
        cat: {
          sleep: '#3b82f6',      // niebieski
          shower: '#14b8a6',     // turkusowy
          sightseeing: '#22c55e',// zielony
          club: '#a855f7',       // fioletowy
          food: '#f97316',       // pomarańczowy
          parking: '#64748b',    // szary
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
