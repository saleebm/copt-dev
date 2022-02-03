/* eslint-disable */
const { spacing, fontFamily } = require('tailwindcss/defaultTheme')
const typographyPlugin = require('@tailwindcss/typography')

module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './layouts/**/*.{js,ts,jsx,tsx}',
    './styles/**/*.{scss,css}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      color: {
        primary: 'var(--theme-accent)',
        secondary: 'var(--theme-accent-secondary)',
        contrast: 'var(--theme-accent-contrast)'
      },
      fontFamily: {
        sans: ['Inter var', ...fontFamily.sans]
      },
      typography: theme => ({
        // this is for markdown content
        // https://sergiodxa.com/articles/use-tailwindcss-typography-with-dark-mode-styles
        // https://github.com/tailwindlabs/tailwindcss-typography
        DEFAULT: {
          css: {
            color: theme('colors.gray.700'),
            a: {
              color: theme('colors.purple.500'),
              '&:hover': {
                color: theme('colors.purple.700')
              },
              code: { color: theme('colors.purple.400') }
            },
            'h2,h3,h4': {
              'scroll-margin-top': spacing[32]
            },
            code: { color: theme('colors.pink.500') },
            'blockquote p:first-of-type::before': false,
            'blockquote p:last-of-type::after': false
          }
        },
        dark: {
          css: {
            color: theme('colors.gray.300'),
            a: {
              color: theme('colors.purple.400'),
              '&:hover': {
                color: theme('colors.purple.600')
              },
              code: { color: theme('colors.purple.400') }
            },
            blockquote: {
              borderLeftColor: theme('colors.gray.700'),
              color: theme('colors.gray.300')
            },
            'h2,h3,h4': {
              color: theme('colors.gray.100'),
              'scroll-margin-top': spacing[32]
            },
            hr: { borderColor: theme('colors.gray.700') },
            ol: {
              li: {
                '&:before': { color: theme('colors.gray.500') }
              }
            },
            ul: {
              li: {
                '&:before': { backgroundColor: theme('colors.gray.500') }
              }
            },
            strong: { color: theme('colors.gray.300') },
            thead: {
              color: theme('colors.gray.100')
            },
            tbody: {
              tr: {
                borderBottomColor: theme('colors.gray.700')
              }
            }
          }
        }
      })
    }
  },
  plugins: [typographyPlugin],
  variants: {
    extend: {
      scale: ['motion-safe', 'hover', 'focus'],
      transform: ['motion-safe', 'hover', 'focus'],
      translate: ['motion-safe', 'hover', 'focus'],
      opacity: ['motion-safe', 'hover', 'focus']
    },
    typography: ['dark']
  }
}
