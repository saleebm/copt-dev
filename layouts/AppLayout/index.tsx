import React from 'react'
import Link from 'next/link'
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
          <motion.nav
            variants={floatInOut}
            transition={transitionChildrenFast}
            className={styles.nav}
          >
            <div className={styles['nav__items-wrap']}>
              <Link href='/'>
                <a className={styles['nav__item']}>Root</a>
              </Link>
              <Link href='/now'>
                <a className={styles['nav__item']}>Now</a>
              </Link>
              <Link href='/uses'>
                <a className={styles['nav__item']}>Uses</a>
              </Link>
            </div>
          </motion.nav>
        </div>
      </header>
      <main id='main' className={styles.main}>
        {children}
      </main>
    </motion.div>
  )
}
