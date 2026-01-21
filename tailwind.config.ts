import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#EA580C',    // orange-600
          secondary: '#DC2626',  // red-600
          gradient: {
            from: '#F97316',     // orange-500
            to: '#DC2626',       // red-600
          },
        },
        surface: {
          glass: 'rgba(255, 255, 255, 0.2)',
          'glass-hover': 'rgba(255, 255, 255, 0.25)',
          'glass-border': 'rgba(255, 255, 255, 0.1)',
          card: '#FFFFFF',
        },
        action: {
          positive: '#22C55E',   // green-500 (like/yes)
          'positive-hover': '#16A34A', // green-600
          negative: '#EF4444',   // red-500 (nope/no)
          'negative-hover': '#DC2626', // red-600
          warning: '#F59E0B',    // amber-500
        },
      },
      borderRadius: {
        'card': '1rem',
        'button': '9999px',
      },
      boxShadow: {
        'card': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'card-hover': '0 30px 60px -15px rgba(0, 0, 0, 0.3)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
      },
      backdropBlur: {
        'glass': '8px',
      },
    },
  },
  plugins: [],
}
export default config
