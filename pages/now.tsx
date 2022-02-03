import { motion } from 'framer-motion'

import { transitionChildren } from 'utilities/animations/transitions'
import { floatLeft } from 'utilities/animations/variants'

import { Head } from 'components/Head'

export default function NowPage() {
  // make sure to put last updated date visible on this page
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
              <ul>
                <li>
                  I am currently working on a new website for myself to be able to keep track of my
                  projects and share what I learn along the way.
                </li>
                <li>
                  I am building a music player that allows for remote collaboration, but with a
                  twist. It is still in the early stages of planning and development.
                </li>
              </ul>
            </motion.div>
            <motion.div variants={floatLeft} transition={transitionChildren}>
              <h2>Work</h2>
              <p className='lead'>
                I am currently working as a Server Engineer at{' '}
                <a href='https://www.sightplan.com/' target='_blank' rel='noopener noreferrer'>
                  SightPlan
                </a>
                , an innovative software company that provides a platform for operating real estate
                properties.
              </p>
            </motion.div>
            <motion.div variants={floatLeft} transition={transitionChildren}>
              <h2>Learning</h2>
              <ul>
                <li>
                  I am currently learning Rust, a statically typed software language, by going in
                  depth on{' '}
                  <a target='_blank' href='https://github.com/rust-lang/rustlings' rel='noreferrer'>
                    rustlings
                  </a>{' '}
                  and reading various{' '}
                  <a
                    target='_blank'
                    href='https://lborb.github.io/book/title-page.html'
                    rel='noreferrer'
                  >
                    Rust resources
                  </a>
                  .
                </li>
                <li>
                  Thanks to{' '}
                  <a target='_blank' href='https://threejs-journey.com' rel='noreferrer'>
                    Three.js Journey
                  </a>
                  , I am learning how to create a 3D environment using WebGL and React.
                </li>
              </ul>
            </motion.div>
            <motion.div variants={floatLeft} transition={transitionChildren}>
              <h2>Reading</h2>
              <ul>
                <li>
                  <a
                    title='See this book on goodreads'
                    href='https://www.goodreads.com/book/show/13651.The_Dispossessed'
                    rel='noopener noreferrer'
                    target='_blank'
                  >
                    The Dispossessed by Ursula K. Le Guin
                  </a>
                </li>
                <li>
                  <a
                    title='See this book on goodreads'
                    href='https://www.goodreads.com/book/show/6900.Tuesdays_with_Morrie'
                    rel='noopener noreferrer'
                    target='_blank'
                  >
                    Tuesdays with Morrie by Mitch Albom
                  </a>
                </li>
              </ul>
            </motion.div>
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
        </section>
      </div>
    </>
  )
}
