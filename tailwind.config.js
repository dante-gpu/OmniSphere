/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#f4022f',
          dark: '#D62E23',
          light: '#FF6B62',
        },
        neutral: {
          50: '#F5F5F7',
          500: '#86868B',
          900: '#1D1D1F',
        },
      },
      borderRadius: {
        DEFAULT: '12px',
      },
      boxShadow: {
        card: '0 4px 6px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
};