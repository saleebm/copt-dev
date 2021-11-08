import { Variants } from 'framer-motion'

// for page children
export const floatLeft: Variants = {
  pageAnimate: {
    translateX: 0,
    opacity: 1
  },
  pageInitial: {
    translateX: 40,
    opacity: 0
  },
  pageExit: {
    translateX: -20,
    opacity: 0
  }
}

export const floatIn: Variants = {
  pageAnimate: {
    translateY: 0,
    opacity: 1
  },
  pageInitial: {
    translateY: -10,
    opacity: 0
  },
  pageExit: {
    translateY: -15,
    opacity: 0
  }
}
