// @ts-check
import fetch from 'node-fetch'
import querystring from 'querystring'
import dotenv from 'dotenv'

// functions to seed tings
dotenv.config({
  path: process.env.NODE_ENV === 'development' ? '.env' : `.env.production`
})

let tries = 0

const url = `${process.env.NEXT_PUBLIC_HOST}/api/v1/create-recently-played?${querystring.stringify({
  sillySecret: process.env.SILLY_SECRET
})}`
console.log(`fetching url`, url)
;(async function main() {
  // update recently played in bg
  try {
    await fetch(url)
  } catch (e) {
    console.error('unable to create recently played', e)
    if (tries < 3) {
      tries += 1
      await main()
    }
  }
})()
