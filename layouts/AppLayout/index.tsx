import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { transitionParent } from 'utilities/animations/transitions'
import { Logo } from 'components/Logo'

export interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? 'pageAnimate' : 'pageInitial'}
      animate='pageAnimate'
      exit={shouldReduceMotion ? 'pageAnimate' : 'pageExit'}
      transition={transitionParent}
      className='h-screen opacity-100 flex flex-col justify-stretch items-stretch'
    >
      <header className='relative flex flex-row flex-wrap justify-start items-center'>
        <Logo />
      </header>
      <main className='relative block h-auto'>{children}</main>
    </motion.div>
  )
}
