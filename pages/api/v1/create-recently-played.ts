import type { NextApiRequest, NextApiResponse } from 'next'
import { createRecentlyPlayed as callCreate } from 'lib/spotify/create-recently-played'
import { queueSentimentAnalysis } from '../../../scripts/seed.mjs'

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
    const countNew = await callCreate() // this should be done in bg, not per request

    if (countNew > 0) {
      try {
        // this queues new songs into db
        await queueSentimentAnalysis()
      } catch (e) {
        console.error(`failed to queue sentiment analysis:`, e)
      }
    }

    res.status(200).end()
    return
  } catch (e) {
    console.error(e)
  }

  res.status(500).end()
  return
}
