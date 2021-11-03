import { Variants } from 'framer-motion'

// for page children
export const childrenVariants: Variants = {
  pageAnimate: {
    translateY: 0,
    opacity: 1
  },
  pageInitial: {
    translateY: 13,
    opacity: 0
  },
  pageExit: {
    translateY: -13,
    opacity: 0
  }
}
