import { createRecentlyPlayed } from './create-recently-played'
import { getCurrentSong } from './get-current-song'
import { getSongs } from './get-songs'
import { getSentiments } from './get-sentiments'
import { seed } from '../../scripts/seed.mjs'

export async function getMusicaProps() {
  const countNew = await createRecentlyPlayed() // this should be done in bg, not per request

  if (countNew > 0) {
    try {
      await seed()
    } catch (e) {
      console.error(e)
    }
  }
  const songs = await getSongs()
  const currentSong = await getCurrentSong()
  //todo optimize
  const sentiments = await getSentiments(songs)

  return {
    songs,
    currentSong,
    countNew,
    sentiments
  }
}
