import type { Config } from 'tailwindcss'

/**
 * Design tokens — two skins, one brand.
 *
 * Dark Ember (default): all library/community surfaces. #222 pages, #333
 * cards, #EA4D19 accent. Components in components/ui/ are dark-first.
 *
 * Sunset Glass (session "game mode"): setup/voting/results only. Orange→red
 * gradient pages, glass + white cards, pill shapes.
 *
 * Accessibility floors (on surface-page/card): meaningful text ≥ white/60;
 * white/50 only for secondary text ≥14px; white/40 is decorative or ≥24px.
 * White text on brand passes AA only for bold/large — never body copy.
 */
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#EA4D19',
          hover: '#EA580C',
          soft: 'rgba(234, 77, 25, 0.15)',
        },
        surface: {
          page: '#222222',
          card: '#333333',
          'card-hover': '#3A3A3A',
          glass: 'rgba(255, 255, 255, 0.2)',
          'glass-hover': 'rgba(255, 255, 255, 0.25)',
          'glass-border': 'rgba(255, 255, 255, 0.1)',
        },
        sunset: {
          from: '#F97316',
          to: '#DC2626',
        },
        action: {
          positive: '#22C55E',
          'positive-hover': '#16A34A',
          negative: '#EF4444',
          'negative-hover': '#DC2626',
          warning: '#F59E0B',
        },
      },
      borderRadius: {
        card: '0.75rem',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 10px 40px rgba(0, 0, 0, 0.5)',
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
        'card-light': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      },
      backdropBlur: {
        glass: '8px',
      },
      keyframes: {
        'modal-in': {
          from: { opacity: '0', transform: 'translate(-50%, -50%) scale(0.95)' },
          to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'tooltip-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'modal-in': 'modal-in 200ms ease-out',
        'fade-in': 'fade-in 200ms ease-out',
        'tooltip-in': 'tooltip-in 150ms ease-out',
      },
    },
  },
  plugins: [],
}
export default config
