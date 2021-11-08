import { NextSeo } from 'next-seo'
import { motion } from 'framer-motion'

import { transitionChildren } from 'utilities/animations/transitions'
import { floatLeft } from 'utilities/animations/variants'
// import { getIgPhotos } from 'lib/ig'

export default function DesignSystem() {
  // testing out various typography elements
  return (
    <>
      <NextSeo
        title='Design System'
        description='Here is my page dedicated to getting the colors and styles I want for this site, sort of like a storybook.'
        noindex
        disableGooglebot
        nofollow
      />
      <section className='section-fluid'>
        <div className='inner-container'>
          <article className='article divide-opacity-10 divide-y-2 divide-gray-200 dark:divide-gray-700'>
            <motion.div
              transition={transitionChildren}
              variants={floatLeft}
              className='relative block py-4'
            >
              <h1>(h1) Lorem Ipsum</h1>
              <p>0123456789</p>
            </motion.div>
            <motion.div
              transition={transitionChildren}
              variants={floatLeft}
              className='relative block py-4'
            >
              <h2>(h2) Lorem Ipsum</h2>
              <p>
                (p) Lorem ipsum dolor sit amet consectetur adipisicing elit. Delectus nihil fugit
                veniam ea eaque debitis excepturi officia, provident porro magni saepe rem eos nam
                ratione. Quos tempora ipsam numquam obcaecati!
              </p>
            </motion.div>
            <motion.div
              transition={transitionChildren}
              variants={floatLeft}
              className='relative block py-4'
            >
              <h3>(h3) Lorem Ipsum</h3>
              <p>
                I dare you to <a href='#'>click me</a>.
              </p>
            </motion.div>
            <motion.div
              transition={transitionChildren}
              variants={floatLeft}
              className='relative block py-4'
            >
              <h4>(h4) Lorem Ipsum</h4>
              {/* an unordered list for 5 fruits */}
              <ul>
                <li>Apple</li>
                <li>Orange</li>
                <li>Banana</li>
                <li>Pear</li>
                <li>Grape</li>
              </ul>
              {/* an ordered list for 5 veggies */}
              <ol>
                <li>Carrot</li>
                <li>Potato</li>
                <li>Cucumber</li>
                <li>Broccoli</li>
                <li>Pepper</li>
              </ol>
            </motion.div>
          </article>
        </div>
      </section>
    </>
  )
}
