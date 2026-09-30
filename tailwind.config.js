/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        goride: {
          black: '#000000',
          green: '#10B981',
          white: '#FFFFFF',
          gray: '#F3F4F6',
        },
      },
    },
  },
  plugins: [],
}