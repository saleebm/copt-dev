import { NextApiRequest, NextApiResponse } from 'next'
import prisma from 'lib/prisma'

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
  let features = ''
  if (!!req.body['features']) {
    features = JSON.stringify(req.body['features'])
  } else {
    console.error('missing features data')
  }
  const mood = req.body['mood']
  const color = req.body['color']
  const uuids = req.body['uuids']
  console.log({
    mood,
    color,
    uuids,
    trackId,
    features
  })

  const sentimentAnalysis = await prisma.musicSentimentAnalysis.upsert({
    create: {
      mood,
      color,
      features,
      songId: trackId
    },
    update: {
      mood,
      color,
      features
    },
    where: {
      songId: trackId
    }
  })
  const songs = await prisma.song.findMany({
    where: {
      id: {
        in: uuids
      }
    }
  })
  let createPromises: ReadonlyArray<Promise<any>> = []
  for (const song of songs) {
    if (!song || !song.songId) {
      console.error('should never happen')
      continue
    }
    console.log(`updating song ${song.id}`)
    // each bar goes to a song
    const bar = await prisma.musicSentimentBar.create({
      data: {
        musicSentimentAnalysis: {
          connect: {
            id: sentimentAnalysis.id
          }
        },
        song: {
          connect: {
            id: song.id
          }
        }
      }
    })
    const creationPromise = prisma.song.update({
      where: {
        id: song.id
      },
      data: {
        sentimentBar: {
          connect: {
            id: bar.id
          }
        }
      }
    })
    createPromises = [...createPromises, creationPromise]
  }
  await Promise.allSettled(createPromises)
  res.status(200).end()
}
