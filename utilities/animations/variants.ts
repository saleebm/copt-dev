import { Variants } from 'framer-motion'

// for page children
export const childrenVariants: Variants = {
  pageAnimate: {
    translateX: 0,
    opacity: 1
  },
  pageInitial: {
    translateX: 13,
    opacity: 0
  },
  pageExit: {
    translateX: -13,
    opacity: 0
  }
}
