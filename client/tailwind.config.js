/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Real-estate brand palette: clean, neutral, premium
        brand: {
          accent: '#D4AF37',   // muted luxury gold for highlights
          ink: '#0A0A0A',
          paper: '#F5F5F4',
        },
        // Backwards-compat alias so legacy components keep compiling.
        // Re-pointed from Spotify green to a neutral light tone.
        spotify: {
          green: '#D4AF37',
          yellow: '#D4AF37',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
