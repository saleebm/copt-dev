import { IgApiClient, UserFeedResponseItemsItem } from 'instagram-private-api'
import { IgPhotos } from 'lib/models/ig-photos'
import fs from 'fs'

type UserFeedResponseItemsItemWithProductType = UserFeedResponseItemsItem & {
  product_type: 'carousel_container' | 'clips' | 'feed'
}

type UserFeedResponseArray = ReadonlyArray<UserFeedResponseItemsItemWithProductType>

/**
 * @yields {IgPhotos}
 * @description get the ig photos I like and store them in db.
 * @throws if not configured or from error in ig client
 */
export async function getIgPhotos(): Promise<IgPhotos> {
  if (!process.env.IG_PASSWORD || !process.env.IG_USERNAME) {
    throw new Error('need to set env')
  }
  //todo - store timestamp when last updated, so we can check if we need to login to IG or nah
  try {
    const ig = new IgApiClient()
    // You must generate device id's before login.
    // Id's generated based on seed
    // So if you pass the same value as first argument - the same id's are generated every time
    ig.state.generateDevice(process.env.IG_USERNAME as string)
    // await ig.simulate.preLoginFlow()
    await ig.account.login(process.env.IG_USERNAME as string, process.env.IG_PASSWORD as string)

    const userFeed = ig.feed.liked()
    // brings in 18 pics
    const items = (await userFeed.items()) as unknown as UserFeedResponseArray

    if (Array.isArray(items)) {
      //todo - store in prisma with timestamp
      const igPhotos: IgPhotos = items.map(item => {
        //todo check if item is image, video, or carousel
        //todo also check if these return private accounts or not, and if so, don't show
        switch (item.product_type) {
          // either carousel_container, feed, or clips
          case 'carousel_container':
            return {
              id: item.id,
              code: item.code,
              image_versions2:
                (Array.isArray(item.carousel_media) && item.carousel_media[0].image_versions2) ??
                null,
              caption: item.caption
            }
          case 'clips':
            //todo play vids, ig provides spritesheet, perhaps make gifs from spritesheet
            return {
              id: item.id,
              code: item.code,
              image_versions2: item.image_versions2 ?? null,
              caption: item.caption
            }
          case 'feed':
          default:
            return {
              id: item.id,
              code: item.code,
              image_versions2: item.image_versions2 ?? null,
              caption: item.caption
            }
        }
      })
      console.log(igPhotos.length)
      const data = JSON.stringify(igPhotos)
      fs.writeFileSync('./igPhotos.json', data)
      console.warn(`created igPhotos.json with length ${igPhotos.length}`)
      return igPhotos
    } else {
      return []
    }
  } catch (e) {
    console.error('using backup ig photos\r\n')
    if (fs.existsSync('./igPhotos.json')) {
      const igPhotos = JSON.parse(fs.readFileSync('./igPhotos.json', 'utf8'))
      console.error('using backup ig photos with length: ', igPhotos.length, '\r\n')
      return igPhotos
    } else {
      return []
    }
  }
}
