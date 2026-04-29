/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0062F4',
          dark:    '#7B2FFF',
          light:   '#E8F0FE',
        },
      },
    },
  },
  plugins: [],
}
