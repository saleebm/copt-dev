import Image from 'next/image'
import type { Song } from '@prisma/client'
import { motion } from 'framer-motion'
import { Head } from 'components/Head'
import { GetServerSideProps } from 'next'
import { getSpotifyData } from 'lib/spotify/get-spotify-data'
import prisma from '../lib/prisma'
import { floatLeft } from '../utilities/animations/variants'
import { transitionChildren } from '../utilities/animations/transitions'
import { Eye } from '../components/Ascii/eye'

type SongParsed = Song & { playedAt: string }
export default function SongsPage({ songs }: { songs: string }) {
  const data: SongParsed[] = !!songs ? JSON.parse(songs) : []
  return (
    <>
      <Head title='Musica' description='This is what I have been listening to' />
      <div className='page-content'>
        <section className='section-fluid'>
          <motion.h1 variants={floatLeft} transition={transitionChildren}>
            Recently Played
          </motion.h1>
          <motion.div
            variants={floatLeft}
            transition={transitionChildren}
            className={'song-wrapper'}
          >
            {Array.isArray(data)
              ? data.map((item, index) => (
                  <figure className={'song-item'} key={index}>
                    {!!item.albumArtUrl ? (
                      <a
                        className={'image-link'}
                        rel={'noreferrer'}
                        target={'_blank'}
                        href={`${item.href}`}
                      >
                        <Image
                          className={'song-image'}
                          width={320}
                          height={320}
                          src={item.albumArtUrl}
                          alt={`album art for ${item.ablumName} ${item.name}`}
                        />
                      </a>
                    ) : /*todo placeholder*/ null}
                    <figcaption>
                      <p className={'lead'}>
                        <a
                          className={'song-text-link'}
                          rel={'noreferrer'}
                          target={'_blank'}
                          href={`${item.href}`}
                        >
                          {item.name}
                        </a>
                      </p>
                      <p>
                        <a
                          className={'song-text-link secondary-color'}
                          rel={'noreferrer'}
                          target={'_blank'}
                          href={`${item.artistHref}`}
                        >
                          {item.artistName}
                        </a>
                      </p>
                      <p className={'text-sm'}>
                        ⏰{' '}
                        {new Date(item.playedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </figcaption>
                  </figure>
                ))
              : null}
          </motion.div>
          <Eye />
        </section>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    await getSpotifyData()
    const username = process.env.NEXT_PUBLIC_SPOTIFY_USER_ID
    const songs = await prisma.song.findMany({
      orderBy: {
        playedAt: 'desc'
      },
      where: {
        spotifyUser: {
          username
        }
      },
      take: 50
    })
    return {
      props: {
        songs: JSON.stringify(songs)
      }
    }
  } catch (err) {
    console.error(err)
  }
  return {
    props: {}
  }
}
