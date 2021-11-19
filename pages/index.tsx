import type { GetStaticProps } from 'next'
import Link from 'next/link'
import { motion } from 'framer-motion'

import { transitionChildren } from 'utilities/animations/transitions'
import { floatIn, floatLeft } from 'utilities/animations/variants'
import { Head } from 'components/Head'
import { ASCII } from 'components/Ascii'
import { Eye } from 'components/Ascii/eye'

import styles from 'styles/pages/home.module.scss'

// interface Props {}

export default function Home() {
  return (
    <>
      <Head
        title='Welcome'
        description="Hi, I'm Mina, a cat/web developer based in Orlando, FL. This is my www for showing what I am up to."
      />
      <div className='page-content'>
        <section className='section-fluid'>
          <div className='container gutter-y gutter-x'>
            <div className={'banner'}>
              <div className={styles['ascii-wrap']}>
                <Eye />
                <ASCII className={styles['ascii-wrap__pre']} rainbow text='copt' />
                <ASCII className={styles['ascii-wrap__pre']} rainbow text='dev' />
              </div>
              <div className={styles['banner-info']}>
                <div className={styles['banner-info__content']}>
                  <motion.h1
                    className={styles['banner-info__title']}
                    transition={transitionChildren}
                    variants={floatLeft}
                  >
                    Welcome, I&apos;m Mina
                  </motion.h1>
                  <motion.h2
                    className={styles['banner-info__subtitle']}
                    transition={transitionChildren}
                    variants={floatLeft}
                  >
                    The Brief
                  </motion.h2>
                  <motion.p
                    className={styles['banner-info__text']}
                    transition={transitionChildren}
                    variants={floatLeft}
                  >
                    I&apos;m a cat/full stack application developer based in Orlando, FL. My core
                    skills are in TypeScript and Node.js. I love to make things that are accessible,
                    user-friendly, and performant. I&apos;m always looking to learn new things and
                    improve my skills.
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
