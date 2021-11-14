import { motion } from 'framer-motion'

import { transitionChildren } from 'utilities/animations/transitions'
import { floatLeft } from 'utilities/animations/variants'

import { Head } from 'components/Head'

export default function NowPage() {
  // make sure to put last updated date visible on this page
  return (
    <>
      <Head title='Now' description='This is what I am up to these days. ' />
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
                  Building a music player that allows for remote collaboration. I am currently
                  working on the frontend and backend.
                </li>
              </ul>
            </motion.div>
            <motion.div variants={floatLeft} transition={transitionChildren}>
              <h2>Work</h2>
              <p>
                I am helping build the future of rental technology at Rentivity, a startup based in
                Orlando, Florida. I work mostly on the backend using Node.js and Express.js.
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
                <li>todo</li>
              </ul>
            </motion.div>
            <motion.div variants={floatLeft} transition={transitionChildren}>
              <h2>What is a now page?</h2>
              <motion.p variants={floatLeft} transition={transitionChildren}>
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