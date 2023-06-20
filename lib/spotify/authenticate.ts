import querystring from 'querystring'
import { getUser } from './get-user'
import prisma from '../prisma'

export async function authenticate() {
  const username = process.env.SPOTIFY_USER_ID
  const clientID = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const host = process.env.NEXT_PUBLIC_HOST

  if (!clientID || !clientSecret || !host || !username) {
    throw new Error('CONFIGURE YOUR env DUDE!')
  }

  const user = await getUser()
  if (!user) {
    throw new Error(`User not inserted yet with username ${username}`)
  }
  const token = Buffer.from(`${clientID}:${clientSecret}`).toString('base64')

  // todo don't call refresh && don't update user unless necessary
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

  return {
    auth,
    user
  }
}
