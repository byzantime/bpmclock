/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        // Light, clean palette - opposite of Braun dark theme
        'cream': '#faf8f5',
        'cream-dark': '#f5f3f0',
        'cream-border': '#e8e5e0',
        'charcoal': '#2d2d2d',
        'charcoal-light': '#4a4a4a',
        'charcoal-dim': '#6b6b6b',
        // Sophisticated muted blue - not garish
        'slate-blue': '#5b7c99',
        'slate-blue-light': '#7a96b0',
        'slate-blue-dark': '#4a6580',
        // Feedback colors
        'success-green': '#4a7c59',
        'warning-amber': '#c4914e',
        'error-red': '#a85858',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      fontSize: {
        'display': ['4rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
        'xl-time': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'soft-lg': '0 4px 16px rgba(0, 0, 0, 0.1)',
        'blue-glow': '0 0 20px rgba(91, 124, 153, 0.2)',
      },
      borderRadius: {
        'soft': '4px',
      },
    },
  },
  plugins: [],
}
