/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        command: '#0f172a',
        panel: '#162033',
        line: '#26344d',
        cyan: '#22d3ee'
      }
    }
  },
  plugins: []
};
