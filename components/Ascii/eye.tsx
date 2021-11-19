import { motion } from 'framer-motion'

import { transitionChildren } from 'utilities/animations/transitions'
import { floatLeft } from 'utilities/animations/variants'

import { Rainbow } from 'components/Ascii/rainbow'

const eyeText = `
                    88****eeeeeeee****88    
  888888888    88***eeeeee*********eeeee**88
  *eeeeeeeeeeeeeeeee***88           88**eee*
  888************888                    88*8
                        8888******888       
   888888           8***eeeeeeeeeeeeee*8    
  8eeeeeee*********eee**8*eeee*8*eee88*e*8  
  *eeeeeeeeeeeeeeeeee*88 8*eeeeeeee*  88*e*8
   88888           88***e****eee********88  
                       8*********8888       
                    8**e**88  *ee*8         
          8***8  8**e**8      *ee8          
          *eee***e**88        *ee8          
           8***88             *ee8             
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
