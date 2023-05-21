import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

;(async function () {
  const songs = await prisma.song.findMany({
    select: {
      songId: true,
      id: true
    }
  })
  const sentiments = await prisma.musicSentimentAnalysis.findMany({
    select: {
      songId: true,
      id: true
    }
  })
  const bars = await prisma.musicSentimentBar.findMany({
    select: {
      songId: true,
      id: true
    }
  })
  let foundSentiments = []
  let foundBars = []
  for (const song of songs) {
    if (sentiments.some(s => s.songId === song.songId))
      foundSentiments = [...foundSentiments, sentiments.find(s => s.songId === song.songId)]
    else console.warn(`missing sentiment for song ${song.id} with song id ${song.songId}`)

    if (bars.some(s => s.songId === song.songId))
      foundBars = [...foundBars, bars.find(s => s.songId === song.songId)]
    else console.warn(`missing bar for song ${song.id} with song id ${song.songId}`)
  }
  console.log('done')
})()
