import { NextApiRequest, NextApiResponse } from 'next'

export default function AppleNotificationHandler(req: NextApiRequest, _: NextApiResponse, res: NextApiResponse) {
  console.error('Apple notification handler: ', req?.body)
  // used for Apple's server to send webhooks
  return res.status(200)
}
