/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        sage: '#87A878',
        'sage-light': '#A8C499',
        'sage-dark': '#5E8550',
        forest: '#2D5A27',
        mint: '#C8E6C0',
        beige: '#F5EDD6',
        'beige-light': '#FAF5E8',
        cream: '#FFF8ED',
        sand: '#E8D5B0',
        earth: '#8B6B47',
        'earth-dark': '#5C3D1E',
        'warm-brown': '#A0724A',
        golden: '#D4A853',
        amber: '#E8B84B',
        peach: '#F0C090',
        'night-sky': '#1A2744',
        'night-forest': '#0D2318',
      },
      fontFamily: {
        'display': ['Baloo2_600SemiBold'],
        'sans': ['NunitoSans_400Regular'],
      },
    },
  },
  plugins: [],
};
