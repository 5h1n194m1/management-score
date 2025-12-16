/** @type {import('tailwindcss').Config} */
export default {
  content:[
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
      },
      colors: {
        brand: {
          primary: '#4f46e5',
          secondary: '#0ea5e9',
          accent: '#10b981',
          warn: '#f59e0b',
          danger: '#ef4444',
        },
      },
    },
  },
  plugins: [],
}
