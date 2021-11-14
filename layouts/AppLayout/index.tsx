import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

import { Logo } from 'components/Logo'
import { SocialLinks } from 'components/SocialLinks'
import { transitionChildrenFast, transitionParent } from 'utilities/animations/transitions'
import { floatInOut } from 'utilities/animations/variants'
import styles from './styles.module.scss'

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
      className={styles.wrap}
    >
      <header className={`${styles.header} gutter-y gutter-x`}>
        <motion.a
          variants={floatInOut}
          transition={transitionChildrenFast}
          href='#main'
          className={styles.skip}
        >
          Skip to content
        </motion.a>
        <div className={styles.headerInner}>
          <Logo />
          <SocialLinks />
        </div>
      </header>
      <main id='main' className={styles.main}>
        {children}
      </main>
    </motion.div>
  )
}
