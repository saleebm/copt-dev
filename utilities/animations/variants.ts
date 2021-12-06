import type { Variants, Transition } from 'framer-motion'

const transitionEaseInCirc: Transition = {
  // https://easings.net/#easeInCirc
  ease: [0.55, 0, 1, 0.45]
}

const transitionEaseOutCirc: Transition = {
  ease: [0, 0.55, 0.45, 1]
}

// for page children
export const floatLeft: Variants = {
  pageAnimate: {
    translateX: 0,
    opacity: 1,
    transition: transitionEaseOutCirc
  },
  pageInitial: {
    translateX: 0,
    opacity: 0,
    transition: transitionEaseInCirc
  },
  pageExit: {
    translateX: -10,
    opacity: 0,
    transition: transitionEaseInCirc
  }
}

// only floats in, no exit translate animation
export const floatIn: Variants = {
  pageAnimate: {
    translateY: 0,
    opacity: 1,
    transition: transitionEaseOutCirc
  },
  pageInitial: {
    translateY: -5,
    opacity: 0,
    transition: transitionEaseInCirc
  },
  pageExit: {
    opacity: 0,
    transition: transitionEaseInCirc
  }
}

export const floatInOut: Variants = {
  ...floatIn,
  pageExit: {
    translateY: 5,
    opacity: 0,
    transition: transitionEaseInCirc
  }
}
