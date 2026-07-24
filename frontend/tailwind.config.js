/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        govBlue: {
          light: '#2563eb',
          DEFAULT: '#1e3a8a',
          dark: '#0f172a',
        },
      },
    },
  },
  plugins: [],
}
