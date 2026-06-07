/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
  theme: {
    extend: {
      colors: {
        background: 'var(--md-sys-color-background, #141218)',
        surface: 'var(--md-sys-color-surface, #141218)',
        'surface-dim': 'var(--md-sys-color-surface-dim, #141218)',
        'surface-container-lowest': 'var(--md-sys-color-surface-container-lowest, #0f0d13)',
        'surface-container-low': 'var(--md-sys-color-surface-container-low, #1d1b20)',
        'surface-container': 'var(--md-sys-color-surface-container, #211f26)',
        'surface-container-high': 'var(--md-sys-color-surface-container-high, #2b2930)',
        'surface-container-highest': 'var(--md-sys-color-surface-container-highest, #36343b)',
        'on-surface': 'var(--md-sys-color-on-surface, #e6e0e9)',
        'on-surface-variant': 'var(--md-sys-color-on-surface-variant, #cac4d0)',
        primary: 'var(--md-sys-color-primary, #d0bcff)',
        'on-primary': 'var(--md-sys-color-on-primary, #381e72)',
        'primary-container': 'var(--md-sys-color-primary-container, #4f378b)',
        'on-primary-container': 'var(--md-sys-color-on-primary-container, #eaddff)',
        secondary: 'var(--md-sys-color-secondary, #ccc2dc)',
        'on-secondary': 'var(--md-sys-color-on-secondary, #332d41)',
        'secondary-container': 'var(--md-sys-color-secondary-container, #4a4458)',
        'on-secondary-container': 'var(--md-sys-color-on-secondary-container, #e8def8)',
        tertiary: 'var(--md-sys-color-tertiary, #efb8c8)',
        'on-tertiary': 'var(--md-sys-color-on-tertiary, #492532)',
        'tertiary-container': 'var(--md-sys-color-tertiary-container, #633b48)',
        'on-tertiary-container': 'var(--md-sys-color-on-tertiary-container, #ffd8e4)',
        outline: 'var(--md-sys-color-outline, #938f99)',
        'outline-variant': 'var(--md-sys-color-outline-variant, #49454f)',
        error: 'var(--md-sys-color-error, #f2b8b5)',
        'on-error': 'var(--md-sys-color-on-error, #8c1d18)',
        'error-container': 'var(--md-sys-color-error-container, #8c1d18)',
        'on-error-container': 'var(--md-sys-color-on-error-container, #f9dedc)',
      },
      fontFamily: {
        sans: ['Outfit', 'Roboto', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
}
