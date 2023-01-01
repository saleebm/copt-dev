import { NextApiRequest, NextApiResponse } from 'next'
import * as querystring from 'querystring'
import prisma from 'lib/prisma'

/**
 * Spotify callback
 * @param req
 * @param res
 */
export default async function callbackSpotify(req: NextApiRequest, res: NextApiResponse) {
  const code = req.query.code
  if (!code) {
    console.error('Missing code from callback')
    res.status(500).end()
    return
  } else {
    res.status(200).end()
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
    const token = Buffer.from(`${clientID}:${clientSecret}`).toString('base64')
    const url = `https://accounts.spotify.com/api/token?${querystring.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${host}/api/v1/callback-spotify`
    })}`
    const auth = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${token}`,
        'content-type': 'application/x-www-form-urlencoded'
      },
      redirect: 'follow'
    }).then(result => result.json())

    const user = await prisma.spotifyUser.upsert({
      where: {
        username
      },
      create: {
        username,
        refreshToken: auth.refresh_token,
        accessToken: auth.access_token,
        scope: auth.scope,
        tokenType: auth.token_type
      },
      update: {
        refreshToken: auth.refresh_token,
        accessToken: auth.access_token,
        scope: auth.scope,
        tokenType: auth.token_type
      }
    })
    console.log(`created user ${user.username} with id ${user.id}`)
  } catch (e) {
    console.error(e)
  }
}