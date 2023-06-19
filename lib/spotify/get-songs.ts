import prisma from '../../lib/prisma'

export type GetSongs = Awaited<ReturnType<typeof getSongs>>
export type SongResult = GetSongs[keyof GetSongs]

export async function getSongs() {
  const username = process.env.SPOTIFY_USER_ID
  const songs = await prisma.song.findMany({
    orderBy: {
      playedAt: 'desc'
    },
    where: {
      spotifyUser: {
        username
      }
    },
    include: {
      sentimentBar: {
        include: {
          musicSentimentAnalysis: true
        }
      }
    },
    take: 50
  })
  return songs.map(song => ({
    ...song,
    playedAt: !!song.playedAt
      ? new Date(song.playedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })
      : null,
    createdAt: null,
    id: null,
    sentimentBar: song.sentimentBar
      ? {
          ...song.sentimentBar,
          createdAt: null,
          musicSentimentAnalysis: song.sentimentBar.musicSentimentAnalysis
            ? {
                ...song.sentimentBar.musicSentimentAnalysis,
                createdAt: null
              }
            : {}
        }
      : {}
  }))
}
