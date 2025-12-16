// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}", 
  ],
  // ✅ PERBAIKAN KRITIS: Aktifkan dark mode berbasis class
  darkMode: 'class', 
  theme: {
    extend: {},
  },
  plugins: [],
}