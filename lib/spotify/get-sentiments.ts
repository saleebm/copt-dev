import prisma from 'lib/prisma'

export async function getSentiments(songs: Partial<{ songId: string | null }[]>) {
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
