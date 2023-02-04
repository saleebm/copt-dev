import { authenticate } from './authenticate'
import { CurrentlyPlayingItemProps } from '../../@types'

type EpisodeObject = SpotifyApi.EpisodeObject
type TrackObjectFull = SpotifyApi.TrackObjectFull

export async function getCurrentSong(): Promise<Partial<CurrentlyPlayingItemProps> | null> {
  const { auth } = await authenticate()
  const endpoint = `https://api.spotify.com/v1/me/player/currently-playing?market=ES&additional_types=track,episode`

  const currentSong = await fetch(endpoint, {
    headers: {
      Authorization: `${auth.token_type} ${auth.access_token}`,
      'Content-Type': 'application/json'
    },
    redirect: 'follow'
  })

  const contentType = `${currentSong.headers.get('Content-Type')}`
  if (contentType.includes('application/json')) {
    const body: SpotifyApi.CurrentlyPlayingResponse | null = await currentSong.json()
    if (!body?.item || (body && !['episode', 'track'].includes(body.currently_playing_type))) {
      return null
    }
    let props: Partial<CurrentlyPlayingItemProps> = {
      name: body.item.name,
      href: body.item.href,
      progress:
        body.progress_ms && !isNaN(body.progress_ms)
          ? body.progress_ms / body.item.duration_ms
          : null
    }

    if (body.currently_playing_type === 'episode') {
      //show
      const episode = body.item as EpisodeObject
      const additionalProps: Partial<CurrentlyPlayingItemProps> = {
        previewUrl: episode.audio_preview_url,
        albumArtUrl: Array.isArray(episode.images) ? episode.images[0].url : null,
        albumName: episode.show.name,
        artistHref: episode.show.href,
        artistName: episode.show.publisher
      }
      props = {
        ...props,
        ...additionalProps
      }
    } else {
      //track
      const track = body.item as TrackObjectFull
      const additionalProps: Partial<CurrentlyPlayingItemProps> = {
        previewUrl: track.preview_url,
        albumArtUrl: Array.isArray(track.album.images) ? track.album.images[0].url : null,
        albumName: track.album.name,
        artistHref: Array.isArray(track.artists) ? track.artists[0].href : null,
        artistName: track.artists.map(a => a.name).join(', ')
      }
      props = {
        ...props,
        ...additionalProps
      }
    }
    return props
  } else {
    return null
  }
}
