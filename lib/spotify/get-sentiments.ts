import prisma from 'lib/prisma'

export async function getSentiments(songs: Partial<{ songId: string | null }[]>) {
  if (
    !process.env.MUSIC_SENTIMENT_ENABLED ||
    (process.env.MUSIC_SENTIMENT_ENABLED &&
      process.env.MUSIC_SENTIMENT_ENABLED.toLowerCase() !== 'true')
  ) {
    console.log('music sentiment disabled')
    return []
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const sentimentSongIds: string[] = songs.filter(song => !!song?.songId).map(song => song!.songId!)
  const sentimentAnalysisList = await prisma.musicSentimentAnalysis.findMany({
    where: {
      songId: {
        in: sentimentSongIds
      }
    }
  })
  return sentimentAnalysisList.map(analysis => ({
    ...analysis,
    createdAt: null
  }))
}
