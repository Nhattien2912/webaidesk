/** @type {import('tailwindcss').Config} */
// AI Desk V3 keeps the legacy semantic palette for resource pages and adds an explicit
// premium-light token family for the homepage and shared chrome.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0B1F4D',
          primary: '#2563EB',
          sky: '#60A5FA',
          ice: '#EAF2FF',
          surface: '#F8FAFC',
          text: '#1F2937',
          muted: '#64748B',
          border: '#E5E7EB',
          success: '#10B981',
        },
        navy: {
          DEFAULT: '#0A0F1C',
          950: '#05080F',
          900: '#070B15',
          800: '#0E1526',
          700: '#141D33',
          600: '#1B2742',
          line: '#1F2A44',
        },
        ink: '#E8ECF4',
        muted: '#A3AEC2',
        subtle: '#76839A',
        paper: '#0E1526',
        line: '#1F2A44',
        accent: {
          DEFAULT: '#2F7BF5',
          hover: '#4A8EFA',
          soft: 'rgba(47, 123, 245, 0.12)',
          light: '#7DB2FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Cascadia Mono', 'Consolas', 'monospace'],
      },
      maxWidth: {
        content: '1220px',
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [],
}
