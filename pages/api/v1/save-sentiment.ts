import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

export default async function saveSentiment(req: NextApiRequest, res: NextApiResponse) {
  if (!process.env.MUSIC_SENTIMENT_SECRET) {
    throw new Error('configure your music sentiment secret')
  }
  if (!req.headers || req.headers['x-secret'] !== process.env.MUSIC_SENTIMENT_SECRET) {
    res.status(400).end()
    return
  }

  if (req.method?.toLowerCase() !== 'post') {
    res.status(405).end()
    return
  }
  const trackId = req.body['trackId']
  const existingSentiment = await prisma.musicSentimentAnalysis.findUnique({
    where: {
      songId: trackId
    }
  })

  if (!!existingSentiment) {
    //todo update it if color/mood changes
    res.status(304).end()
    return
  }
  let features = ''
  if (!!req.body['features']) {
    features = JSON.stringify(req.body['features'])
    console.log(features, features.length)
  }
  const mood = req.body['mood']
  const color = req.body['color']
  await prisma.musicSentimentAnalysis.create({
    data: {
      mood,
      color,
      features,
      songId: trackId
    }
  })
  //todo use uuids for songs to set music bars
  res.status(200).end()
}
