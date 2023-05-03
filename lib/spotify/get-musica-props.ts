import { createRecentlyPlayed } from './create-recently-played'
import { getCurrentSong } from './get-current-song'
import { getSongs } from './get-songs'

export async function getMusicaProps() {
  const countNew = await createRecentlyPlayed()
  const songs = await getSongs()
  const currentSong = await getCurrentSong()

  if (countNew > 0) {
    // push to golang rabbit queue
    const newSongs = songs.slice(0, countNew)
    const promises = []
    for (const song of newSongs) {
      const promiseFetch = fetch('http://127.0.0.1:8080/track', {
        body: JSON.stringify({
          trackId: song.songId
        }),
        method: 'POST'
      })
      promises.push(promiseFetch)
    }
    try {
      await Promise.all(promises)
    } catch (e) {
      console.error(e)
    }
  }

  return {
    songs,
    currentSong
  }
}
