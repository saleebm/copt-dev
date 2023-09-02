import { PrismaClient } from '@prisma/client'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

// functions to seed tings
dotenv.config({
  path: process.env.NODE_ENV === 'development' ? '.env' : `.env.production`
})

const prisma = new PrismaClient()

export async function queueSentimentAnalysis() {
  // todo this method is too large
  if (
    !process.env.MUSIC_SENTIMENT_ENABLED ||
    (process.env.MUSIC_SENTIMENT_ENABLED &&
      process.env.MUSIC_SENTIMENT_ENABLED.toLowerCase() !== 'true')
  ) {
    console.log('music sentiment disabled')
    return 0
  }

  const override = process.env.FORCE_SENTIMENT_OVERRIDE
  // force get a new sentiment for every song in db (only if its a cron so it doesn't blow up when called from api)
  const force = String(override)?.toLowerCase() === 'true' || override === true
  console.log(`forcing update? ${force}`)

  const songs = await prisma.song.findMany({
    select: {
      songId: true,
      id: true
    },
    // select all if force
    where: force
      ? {}
      : {
        sentimentBar: undefined
      }
  })
  const sentimentAnalyzed = await prisma.musicSentimentAnalysis.findMany({
    select: {
      songId: true,
      id: true,
      mood: true
    },
    where: {
      songId: {
        in: songs.map(song => song.songId)
      }
    }
  })

  const payloads = {}
  let batchUpdates = []
  for (const song of songs) {
    // already have payload for this spotify song, can add multiple uuids to call to get sentiment
    if (!!payloads[song.songId]) {
      console.log('already sending ' + song.songId)
      const oldReqData = payloads[song.songId]
      payloads[song.songId] = {
        uuids: [...oldReqData.uuids, song.id], // attach this uuid so it can be attached to a bar of it's own, linked to the sentiment
        trackId: song.songId
      }
      continue
    }

    // if not forcing to get a new sentiment for each, and existing sentiment, create a new bar pointing to the sentiment
    // instead of getting a new one (calls continue to prevent this song from getting a new sentiment)
    if (!force && sentimentAnalyzed.some(analysis => analysis.songId === song.songId)) {
      console.log('already have analysis for song ' + song.songId)
      const sentimentAnalysis = sentimentAnalyzed.find(analysis => analysis.songId === song.songId)

      // if the mood is there OR force update
      if (sentimentAnalysis.mood) {
        console.log(' ---- updating')
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
        const updateItem = prisma.song.update({
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
        batchUpdates = [...batchUpdates, updateItem]
        continue
      }
    }

    // send it
    payloads[song.songId] = {
      uuids: [song.id],
      trackId: song.songId
    }
  }

  let results = 0
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [_, v] of Object.entries(payloads)) {
    try {
      // get a new sentiment
      const result = await fetch('http://127.0.0.1:8080/track', {
        body: JSON.stringify(v),
        method: 'POST',
        headers: {
          'Content-Type': 'Application/JSON'
        }
      })
      console.log(await result.text())
      results += 1
    } catch (e) {
      console.error(e)
    }
  }
  // todo handle error
  await Promise.allSettled(batchUpdates)
  // this will create the musica page
  await fetch(`${process.env.NEXT_PUBLIC_HOST}/musica`)
  return results
}
