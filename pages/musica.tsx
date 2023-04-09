import type { GetServerSideProps } from 'next'
import { motion } from 'framer-motion'
import type { CurrentlyPlayingItemProps, SongParsed } from '@types'

import { Head } from 'components/Head'
import { floatLeft } from 'utilities/animations/variants'
import { transitionChildren, transitionChildrenFast } from 'utilities/animations/transitions'
import { Eye } from 'components/Ascii/eye'
import { Track } from 'components/Musica/track'
import { CurrentSong } from 'components/Musica/current-song'
import { CURRENTLY_PLAYED_URL } from 'config/routes'
import { getMusicaProps } from '../lib/spotify/get-musica-props'

export default function SongsPage({
  songs,
  fallback
}: {
  songs: SongParsed[]
  fallback: {
    [CURRENTLY_PLAYED_URL]: CurrentlyPlayingItemProps
  }
}) {
  return (
    <>
      <Head title='Musica' description='This is what I have been listening to' />
      <div className='page-content'>
        <div className='section-fluid'>
          <motion.h1
            className={'musica-header'}
            variants={floatLeft}
            transition={transitionChildrenFast}
            dir={'rtl'}
            title={'Music (arabic)'}
          >
            موسيقى
          </motion.h1>
          <div className={'musica-main'}>
            <section className={'musica-recently-played'}>
              <motion.h2
                className={'musica-subheader'}
                variants={floatLeft}
                transition={transitionChildren}
                title={'Music (arabic)'}
              >
                Recently Played
              </motion.h2>
              <motion.div
                variants={floatLeft}
                transition={transitionChildren}
                className={'song-wrapper'}
              >
                {Array.isArray(songs)
                  ? songs.map((item, index) => <Track item={item} key={index} />)
                  : null}
              </motion.div>
            </section>
            <aside className={'musica-sidebar'}>
              <div className={'sticky top-0'}>
                <motion.h2
                  className={'musica-subheader'}
                  variants={floatLeft}
                  transition={transitionChildren}
                  title={'Music'}
                >
                  Now Playing
                </motion.h2>
                {/*todo animate this*/}
                <CurrentSong fallback={fallback} />
              </div>
            </aside>
          </div>
        </div>
        <Eye />
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const { songs, currentSong } = await getMusicaProps()
    return {
      props: {
        songs,
        fallback: {
          [CURRENTLY_PLAYED_URL]: currentSong
        }
      }
    }
  } catch (err) {
    console.error(err)
  }
  return {
    props: {}
  }
}
