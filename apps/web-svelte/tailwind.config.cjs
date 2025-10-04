/** @type {import('tailwindcss').Config} */
const path = require('path');

module.exports = {
  darkMode: 'class', // habilita modo oscuro por clase 'dark' en <html>
  content: [
    path.join(__dirname, 'src/**/*.{html,js,svelte,ts}')
  ],
  safelist: ['bottom-4', 'right-4'],
  theme: {
    extend: {}
  },
  plugins: [require('@tailwindcss/forms')]
};
