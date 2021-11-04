import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

import { Logo } from 'components/Logo'
import { SocialLinks } from 'components/SocialLinks'
import { transitionChildren, transitionParent } from 'utilities/animations/transitions'
import { childrenVariants } from 'utilities/animations/variants'
import styles from './app-layout.module.scss'

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
      className={`h-screen opacity-100 flex flex-col justify-stretch items-stretch m-auto w-full ${styles.wrap}`}
    >
      <header className='relative flex flex-col sm:flex-row flex-wrap justify-center sm:justify-between items-center'>
        <motion.a
          variants={childrenVariants}
          transition={transitionChildren}
          href='#main'
          className='sr-only focus:not-sr-only'
        >
          Skip to content
        </motion.a>
        <Logo />
        <SocialLinks />
      </header>
      <main id='main' className='relative block h-auto'>
        {children}
      </main>
    </motion.div>
  )
}
