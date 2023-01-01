import type { NextApiRequest, NextApiResponse } from 'next'
import * as querystring from 'querystring'
import prisma from 'lib/prisma'

export default async function getRecentlyPlayed(req: NextApiRequest, res: NextApiResponse) {
  if (!process.env.SILLY_SECRET) {
    throw new Error('configure your silly secret')
  }
  if (!req.query || req.query?.sillySecret !== process.env.SILLY_SECRET) {
    res.status(400).end()
    return
  }
  
  if (req.method?.toLowerCase() !== 'get') {
    res.status(405).end()
    return
  }

  const username = process.env.NEXT_PUBLIC_SPOTIFY_USER_ID
  const clientID = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const host = process.env.NEXT_PUBLIC_HOST

  if (!clientID || !clientSecret || !host || !username) {
    console.error('CONFIGURE YOUR env DUDE!')
    res.status(500).end()
    return
  }

  try {
    const user = await prisma.spotifyUser.findFirst({
      where: {
        username: {
          equals: username
        }
      }
    })
    if (!user) {
      console.error(`User not inserted yet with username ${username}`)
      res.status(500).end()
      return
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

    const recentlyPlayedUrl = `https://api.spotify.com/v1/me/player/recently-played?${querystring.stringify({
      limit: 50
    })}`
    const recentlyPlayed = await fetch(recentlyPlayedUrl, {
      headers: {
        Authorization: `${auth.token_type} ${auth.access_token}`,
        'Content-Type': 'application/json'
      },
      redirect: 'follow'
    }).then(result => result.json())

    res.status(200).json(recentlyPlayed)
    return
  } catch (e) {
    console.error(e)
  }

  res.status(500).end()
  return
}
