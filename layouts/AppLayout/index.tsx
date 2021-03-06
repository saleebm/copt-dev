import React from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { motion, useReducedMotion } from 'framer-motion'

import { Logo } from 'components/Logo'
import { transitionChildrenFast, transitionParent } from 'utilities/animations/transitions'
import { floatInOut } from 'utilities/animations/variants'
import styles from './styles.module.scss'

const SocialLinks = dynamic(() => import('components/SocialLinks'), { ssr: false })
export interface AppLayoutProps {
  children: React.ReactNode
}

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
          className={`${styles.headerInner} relative flex flex-col flex-wrap justify-center items-center w-full mx-auto space-y-4`}
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
              <Link href='/'>
                <a
                  className={`${styles['nav__item']} ${
                    asPath === '/' ? styles.active : ''
                  } relative block sm:inline-block rounded-md sm:mt-0 mt-4 mr-0 sm:mx-1 uppercase text-center font-semibold text-lg transition duration-150 px-4 py-2`}
                >
                  Root
                </a>
              </Link>
              <Link href='/story'>
                <a
                  className={`${styles['nav__item']} ${
                    asPath === '/story' ? styles.active : ''
                  } relative block sm:inline-block rounded-md sm:mt-0 mt-4 mr-0 sm:mx-1 uppercase text-center font-semibold text-lg transition duration-150 px-4 py-2`}
                >
                  Story
                </a>
              </Link>
              <Link href='/now'>
                <a
                  className={`${styles['nav__item']} ${
                    asPath === '/now' ? styles.active : ''
                  } relative block sm:inline-block rounded-md sm:mt-0 mt-4 mr-0 sm:mx-1 uppercase text-center font-semibold text-lg transition duration-150 px-4 py-2`}
                >
                  Now
                </a>
              </Link>
              <Link href='/uses'>
                <a
                  className={`${styles['nav__item']} ${
                    asPath === '/uses' ? styles.active : ''
                  } relative block sm:inline-block rounded-md sm:mt-0 mt-4 mr-0 sm:mx-1 uppercase text-center font-semibold text-lg transition duration-150 px-4 py-2`}
                >
                  Uses
                </a>
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
