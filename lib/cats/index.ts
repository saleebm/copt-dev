import { CatData } from 'lib/models/cats'

export async function fetchKitty() {
  console.log('fetching kitty')
  if (!process.env.CAT_API_KEY) {
    throw new Error('CAT_API_KEY is not set')
  }
  let catData = await fetch(
    `https://api.thecatapi.com/v1/images/search?size=full&api_key=${process.env.CAT_API_KEY}`,
    {
      mode: 'cors'
    }
  )
  catData = await catData.json()
  return Array.isArray(catData) ? (catData[0] as CatData) : null
}
