import querystring from 'querystring'
import prisma from '../../lib/prisma'
import { authenticate } from './authenticate'

export async function getSpotifyData() {
  const { auth, user } = await authenticate()
  // get recently played
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

  // delete the older records
  // todo - store history but dedupe
  await prisma.song.deleteMany({
    where: {
      spotifyUserId: user.id
    }
  })

  // store data
  let promises: any = []
  for (const item of recentlyPlayed.items) {
    const artistNames = Array.isArray(item?.track?.artists)
      ? item.track.artists.map(artist => artist.name).join(', ')
      : null
    const artist = Array.isArray(item?.track?.artists) ? item.track.artists[0] : null
    const album = item?.track?.album
    const albumImage = Array.isArray(album?.images) ? album.images[0] : null
    const playedAt = new Date(item?.played_at)
    const trackName = item?.track.name
    if (!trackName || promises[promises.length - 1]?.name === trackName) {
      continue
    }
    promises = promises.concat({
      ablumName: item?.track?.album?.name,
      albumArtUrl: albumImage?.url,
      artistHref: artist?.external_urls?.spotify,
      artistName: artistNames,
      href: item?.track?.href,
      name: trackName,
      playedAt: playedAt,
      songId: item.track.id,
      uri: item.track.uri,
      spotifyUserId: user.id
    })
  }
  await prisma.song.createMany({
    data: promises
  })
}
