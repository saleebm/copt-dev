import type { CurrentlyPlayingItemProps, SongParsed } from '@types'
import Image from 'next/image'
import AudioPlayer from 'react-h5-audio-player'
import 'react-h5-audio-player/lib/styles.css'

export function Track({ item }: { item: SongParsed | CurrentlyPlayingItemProps }) {
  return (
    <figure className={'song-item'}>
      {!!item.albumArtUrl ? (
        <div className={'song-image-wrap'}>
          <a
            className={'song-image-link'}
            rel={'noreferrer'}
            target={'_blank'}
            href={`${item.href}`}
          >
            <Image
              className={'song-image'}
              width={320}
              height={320}
              src={item.albumArtUrl}
              alt={`album art for ${item.albumName} ${item.name}`}
            />
          </a>
          <div className={'play-bar'}>
            <AudioPlayer autoPlay={false} src={`${item.previewUrl}`} />
          </div>
        </div>
      ) : /*todo placeholder*/ null}
      <figcaption>
        <p className={'lead'}>
          <a
            className={'song-text-link'}
            rel={'noreferrer'}
            target={'_blank'}
            href={`${item.href}`}
          >
            {item.name}
          </a>
        </p>
        <p>
          <a
            className={'song-text-link secondary-color'}
            rel={'noreferrer'}
            target={'_blank'}
            href={`${item.artistHref}`}
          >
            {item.artistName}
          </a>
        </p>
        <p className={'text-sm'}>{'playedAt' in item && `⏰ ${item.playedAt}`}</p>
      </figcaption>
    </figure>
  )
}
