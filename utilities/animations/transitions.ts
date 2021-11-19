import { Transition } from 'framer-motion'

// top of the hierarchy
export const transitionParent: Transition = {
  type: 'tween',
  duration: 0.5,
  ease: [0.25, 1, 0.5, 1],
  staggerChildren: 0.09
}

export const transitionChildren: Transition = {
  type: 'tween',
  duration: 0.42,
  ease: [0.25, 1, 0.5, 1]
}

export const transitionChildrenFast: Transition = {
  type: 'tween',
  duration: 0.2,
  ease: [0.25, 1, 0.5, 1]
}
