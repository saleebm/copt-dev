import type { GetStaticProps } from 'next'
import Link from 'next/link'
import { motion } from 'framer-motion'

import { transitionChildren } from 'utilities/animations/transitions'
import { floatIn, floatLeft } from 'utilities/animations/variants'
import { Head } from 'components/Head'
import { ASCII } from 'components/Ascii'
import { Eye } from 'components/Ascii/eye'

// interface Props {}

export default function Home() {
  return (
    <>
      <Head
        title='Meow'
        description="Hi, I'm Mina, a cat/web developer based in Orlando, FL. This is my www for showing what I am up to."
      />
      <div className='page-content'>
        <section className='section-fluid'>
          <div className='container gutter-y gutter-x'>
            <div className={'banner'}>
              <div
                className={
                  'relative flex flex-col items-center justify-center h-auto md:h-full w-full md:w-1/2'
                }
              >
                <Eye />
                <ASCII
                  className={'w-full min-w-full max-w-full mx-auto my-2 text-center'}
                  rainbow
                  text='copt'
                />
                <ASCII
                  className={'w-full min-w-full max-w-full mx-auto text-center'}
                  rainbow
                  text='dev'
                />
              </div>
              <div
                className={
                  'relative flex flex-col h-auto md:h-full w-full md:w-1/2 items-center justify-center space-y-6'
                }
              >
                <div className={'relative flex flex-col items-center justify-center'}>
                  <motion.h1
                    className={
                      'relative inline-block w-full text-4xl md:text-5xl font-bold text-center'
                    }
                    transition={transitionChildren}
                    variants={floatLeft}
                  >
                    Yello, I&apos;m Mina
                  </motion.h1>
                  <motion.h2
                    className={
                      'relative inline-block w-full text-2xl md:text-3xl font-bold text-center'
                    }
                    transition={transitionChildren}
                    variants={floatLeft}
                  >
                    The Brief
                  </motion.h2>
                  <motion.p
                    className={
                      'relative inline-block w-auto text-lg md:text-xl text-left banner__text'
                    }
                    transition={transitionChildren}
                    variants={floatIn}
                  >
                    I&apos;m a full stack application developer based in Orlando, FL.
                  </motion.p>
                </div>
                <motion.div transition={transitionChildren} variants={floatIn}>
                  <Link href='/now' passHref>
                    <button className='btn-primary'>What am I doing now?</button>
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </section>
        <section className='section-fluid'>
          <div className='container gutter-y gutter-x'>{/* todo */}</div>
        </section>
      </div>
    </>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  try {
    //todo
    return { props: {} }
  } catch (err) {
    console.error(err)
  }
  return {
    props: {}
  }
}
