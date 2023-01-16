import prisma from '../prisma'

export async function getUser() {
  const username = process.env.NEXT_PUBLIC_SPOTIFY_USER_ID

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
