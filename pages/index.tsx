import { GetStaticProps } from 'next'
import { motion } from 'framer-motion'

import { transitionChildren } from 'utilities/animations/transitions'
import { floatLeft } from 'utilities/animations/variants'
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
          <motion.div
            transition={transitionChildren}
            variants={floatLeft}
            className={styles.banner}
          >
            <ASCII className={styles.ascii} rainbow text='hello,' />
            <ASCII className={styles.ascii} rainbow text='world.' />
          </motion.div>
          <div className='relative flex space-x-4 space-y-4 flex-col md:flex-row flex-wrap'>
            <motion.h1 transition={transitionChildren} variants={floatLeft}></motion.h1>
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
