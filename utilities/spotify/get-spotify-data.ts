import querystring from 'querystring'
import prisma from '../../lib/prisma'

export async function getSpotifyData() {
  const username = process.env.NEXT_PUBLIC_SPOTIFY_USER_ID
  const clientID = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const host = process.env.NEXT_PUBLIC_HOST

  if (!clientID || !clientSecret || !host || !username) {
    throw new Error('CONFIGURE YOUR env DUDE!')
  }

  // todo separate auth
  const user = await prisma.spotifyUser.findFirst({
    where: {
      username: {
        equals: username
      }
    }
  })
  if (!user) {
    throw new Error(`User not inserted yet with username ${username}`)
  }
  const token = Buffer.from(`${clientID}:${clientSecret}`).toString('base64')
  // get new token first using refresh
  const refresh_token = user.refreshToken
  const refreshUrl = `https://accounts.spotify.com/api/token?${querystring.stringify({
    grant_type: 'refresh_token',
    refresh_token: refresh_token
  })}`

  const auth = await fetch(refreshUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + token,
      'content-type': 'application/x-www-form-urlencoded'
    }
  }).then(result => result.json())

  // store refresh token
  await prisma.spotifyUser.update({
    where: {
      id: user.id
    },
    data: {
      accessToken: auth.access_token,
      scope: auth.scope,
      tokenType: auth.token_type
    }
  })

  // todo separate methods
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
    // todo concat artist names if more than 1?
    const artistNames = Array.isArray(item?.track?.artists)
      ? item.track.artists.map(artist => artist.name).join(', ')
      : null
    const artist = Array.isArray(item?.track?.artists) ? item.track.artists[0] : null
    console.log(artistNames)
    const album = item?.track?.album
    const albumImage = Array.isArray(album?.images) ? album.images[0] : null
    const playedAt = new Date(item?.played_at)
    if (promises[promises.length - 1]?.name === item?.track.name) {
      continue
    }

    const creationData: any = {
      ablumName: item?.track?.album?.name,
      albumArtUrl: albumImage?.url,
      artistHref: artist?.external_urls?.spotify,
      artistName: artistNames,
      href: item?.track?.href,
      name: item?.track.name,
      playedAt: playedAt,
      songId: item.track.id,
      uri: item.track.uri,
      spotifyUserId: user.id
    }
    promises = promises.concat(creationData)
  }
  await prisma.song.createMany({
    data: promises
  })
}
