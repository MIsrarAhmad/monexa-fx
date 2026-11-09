/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgDark: '#060a12',
        cardDark: 'rgba(13, 22, 38, 0.75)',
        neonCyan: '#00d4ff',
        neonBlue: '#0088ff',
      },
      boxShadow: {
        neon: '0 0 15px rgba(0, 180, 256, 0.25)',
        neonGlow: '0 0 25px rgba(0, 212, 255, 0.5)',
      },
      screens: {
        'xs': '475px',
        '2xl': '1536px',
        '3xl': '1920px', // Ultra-wide / 4K LED Screen breakpoint
      },
    },
  },
  plugins: [],
}