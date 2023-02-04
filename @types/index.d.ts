import type { Song } from '@prisma/client'

declare module '*.svg' {
  const content: any
  export default content
}

declare module '*.png' {
  const content: any
  export default content
}

declare module '*.jpg' {
  const content: any
  export default content
}

declare module '*.jpeg' {
  const content: any
  export default content
}

export type SongParsed = Song & { playedAt: string }

export type CurrentlyPlayingItemProps =
  | {
      href: string
      albumArtUrl: string | null
      albumName: string | null
      name: string
      previewUrl: string | null
      artistName: string
      artistHref: string | null
      progress: number | null
    }
  | Record<string, never>
