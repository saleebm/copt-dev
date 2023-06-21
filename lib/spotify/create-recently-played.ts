import querystring from 'querystring'
import prisma from '../../lib/prisma'
import { authenticate } from './authenticate'
import { getUser } from './get-user'

export async function createRecentlyPlayed(): Promise<number> {
  let user, auth
  try {
    const authentication = await authenticate()
    user = authentication.user
    auth = authentication.auth
  } catch (e) {
    console.error(e)
  }
  if (!user) {
    user = await getUser()
    if (user != null)
      auth = {
        token_type: 'Bearer',
        access_token: user.accessToken
      }
    else throw new Error('No user!')
  }

  // get recently played
  // todo: use `after` with unix timestamp of last song inserted date to limit results
  const recentlyPlayedUrl = `https://api.spotify.com/v1/me/player/recently-played?${querystring.stringify(
    {
      limit: 50
    }
  )}`

  const recentlyPlayed: SpotifyApi.UsersRecentlyPlayedTracksResponse = await fetch(
    recentlyPlayedUrl,
    {
      headers: {
        Authorization: `${auth.token_type} ${auth.access_token}`,
        'Content-Type': 'application/json'
      },
      redirect: 'follow'
    }
  ).then(result => result.json())

  if (!recentlyPlayed || !Array.isArray(recentlyPlayed.items)) {
    throw new Error('missing data from spotify')
  }

  // store data todo fix any
  // can I skip processing for existing tracks
  let promises: any = []
  for (const item of recentlyPlayed.items) {
    if (!item?.played_at) {
      // this is an indexed field (unique) && must be present
      console.error('missing played at', item)
      continue
    }
    const songId = item?.track.id
    if (!songId || promises[promises.length - 1]?.songId === songId) {
      continue
    }
    const artistNames = Array.isArray(item?.track?.artists)
      ? item.track.artists.map(artist => artist.name).join(', ')
      : null
    const artist = Array.isArray(item?.track?.artists) ? item.track.artists[0] : null
    const album = item?.track?.album
    const albumImage = Array.isArray(album?.images) ? album.images[0] : null
    const playedAt = new Date(item.played_at)

    promises = promises.concat({
      albumName: item?.track?.album?.name,
      albumArtUrl: albumImage?.url,
      artistHref: artist?.external_urls?.spotify,
      artistName: artistNames,
      href: item?.track?.external_urls?.spotify,
      name: item?.track.name,
      playedAt: playedAt, // unique
      songId: songId,
      uri: item.track.uri,
      spotifyUserId: user.id,
      previewUrl: item?.track?.preview_url
    })
  }
  const result = await prisma.song.createMany({
    data: promises,
    skipDuplicates: true
  })

  return result.count
}
