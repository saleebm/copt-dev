import Image from 'next/image'
import type { Song } from '@prisma/client'
import { Head } from 'components/Head'
import { GetServerSideProps } from 'next'
import { getSpotifyData } from 'lib/spotify/get-spotify-data'
import prisma from '../lib/prisma'
import { floatLeft } from '../utilities/animations/variants'
import { transitionChildren } from '../utilities/animations/transitions'
import { motion } from 'framer-motion'

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
                  <div className={'song-item'} key={index}>
                    {!!item.albumArtUrl ? (
                      <Image
                        className={'song-image'}
                        width={300}
                        height={300}
                        src={item.albumArtUrl}
                        alt={`album art for ${item.ablumName} ${item.name}`}
                      />
                    ) : null}
                    <div>
                      <p className={'lead'}>{item.name}</p>
                      <p>{item.artistName}</p>
                      <p className={'text-sm'}>
                        Played at{' '}
                        {new Date(item.playedAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))
              : null}
          </motion.div>
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
      },
      revalidate: 600
    }
  } catch (err) {
    console.error(err)
  }
  return {
    props: {}
  }
}
