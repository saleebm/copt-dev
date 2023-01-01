import * as querystring from 'querystring'
import { NextApiRequest, NextApiResponse } from 'next'
import { serialize, CookieSerializeOptions } from 'cookie'

/**
 * This sets `cookie` using the `res` object
 */

export const setCookie = (
  res: NextApiResponse,
  name: string,
  value: unknown,
  options: CookieSerializeOptions = {}
) => {
  const stringValue =
    typeof value === 'object' ? 'j:' + JSON.stringify(value) : String(value)

  if (typeof options.maxAge === 'number') {
    options.expires = new Date(Date.now() + options.maxAge * 1000)
  }

  res.setHeader('Set-Cookie', serialize(name, stringValue, options))
}

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const generateRandomString = (length: number) => {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

const stateKey = 'spotify_auth_state';

/**
 * Redirects to Spotify auth page
 * @param _req
 * @param res
 */
export default async function authorizeSpotify(_req: NextApiRequest, res: NextApiResponse) {
  const state = generateRandomString(16);
  setCookie(res, stateKey, state, { path: '/', maxAge: 2592000 })
  
  const scope = 'user-read-private user-read-email user-read-recently-played'

  const clientID = process.env.SPOTIFY_CLIENT_ID
  const host = process.env.NEXT_PUBLIC_HOST
  
  if (!clientID || !host) {
    throw new Error('Misconfigured env dude')
  }

  const queryParams = querystring.stringify({
    client_id: clientID,
    response_type: 'code',
    redirect_uri: `${host}/api/v1/callback-spotify`,
    state: state,
    scope: scope
  })

  res.redirect(`https://accounts.spotify.com/authorize?${queryParams}`)
}