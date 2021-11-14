import type { ReactNode } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'

import { floatInOut } from 'utilities/animations/variants'
import { transitionChildren } from 'utilities/animations/transitions'
import {
  facebookProfile,
  githubProfile,
  instagramProfile,
  linkedinProfile,
  polyworkProfile,
  twitterProfile
} from 'config/social-profiles'
import emailIcon from 'public/static/images/brands/email.png'
import emailIconDark from 'public/static/images/brands/email-dark.png'
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
    className='inline-block relative w-8 h-8 max-h-8 max-w-8 opacity-90 transition transform-gpu motion-safe:hover:-translate-y-1 hover:opacity-100'
    title={`Link to ${name}`}
  >
    {children}
  </a>
)

export const SocialLinks = () => {
  const { resolvedTheme = 'dark' } = useTheme()

  return (
    <motion.div
      variants={floatInOut}
      transition={transitionChildren}
      className='relative flex flex-row flex-wrap items-baseline justify-center space-x-2 space-y-2'
    >
      <SocialLinkWrapper href='mailto:saleebmina@copt.dev' name='email me'>
        <Image src={resolvedTheme === 'dark' ? emailIconDark : emailIcon} alt='email me' />
      </SocialLinkWrapper>
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
      <SocialLinkWrapper name='Polywork' href={polyworkProfile}>
        <svg
          className='fill-current'
          role='img'
          viewBox='0 0 24 24'
          xmlns='http://www.w3.org/2000/svg'
        >
          <title>Polywork</title>
          <path d='M19.125 0H4.875A4.865 4.865 0 0 0 0 4.875v14.25C0 21.825 2.175 24 4.875 24h6.6c2.7 0 4.875-2.175 4.875-4.875V16.65h2.775c2.7 0 4.875-2.175 4.875-4.875v-6.9C24 2.175 21.825 0 19.125 0zM16.5 1.275h2.625a3.6 3.6 0 0 1 3.6 3.6v2.7H16.5v-6.3zM15.075 9v6.45H8.85V9h6.225zM8.85 1.2h6.225v6.375H8.85V1.2zM1.275 4.8a3.6 3.6 0 0 1 3.6-3.6H7.5v6.375H1.275V4.8zM7.5 9v6.45H1.2V9h6.3zm0 13.725H4.8a3.6 3.6 0 0 1-3.6-3.6V16.8h6.3v5.925zm7.575-3.525a3.6 3.6 0 0 1-3.6 3.6H8.85v-5.925h6.225V19.2zm7.65-7.35a3.6 3.6 0 0 1-3.6 3.6H16.5V9h6.225v2.85z' />
        </svg>
      </SocialLinkWrapper>
    </motion.div>
  )
}
