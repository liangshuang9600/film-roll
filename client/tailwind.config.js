/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        film: {
          dark: '#1a1a1a',
          darker: '#0d0d0d',
          border: '#333333',
          amber: '#c8a45c',
          green: '#4a7c59',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
};
