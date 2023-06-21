import type { NextApiRequest, NextApiResponse } from 'next'
import { createRecentlyPlayed as callCreate } from 'lib/spotify/create-recently-played'

export default async function createRecentlyPlayed(req: NextApiRequest, res: NextApiResponse) {
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

  try {
    await callCreate()

    res.status(200).end()
    return
  } catch (e) {
    console.error(e)
  }

  res.status(500).end()
  return
}
