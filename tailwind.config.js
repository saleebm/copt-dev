/* eslint-disable */
const { spacing, fontFamily } = require('tailwindcss/defaultTheme')
const typographyPlugin = require('@tailwindcss/typography')

module.exports = {
  purge: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './layouts/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  variants: {
    extend: {
      animation: ['hover', 'focus', 'motion-safe', 'motion-reduce']
    }
  },
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
      transform: ['hover', 'focus'],
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
  variants: {
    typography: ['dark']
  },
  plugins: [typographyPlugin]
}
