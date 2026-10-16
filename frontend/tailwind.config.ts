/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Semantic tokens — adapt to dark/light via CSS vars
        surface: {
          bg: 'var(--bg)',
          panel: 'var(--panel)',
          raised: 'var(--raised)',
          hover: 'var(--hover)',
        },
        border: {
          line: 'var(--line)',
          strong: 'var(--line-strong)',
        },
        content: {
          DEFAULT: 'var(--text)',
          muted: 'var(--muted)',
          faint: 'var(--faint)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          btn: 'var(--accent-btn)',
          'btn-hover': 'var(--accent-btn-hover)',
          soft: 'var(--accent-soft)',
          line: 'var(--accent-line)',
        },
        status: {
          hi: 'var(--hi)',
          mid: 'var(--mid)',
          lo: 'var(--lo)',
          prog: 'var(--prog)',
          rev: 'var(--rev)',
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
