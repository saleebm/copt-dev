import type { GetStaticProps } from 'next'
import Link from 'next/link'
import { motion } from 'framer-motion'

import { transitionChildren } from 'utilities/animations/transitions'
import { floatIn, floatLeft } from 'utilities/animations/variants'
import { Head } from 'components/Head'
import { ASCII } from 'components/Ascii'

import styles from 'styles/pages/home.module.scss'

// interface Props {}

export default function Home() {
  return (
    <>
      <Head
        title='Welcome'
        description="Hi, I'm Mina, a cat/web developer based in Orlando, FL. This is my www for showing what I am up to."
      />
      <section className='section-fluid'>
        <div className='container'>
          <div className={styles.banner}>
            <div className={styles['ascii-wrap']}>
              <ASCII className={styles['ascii-wrap__pre']} rainbow text='hello,' />
              <ASCII className={styles['ascii-wrap__pre']} rainbow text='world.' />
            </div>
            <div className={styles['banner-info']}>
              <motion.h1
                className={styles['banner-info__title']}
                transition={transitionChildren}
                variants={floatLeft}
              >
                The Brief
              </motion.h1>
              <motion.p
                className={styles['banner-info__text']}
                transition={transitionChildren}
                variants={floatIn}
              >
                I&apos;m a cat/web developer based in Orlando, FL. This is my <i>www</i> for showing
                what I am up to, as well as what I have learned and done with software.
              </motion.p>
              <motion.div transition={transitionChildren} variants={floatIn}>
                <Link href='/about'>More info</Link>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
      {/* -------BLOG------ */}
      {/* BLOG POSTS CAROUSEL OR SOMETHING HERE */}
      {/* <section className='section-fluid'>
        <div className='container'></div>
      </section> */}
      {/* -------PORTFOLIO------ */}
      {/* some examples of what I've worked on, link to full portfolio page */}
      {/* <section className='section-fluid'>
        <div className='container'></div>
      </section> */}
      {/* -------NOW------ */}
      {/* WHat am i up to day by day */}
      {/* <section className='section-fluid'>
        <div className='container'></div>
      </section> */}
      {/* -------USES------ */}
      {/* my tech stack */}
      {/* <section className='section-fluid'>
        <div className='container'></div>
      </section> */}
      {/* -------CONTACT------ */}
      {/* contact me */}
      {/* <section className='section-fluid'>
        <div className='container'></div>
      </section> */}
      {/* -------SPOTIFY DAILY COLLECTION------ */}
      {/* daily recap from spotify player, with widget for now playing */}
      {/* <section className='section-fluid'>
        <div className='container'></div>
      </section> */}
      {/* -------MYANILIST------ */}
      {/* my anime watch/reading list */}
      {/* <section className='section-fluid'>
        <div className='container'></div>
      </section> */}
      {/* -------FOOTER------ */}
      {/* GPG key, links, idk yet? */}
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
