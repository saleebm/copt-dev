// @ts-check
import { PrismaClient } from '@prisma/client'
import fetch from 'node-fetch'

const prisma = new PrismaClient()

async function seed() {
  if (!process.env.MUSIC_SENTIMENT_ENABLED) {
    console.log('MUSIC_SENTIMENT_ENABLED disabled')
    return 0
  }

  const songs = await prisma.song.findMany({
    select: {
      songId: true,
      id: true
    }
  })
  const sentimentAnalyzed = await prisma.musicSentimentAnalysis.findMany({
    select: {
      songId: true
    }
  })

  const payloads = {}
  for (const song of songs) {
    if (!!payloads[song.songId]) {
      console.log('already sending ' + song.songId)
      const oldReqData = payloads[song.songId]
      payloads[song.songId] = {
        uuids: [...oldReqData.uuids, song.id], // attach this uuid so it can be attached to a bar of it's own, linked to the sentiment
        trackId: song.songId
      }
      continue
    }

    if (sentimentAnalyzed.some(analysis => analysis.songId === song.songId)) {
      console.log('already have analysis for song ' + song.songId)
      // todo link song to sentiment for front end bars

      continue
    }

    payloads[song.songId] = {
      uuids: [song.id],
      trackId: song.songId
    }
  }

  let results = 0
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [_, v] of Object.entries(payloads)) {
    try {
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
  return results
}

seed()
  .then(total => {
    console.log('done. total: ' + total)
  })
  .catch(e => {
    console.error(e)
  })
