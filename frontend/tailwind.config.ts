/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        runway: {
          green: '#1D8837',
          fern: '#187430',
          sprout: '#3FA85E',
          'night-soil': '#0D0F0E',
          'potting-bench': '#141716',
          'slate-leaf': '#1A1E1C',
          'bench-hover': '#1F2321',
          mist: '#E8ECE9',
          sage: '#9AA59D',
          lichen: '#848D86',
          stone: '#7C8780',
          rust: '#E0805C',
          'rust-light': '#B4512C',
          amber: '#D9A441',
          heather: '#B76BA3',
        },
        hairline: {
          DEFAULT: 'rgba(232, 240, 234, 0.07)',
          strong: 'rgba(232, 240, 234, 0.13)',
        },
        sprout: {
          wash: 'rgba(63, 168, 94, 0.12)',
          edge: 'rgba(63, 168, 94, 0.45)',
        },
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '10px',
        xl: '14px',
        pill: '20px',
      },
      fontSize: {
        'label': ['11px', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.05em' }],
        'data': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        'body': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'summary': ['15px', { lineHeight: '1.4', fontWeight: '400' }],
        'headline': ['16px', { lineHeight: '1.3', fontWeight: '500' }],
        'wordmark': ['13px', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '0.08em' }],
      },
    },
  },
  plugins: [],
};
