/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        lifecare: {
          navy: '#141C4D',
          teal: '#13808E',
          mint: '#99FFB6',
          softGreen: '#9ED0AF',
          grayLight: '#F5F7FA',
          grayMed: '#E8EAED',
        }
      }
    }
  },
  plugins: [],
}