import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'

import { childrenVariants } from 'utilities/animations/variants'
import { transitionChildren } from 'utilities/animations/transitions'
import myNameImg from 'public/static/images/logo/mina-saleeb.svg'

export const Logo = () => (
  <motion.div
    transition={transitionChildren}
    variants={childrenVariants}
    className='flex items-center justify-center'
  >
    <Link href='/'>
      <a className='inline-block relative p-3 w-min h-min transform-gpu motion-safe:hover:-translate-y-1 transition-transform'>
        <Image layout='fixed' width={250} height={50} src={myNameImg} alt='Mina Saleeb' />
      </a>
    </Link>
  </motion.div>
)
