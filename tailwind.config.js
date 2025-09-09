/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./**/*.{html,js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./main/**/*.{js,jsx,ts,tsx}"
  ],
  darkMode: 'class', // Habilita o modo escuro via classes
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4f46e5',
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        secondary: {
          DEFAULT: '#6b7280',
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        success: {
          DEFAULT: '#10b981',
          light: '#d1fae5',
          dark: '#065f46',
        },
        danger: {
          DEFAULT: '#ef4444',
          light: '#fee2e2',
          dark: '#b91c1c',
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fef3c7',
          dark: '#92400e',
        },
        info: {
          DEFAULT: '#3b82f6',
          light: '#dbeafe',
          dark: '#1e40af',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'input-focus': '0 0 0 3px rgba(79, 70, 229, 0.3)',
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
        '128': '32rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  variants: {
    extend: {
      opacity: ['disabled'],
      backgroundColor: ['active', 'disabled'],
      textColor: ['active', 'disabled'],
      cursor: ['disabled'],
      ringWidth: ['hover', 'focus'],
      ringColor: ['hover', 'focus'],
      ringOpacity: ['hover', 'focus'],
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
  corePlugins: {
    // Desativa o reset de estilos para evitar conflitos com estilos existentes
    preflight: false,
  },
}
