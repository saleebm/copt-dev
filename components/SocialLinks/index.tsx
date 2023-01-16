import type { ReactNode } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'

import { floatInOut } from 'utilities/animations/variants'
import { transitionChildren } from 'utilities/animations/transitions'
import { githubProfile, linkedinProfile } from 'config/social-profiles'
import emailIcon from 'public/static/images/brands/email.png'
import emailIconDark from 'public/static/images/brands/email-dark.png'
import linkedinIcon from 'public/static/images/brands/linkedin.png'
import githubIcon from 'public/static/images/brands/github.png'
import githubIconDark from 'public/static/images/brands/github-dark.png'

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
        <Image
          src={resolvedTheme === 'dark' ? emailIconDark : emailIcon}
          alt='email me'
          style={{
            maxWidth: '100%',
            height: 'auto'
          }}
        />
      </SocialLinkWrapper>
      <SocialLinkWrapper name='GitHub' href={githubProfile}>
        <Image
          src={resolvedTheme === 'dark' ? githubIconDark : githubIcon}
          alt='github'
          style={{
            maxWidth: '100%',
            height: 'auto'
          }}
        />
      </SocialLinkWrapper>
      <SocialLinkWrapper name='LinkedIn' href={linkedinProfile}>
        <Image
          src={linkedinIcon}
          alt='linkedin'
          style={{
            maxWidth: '100%',
            height: 'auto'
          }}
        />
      </SocialLinkWrapper>
    </motion.div>
  )
}
