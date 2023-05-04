import { createRecentlyPlayed } from './create-recently-played'
import { getCurrentSong } from './get-current-song'
import { getSongs } from './get-songs'

export async function getMusicaProps() {
  const countNew = await createRecentlyPlayed()
  const songs = await getSongs()
  const currentSong = await getCurrentSong()

  return {
    songs,
    currentSong,
    countNew
  }
}
