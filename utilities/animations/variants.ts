import { Variants } from 'framer-motion'

// for page children
export const floatLeft: Variants = {
  pageAnimate: {
    translateX: 0,
    opacity: 1
  },
  pageInitial: {
    translateX: 0,
    opacity: 0
  },
  pageExit: {
    translateX: -10,
    opacity: 0
  }
}

// only floats in, no exit translate animation
export const floatIn: Variants = {
  pageAnimate: {
    translateY: 0,
    opacity: 1
  },
  pageInitial: {
    translateY: -5,
    opacity: 0
  },
  pageExit: {
    opacity: 0
  }
}

export const floatInOut: Variants = {
  ...floatIn,
  pageExit: {
    translateY: 5,
    opacity: 0
  }
}
