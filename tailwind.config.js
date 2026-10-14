/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#080B12',
        surface: {
          50: '#151C2C',
          100: '#111726',
          200: '#0E1320',
          300: '#0B0F19',
          border: '#1E273D',
          hover: '#1B2338',
        },
        brand: {
          blue: '#3B82F6',
          cyan: '#06B6D4',
          indigo: '#6366F1',
          violet: '#8B5CF6',
          purple: '#A855F7',
          emerald: '#10B981',
          amber: '#F59E0B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow-sm': '0 0 15px -3px rgba(59, 130, 246, 0.25)',
        'glow-md': '0 0 30px -5px rgba(99, 102, 241, 0.3)',
        'glow-lg': '0 0 50px -10px rgba(139, 92, 246, 0.35)',
        'inner-glow': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.08)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flow-line': 'flow 2s linear infinite',
      },
      keyframes: {
        flow: {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        }
      }
    },
  },
  plugins: [],
}
