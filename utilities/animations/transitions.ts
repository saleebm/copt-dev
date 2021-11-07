import { Transition } from 'framer-motion'

// top of the hierarchy
export const transitionParent: Transition = {
  type: 'tween',
  duration: 1,
  ease: [0.165, 0.44, 0.84, 1],
  staggerChildren: 0.05
}

export const transitionChildren: Transition = {
  type: 'tween',
  duration: 0.69,
  ease: [0.165, 0.84, 0.44, 1]
}

export const transitionChildrenFast: Transition = {
  type: 'tween',
  duration: 0.42,
  ease: [0.165, 0.66, 0.44, 1]
}