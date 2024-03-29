import { Transition } from 'framer-motion'

// top of the hierarchy
export const transitionParent: Transition = {
  type: 'tween',
  duration: 0.45,
  ease: [0.25, 1, 0.5, 1],
  staggerChildren: 0.09
}

export const transitionChildren: Transition = {
  type: 'tween',
  duration: 0.32
}

export const transitionChildrenFast: Transition = {
  type: 'tween',
  duration: 0.22
}
