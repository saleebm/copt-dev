import type { NextApiRequest, NextApiResponse } from 'next'
import { getCurrentSong } from 'lib/spotify/get-current-song'

export default async function currentlyPlaying(req: NextApiRequest, res: NextApiResponse) {
  if (req.method?.toLowerCase() !== 'get') {
    res.status(405).end()
    return
  }

  try {
    const song = await getCurrentSong()
    res.status(200).json(song)
    return
  } catch (e) {
    console.error(e)
  }

  res.status(500).end()
  return
}
