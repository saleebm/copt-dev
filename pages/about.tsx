import { motion } from 'framer-motion'

import { transitionChildren } from 'utilities/animations/transitions'
import { floatLeft } from 'utilities/animations/variants'

import { Head } from 'components/Head'

export default function AboutPage() {
  return (
    <>
      <Head
        title='About me'
        description='I strive to build elegant, structured content for the web using my expertise in TypeScript and React.'
      />
      <div className='page-content'>
        <section className='section-fluid'>
          <article className='article gutter-y gutter-x'>
            <motion.h1 variants={floatLeft} transition={transitionChildren}>
              About me
            </motion.h1>
            <motion.p variants={floatLeft} transition={transitionChildren}>
              Hi, welcome to my website! My name is Mina Saleeb. I am a full stack application
              developer from Orlando, Florida. I never thought I would be building software growing
              up, but I am sure glad I do now.
            </motion.p>
            <motion.p variants={floatLeft} transition={transitionChildren}>
              After getting a degree in my first passion, Criminology, I found myself seeking to
              learn a new trait. In 2017, it came across to me how technically-oriented I became and
              my fascination with technology led me to learn the principles of computer science
              through the pursuit of a new degree in Information Systems Technology.
            </motion.p>
            <motion.p variants={floatLeft} transition={transitionChildren}>
              Coding semantically correct HTML and CSS sparked an interest in me to learn more about
              how the world wide web is served. I initially learned higher level languages and
              object-oriented programming with Java and C. Then I moved into functional programming
              with JavaScript, creating apps with React. It intrigued me to learn about Node.js and
              the engines that interpret the code on the web. Now, I am eager to learn Rust-lang so
              I can build solutions compiled to WebAssembly and targeting multiple platforms.
            </motion.p>
            <motion.p variants={floatLeft} transition={transitionChildren}>
              I enjoy creating elegant, structured content on the web. It is of my great interest to
              learn about improving experiences on the web, so reading and implementing best
              practices is a continual learning cycle. My favorite framework is Next.js based on
              React, which I primarily use with TypeScript.
            </motion.p>
          </article>
        </section>
      </div>
    </>
  )
}
