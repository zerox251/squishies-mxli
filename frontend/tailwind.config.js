/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'pop-coral':   '#D4505C',
        'pop-rose':    '#F2A5B5',
        'pop-lav':     '#9BA8D0',
        'pop-bg':      '#0F0F13',
        'pop-card':    '#1A1A24',
        'pop-border':  'rgba(255,255,255,0.06)',
      },
      fontFamily: {
        anton:      ['Anton', 'sans-serif'],
        montserrat: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
