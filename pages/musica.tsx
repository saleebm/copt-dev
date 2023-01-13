import type { Song } from '@prisma/client'
import { Head } from 'components/Head'
import { GetServerSideProps } from 'next'
import { getSpotifyData } from '../utilities/spotify/get-spotify-data'
import prisma from '../lib/prisma'

type SongParsed = Song & { playedAt: string }
export default function SongsPage({ songs }: { songs: string }) {
  const data: SongParsed[] = !!songs ? JSON.parse(songs) : []
  return (
    <>
      <Head title='Musica' description='This is what I have been listening to' />
      <div className='page-content'>
        <section className='section-fluid'>
          <br />
          {Array.isArray(data)
            ? data.map((item, index) => (
                <div key={index}>
                  <p>{item.name}</p>
                  <p>{item.artistName}</p>
                  <p>
                    {new Date(item.playedAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                  <hr />
                </div>
              ))
            : null}
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
