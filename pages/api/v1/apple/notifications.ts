import { NextApiRequest, NextApiResponse } from 'next'

export default function AppleNotificationHandler(req: NextApiRequest, _: NextApiResponse, res: NextApiResponse) {
  console.error(req?.body)
  return res.status(200)
}
