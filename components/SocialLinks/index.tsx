import type { ReactNode } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'

import { childrenVariants } from 'utilities/animations/variants'
import { transitionChildren } from 'utilities/animations/transitions'
import {
  facebookProfile,
  githubProfile,
  instagramProfile,
  linkedinProfile,
  twitterProfile
} from 'config/social-profiles'
import linkedinIcon from 'public/static/images/brands/linkedin.png'
import twitterIcon from 'public/static/images/brands/twitter.png'
import instagramIcon from 'public/static/images/brands/instagram.png'
import githubIcon from 'public/static/images/brands/github.png'
import githubIconDark from 'public/static/images/brands/github-dark.png'
import facebookIcon from 'public/static/images/brands/facebook.png'

interface SocialLinkWrapperProps {
  href: string
  name: string
  children: ReactNode
}

const SocialLinkWrapper = ({ children, href, name }: SocialLinkWrapperProps) => (
  <a
    rel='noreferrer noopener'
    target='_blank'
    href={href}
    className='inline-block relative w-8 h-8 mr-2 transition opacity-90 transform-gpu motion-safe:hover:-translate-y-1 hover:opacity-100'
    title={`Link to my ${name} profile`}
  >
    {children}
  </a>
)

export const SocialLinks = () => {
  const { resolvedTheme = 'dark' } = useTheme()

  return (
    <motion.div
      variants={childrenVariants}
      transition={transitionChildren}
      className='flex flex-row flex-wrap items-center justify-center relative'
    >
      <SocialLinkWrapper name='GitHub' href={githubProfile}>
        <Image src={resolvedTheme === 'dark' ? githubIconDark : githubIcon} alt='github' />
      </SocialLinkWrapper>
      <SocialLinkWrapper name='LinkedIn' href={linkedinProfile}>
        <Image src={linkedinIcon} alt='linkedin' />
      </SocialLinkWrapper>
      <SocialLinkWrapper name='Facebook' href={facebookProfile}>
        <Image src={facebookIcon} alt='facebook' />
      </SocialLinkWrapper>
      <SocialLinkWrapper name='Instagram' href={instagramProfile}>
        <Image src={instagramIcon} alt='instagram' />
      </SocialLinkWrapper>
      <SocialLinkWrapper name='Twitter' href={twitterProfile}>
        <Image src={twitterIcon} alt='twitter' />
      </SocialLinkWrapper>
    </motion.div>
  )
}
