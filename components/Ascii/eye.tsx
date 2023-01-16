import { motion } from 'framer-motion'

import { transitionChildren } from 'utilities/animations/transitions'
import { floatLeft } from 'utilities/animations/variants'

import { Rainbow } from 'components/Ascii/rainbow'

const eyeText = `
,~~~~~,..___
,< 0 >~~---
   /\\     _
   | \`-._,-'
`.split('\n')

export const Eye = () => {
  return (
    <motion.div
      transition={transitionChildren}
      variants={floatLeft}
      className={'block mb-4 max-w-full min-w-full relative text-center w-full'}
      title='Egyptian eye in ascii characters'
    >
      <Rainbow lines={eyeText} className='ascii-art__pre ascii-eye__pre block m-0 p-0' />
    </motion.div>
  )
}
