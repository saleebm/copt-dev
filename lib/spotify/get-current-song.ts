import { authenticate } from './authenticate'

export async function getCurrentSong(): Promise<SpotifyApi.CurrentlyPlayingResponse | null> {
  const { auth } = await authenticate()
  const endpoint = `https://api.spotify.com/v1/me/player/currently-playing?market=ES`

  const currentSong = await fetch(endpoint, {
    headers: {
      Authorization: `${auth.token_type} ${auth.access_token}`,
      'Content-Type': 'application/json'
    },
    redirect: 'follow'
  })

  if (!!currentSong.body) {
    return (await currentSong.json()) as SpotifyApi.CurrentlyPlayingResponse
  } else {
    return null
  }
}
