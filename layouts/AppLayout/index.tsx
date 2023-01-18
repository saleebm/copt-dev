import React from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'

import { SocialLinks } from '../../components/SocialLinks'
import { Logo } from 'components/Logo'
import { transitionChildrenFast, transitionParent } from 'utilities/animations/transitions'
import { floatInOut } from 'utilities/animations/variants'
import styles from './styles.module.scss'

export interface AppLayoutProps {
  children: React.ReactNode
}

const LINK_CLASSES =
  'relative block sm:inline-block rounded-md sm:mt-0 mt-3 mr-0 sm:mx-1 uppercase text-center font-semibold text-lg transition duration-150 px-3 py-1'

export function AppLayout({ children }: AppLayoutProps) {
  const shouldReduceMotion = useReducedMotion()
  const { asPath } = useRouter()

  return (
    <motion.div
      initial={shouldReduceMotion ? 'pageAnimate' : 'pageInitial'}
      animate='pageAnimate'
      exit={shouldReduceMotion ? 'pageAnimate' : 'pageExit'}
      transition={transitionParent}
      className={`relative flex flex-col items-stretch m-auto h-screen w-full opacity-100`}
    >
      <header className={`relative block w-full h-auto min-w-full gutter-y gutter-x`}>
        <motion.a
          variants={floatInOut}
          transition={transitionChildrenFast}
          href='#main'
          className={`sr-only focus:not-sr-only`}
        >
          Skip to content
        </motion.a>
        <div
          className={`${styles.headerInner} relative flex flex-col flex-wrap justify-center items-center w-full mx-auto space-y-3`}
        >
          <Logo />
          <SocialLinks />
          <motion.nav
            variants={floatInOut}
            transition={transitionChildrenFast}
            className={`relative flex items-center justify-between flex-wrap`}
          >
            <div
              className={`relative w-full h-auto block flex-grow sm:flex items-center sm:w-auto`}
            >
              <Link
                href='/'
                className={`${styles['nav__item']} ${
                  asPath === '/' ? styles.active : ''
                } ${LINK_CLASSES}`}
              >
                Root
              </Link>
              <Link
                href='/story'
                className={`${styles['nav__item']} ${
                  asPath === '/story' ? styles.active : ''
                } ${LINK_CLASSES}`}
              >
                Story
              </Link>
              <Link
                href='/now'
                className={`${styles['nav__item']} ${
                  asPath === '/now' ? styles.active : ''
                } ${LINK_CLASSES}`}
              >
                Now
              </Link>
              <Link
                href='/uses'
                className={`${styles['nav__item']} ${
                  asPath === '/uses' ? styles.active : ''
                } ${LINK_CLASSES}`}
              >
                Uses
              </Link>
              <Link
                href='/musica'
                className={`${styles['nav__item']} ${
                  asPath === '/musica' ? styles.active : ''
                } ${LINK_CLASSES}`}
                title={'Music'}
              >
                🎶
              </Link>
            </div>
          </motion.nav>
        </div>
      </header>
      <main
        id='main'
        className={`relative flex flex-col sm:flex-row flex-wrap justify-center sm:justify-between items-center w-full m-0 p-0`}
      >
        {children}
      </main>
    </motion.div>
  )
}
