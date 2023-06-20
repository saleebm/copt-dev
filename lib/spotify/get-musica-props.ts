import { createRecentlyPlayed } from './create-recently-played'
import { getCurrentSong } from './get-current-song'
import { getSongs } from './get-songs'
import { queueSentimentAnalysis } from 'scripts/seed.mjs'

export async function getMusicaProps() {
  const countNew = await createRecentlyPlayed() // this should be done in bg, not per request

  if (countNew > 0) {
    try {
      // this queues new songs into db
      await queueSentimentAnalysis(false)
    } catch (e) {
      console.error(e)
    }
  }
  const songs = await getSongs()
  const currentSong = await getCurrentSong()

  return {
    songs,
    currentSong,
    countNew
  }
}
