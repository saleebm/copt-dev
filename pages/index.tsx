import { GetStaticProps } from 'next'
import { motion } from 'framer-motion'

import { transitionChildren } from 'utilities/animations/transitions'
import { floatIn, floatLeft } from 'utilities/animations/variants'
import { Head } from 'components/Head'
import { ASCII } from 'components/Ascii'
// import { getIgPhotos } from 'lib/ig'

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
                what I am up to and what I&apos;m working on.
              </motion.p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  try {
    //todo
    // const ig = await getIgPhotos()
    return { props: {} }
  } catch (err) {
    console.error(err)
  }
  return {
    props: {
      // ig
    }
  }
}
