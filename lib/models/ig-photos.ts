import {
  UserFeedResponseCaption,
  UserFeedResponseImage_versions2
} from 'instagram-private-api/dist/responses/user.feed.response'

export interface IgPhoto {
  id: string
  image_versions2: UserFeedResponseImage_versions2
  caption: null | UserFeedResponseCaption
  code: string
}

export type IgPhotos = ReadonlyArray<IgPhoto>
