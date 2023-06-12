import prisma from '../prisma'

export async function getUser() {
  const username = process.env.SPOTIFY_USER_ID

  if (!username) {
    throw new Error('CONFIGURE YOUR env DUDE!')
  }

  return await prisma.spotifyUser.findFirst({
    where: {
      username: {
        equals: username
      }
    }
  })
}
