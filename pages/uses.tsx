import { motion } from 'framer-motion'

import { transitionChildren } from 'utilities/animations/transitions'
import { floatIn, floatLeft } from 'utilities/animations/variants'

import { Head } from 'components/Head'
import { Eye } from '../components/Ascii/eye'

export default function UsesPage() {
  return (
    <>
      <Head
        title='/uses'
        description='My tech stack and products I use to get my job done, and make life more enjoyable.'
      />
      <div className='page-content'>
        <div className='section-fluid'>
          <div className='article gutter-y gutter-x'>
            <section>
              <motion.h1 variants={floatLeft} transition={transitionChildren}>
                Uses
              </motion.h1>
              <motion.p className='lead' variants={floatLeft} transition={transitionChildren}>
                Check out{' '}
                <a href='https://uses.tech/' target='_blank' rel='noreferrer'>
                  uses.tech
                </a>{' '}
                for more info about what a &quot;<i>uses</i>&quot; page is.
              </motion.p>
            </section>
            <section>
              <motion.h2 variants={floatLeft} transition={transitionChildren}>
                Software
              </motion.h2>
              <motion.ul variants={floatIn} transition={transitionChildren}>
                <li>MacOS Big Sur</li>
                <li>iOS</li>
                <li>
                  <a href='https://code.visualstudio.com/' target='_blank' rel='noreferrer'>
                    Visual Studio Code
                  </a>{' '}
                  is my go-to editor
                </li>
                <li>In the terminal, I use vim for editing files</li>
                <li>
                  I use{' '}
                  <a href='https://www.iterm2.com/' target='_blank' rel='noreferrer'>
                    iTerm2
                  </a>{' '}
                  as my main terminal app
                </li>
                <li>
                  <a
                    href='https://marketplace.visualstudio.com/items?itemName=ahmadawais.shades-of-purple'
                    target='_blank'
                    rel='noreferrer'
                  >
                    Shades of Purple
                  </a>{' '}
                  theme for VS Code
                </li>
                <li>
                  <a href='https://rsms.me/inter/' target='_blank' rel='noreferrer'>
                    Inter
                  </a>{' '}
                  typeface
                </li>
                <li>Firefox Developer Edition</li>
                <li>
                  <a href='https://github.com/koekeishiya/yabai' target='_blank' rel='noreferrer'>
                    Yabai
                  </a>{' '}
                  for MacOS tiling window manager, along with{' '}
                  <a href='https://github.com/koekeishiya/skhd' target='_blank' rel='noreferrer'>
                    skhd
                  </a>{' '}
                  for keyboard shortcuts
                </li>
                <li>
                  <a href='https://www.notion.so/' target='_blank' rel='noreferrer'>
                    Notion
                  </a>{' '}
                  for keeping track of everything I&apos;m doing and learning
                </li>
                <li>
                  <a href='https://obsidian.md/' target='_blank' rel='noreferrer'>
                    Obsidian
                  </a>{' '}
                  for writing journal entries in an intertwined digital garden
                </li>
                <li>
                  Adobe{' '}
                  <a
                    href='https://www.adobe.com/products/photoshop.html'
                    target='_blank'
                    rel='noreferrer'
                  >
                    Photoshop
                  </a>{' '}
                  for editing photos
                </li>
                <li>
                  I depend on
                  <a href='https://folivora.ai/' target='_blank' rel='noreferrer'>
                    BetterTouchTool
                  </a>{' '}
                  for making gestures and customizing my touchbar
                </li>
                <li>
                  <a href='https://www.spotify.com/' target='_blank' rel='noreferrer'>
                    Spotify
                  </a>{' '}
                  for listening to music
                </li>
                <li>
                  I keep my links clean using{' '}
                  <a
                    href='https://github.com/rknightuk/TrackerZapper'
                    target='_blank'
                    rel='noreferrer'
                  >
                    TrackerZapper
                  </a>
                </li>
                <li>
                  My VPN provider is{' '}
                  <a href='https://windscribe.com/' target='_blank' rel='noreferrer'>
                    Windscribe
                  </a>
                </li>
              </motion.ul>
            </section>
            <section>
              <motion.h2 variants={floatLeft} transition={transitionChildren}>
                Hardware
              </motion.h2>
              <motion.ul variants={floatIn} transition={transitionChildren}>
                <li>2018 MacBook Pro with the Touchbar</li>
                <li>Alienware Aurora R7 Desktop</li>
                <li>
                  <a
                    href='https://www.logitech.com/en-us/mx/master-series.html'
                    target='_blank'
                    rel='noreferrer'
                  >
                    Logitech MX Master
                  </a>{' '}
                  Mouse
                </li>
                <li>One Samsung 27&quot; monitor to extend my laptop display</li>
                <li>An Acer 30&quot; monitor for my desktop</li>
                <li>
                  <a
                    href='https://www.raspberrypi.org/products/raspberry-pi-3-model-b-plus/'
                    target='_blank'
                    rel='noreferrer'
                  >
                    Raspberry Pi 3B+
                  </a>{' '}
                  for my home automation
                </li>
              </motion.ul>
            </section>
            <motion.div
              transition={transitionChildren}
              variants={floatLeft}
              className='relative block py-4 w-full'
            >
              <Eye />
            </motion.div>
          </div>
        </div>
      </div>
    </>
  )
}
