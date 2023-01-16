import { motion } from 'framer-motion'

import { transitionChildren } from 'utilities/animations/transitions'
import { floatLeft } from 'utilities/animations/variants'

import { Head } from 'components/Head'
import { Eye } from '../components/Ascii/eye'

export default function AboutPage() {
  return (
    <>
      <Head
        title='My Story'
        description='I strive to make knowledge about software development accessible to everyone.'
      />
      <div className='page-content'>
        <section className='section-fluid'>
          <article className='article gutter-y gutter-x'>
            <motion.h1 variants={floatLeft} transition={transitionChildren}>
              My Story
            </motion.h1>
            <motion.p className='lead' variants={floatLeft} transition={transitionChildren}>
              Hi, my name is Mina Saleeb. I am a Software Engineer based in Orlando, Florida.
            </motion.p>
            <motion.p variants={floatLeft} transition={transitionChildren}>
              After getting a degree in my first passion, Criminology, I found myself seeking to
              learn a new trait. In 2017, it came across to me how technically-oriented I became and
              my fascination with technology led me to learn the principles of computer science
              through the pursuit of a new degree in Information Systems Technology. It was then
              that I first saw the potential in being able to create applications and the excitement
              of bringing that openly to the world.
            </motion.p>
            <motion.p variants={floatLeft} transition={transitionChildren}>
              My fascination with developing websites, especially my eagerness to develop
              semantically correct HTML and CSS, prompted me to learn more about how the world wide
              web is served. I initially learned higher level languages and object-oriented
              programming with Java and C, but I dove into Dev-Ops because of my desire to deploy
              applications with complete control over the architecture. Then I moved into functional
              programming with JavaScript, creating apps with React. It intrigued me to learn about
              Node.js and the engines that interpret the code on the web.
            </motion.p>
            <motion.p variants={floatLeft} transition={transitionChildren}>
              Now, I pursue learning how to engineer solutions with better design principles. I am
              thankful to have a team where we continuously reflect on what worked well and what
              could be better. Software Engineering, as I have learned the hard way before, involves
              much more decision making than it does code. I aspire to learn from my senior leaders
              to understand how to think of the process and solution thoroughly, looking at all of
              the options available, and at the end of the day, keeping it simple and stupid (KISS).
              This has guided me to think critically and come down to the solutions that make the
              most sense.
            </motion.p>
            <motion.p variants={floatLeft} transition={transitionChildren}>
              I enjoy creating elegant, structured content on the web. It is of my great interest to
              learn about improving experiences on the web, so reading and implementing best
              practices is a continual learning cycle. My favorite framework is Next.js based on
              React, which I primarily use with TypeScript. I currently deploy my personal
              applications on a{' '}
              <a href='https://www.linode.com/' target='_blank' rel='noreferrer'>
                Linode
              </a>{' '}
              server using an Ubuntu OS.
            </motion.p>
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
