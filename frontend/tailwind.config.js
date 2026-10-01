/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#17aefa',
        secondary: '#3eebe2',
        success: '#81e614',
        danger: '#ef4444',
        warning: '#f5ce0be1',
      }
    },
  },
  plugins: [],
}