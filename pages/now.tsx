import type { GetStaticProps } from 'next'
import { motion } from 'framer-motion'

import { transitionChildren } from 'utilities/animations/transitions'
import { floatLeft } from 'utilities/animations/variants'

import { Head } from 'components/Head'
import { Eye } from '../components/Ascii/eye'

export default function NowPage({ builtAt }: { builtAt: string }) {
  return (
    <>
      <Head title='Now' description='This is what I am up to nowadays, check it out.' />
      <div className='page-content'>
        <section className='section-fluid'>
          <article className='article gutter-y gutter-x'>
            <motion.h1 variants={floatLeft} transition={transitionChildren}>
              What am I doing now?
            </motion.h1>
            <motion.div variants={floatLeft} transition={transitionChildren}>
              <h2>Personal Projects</h2>
              <p className='lead'>WIP: Building my digital garden here</p>
            </motion.div>
            <motion.div variants={floatLeft} transition={transitionChildren}>
              <h2>Work</h2>
              <p className='lead'>
                I am currently working as a Software Engineer at{' '}
                <a href='https://www.sightplan.com/' target='_blank' rel='noopener noreferrer'>
                  SightPlan
                </a>
                , an innovative software company that provides a platform for operating real estate
                properties.
              </p>
            </motion.div>
            <motion.div variants={floatLeft} transition={transitionChildren}>
              <h2>Learning</h2>
              <p className='lead'>
                I am currently learning Golang, devoting two weekly 2 hour{' '}
                <a
                  href={'https://www.timeblockplanner.com/'}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  time-block
                </a>{' '}
                sessions per week for practice/building applications.
              </p>
              <p className={'lead'}>Helpful resources for learning Golang:</p>
              <ul>
                <li>
                  <a
                    href='https://www.amazon.com/Programming-Language-Addison-Wesley-Professional-Computing/dp/0134190440/'
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    Go Programming Language, The (Addison-Wesley Professional Computing Series) 1st
                    Edition
                  </a>{' '}
                  by{' '}
                  <a href='https://github.com/adonovan' target='_blank' rel='noopener noreferrer'>
                    Alan Donovan
                  </a>
                </li>
                <li>
                  <a
                    href='https://quii.gitbook.io/learn-go-with-tests'
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    Learn Go with Tests
                  </a>{' '}
                  by{' '}
                  <a href='https://twitter.com/quii' target='_blank' rel='noopener noreferrer'>
                    @quii
                  </a>
                </li>
              </ul>
            </motion.div>
            <motion.div variants={floatLeft} transition={transitionChildren}>
              <h2>Reading</h2>
              <ul>
                <li>
                  <a
                    href='https://www.amazon.com/Emerald-Tablets-Thoth-Atlantean/dp/B0BMJHBX21/'
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    The Emerald Tablets of Thoth The Atlantean
                  </a>
                </li>
              </ul>
            </motion.div>
            <motion.p>Last updated at {builtAt}</motion.p>
            <motion.div variants={floatLeft} transition={transitionChildren}>
              <h2>What is a now page?</h2>
              <motion.p className='lead' variants={floatLeft} transition={transitionChildren}>
                This is based on Derek Siver&apos;s{' '}
                <a target='_blank' href='https://nownownow.com/about' rel='noreferrer'>
                  now movement
                </a>
                .
              </motion.p>
            </motion.div>
          </article>
          <motion.div
            transition={transitionChildren}
            variants={floatLeft}
            className='relative block py-4 w-full'
          >
            <Eye />
          </motion.div>
        </section>
      </div>
    </>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  const now = new Date()
  try {
    return {
      props: {
        builtAt: now.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })
      },
      revalidate: false
    }
  } catch (err) {
    console.error(err)
  }
  return {
    props: {}
  }
}
