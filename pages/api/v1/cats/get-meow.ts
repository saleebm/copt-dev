import { fetchKitty } from 'lib/cats'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function getMeow(req: NextApiRequest, res: NextApiResponse) {
  if (req.method?.toLowerCase() !== 'get') {
    res.status(405).end()
    return
  }

  try {
    const catData = await fetchKitty()
    res.status(200).json(catData)
  } catch (e) {
    console.error(e)
    res.status(500).json({ catData: null })
  }
}
