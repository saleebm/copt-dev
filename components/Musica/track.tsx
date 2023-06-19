import type { CurrentlyPlayingItemProps, SongParsed } from '@types'
import Image from 'next/image'
import AudioPlayer from 'react-h5-audio-player'
import 'react-h5-audio-player/lib/styles.css'

class SentimentData {
  color: string | null = null
  mood: string | null = ''

  constructor(item: SongParsed | CurrentlyPlayingItemProps) {
    if ('sentimentBar' in item && item.sentimentBar.musicSentimentAnalysis) {
      this.color = item.sentimentBar.musicSentimentAnalysis.color
      this.mood = item.sentimentBar.musicSentimentAnalysis.mood
    }
  }

  getMood() {
    if (!!this.mood) return `🌈🌈 ${this.mood} 🦄🦄`
    else return ''
  }

  rgba() {
    if (!!this.color) {
      try {
        return this.hexToRgba(this.color, 30)
      } catch (e) {
        console.error('unable to parse hex', this.color)
      }
    }
    return 'rgba(0, 0, 0, 0)'
  }

  private hexToRgba(hex: string, transparency: number) {
    // Remove the '#' character from the hex color
    hex = hex.replace('#', '')

    // Convert the hex color to RGB values
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    // Calculate the alpha value based on the transparency percentage
    const alpha = transparency / 100

    // Return the RGBA color string
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
}

export function Track({ item }: { item: SongParsed | CurrentlyPlayingItemProps }) {
  const sentimentData = new SentimentData(item)
  return (
    <figure
      className={'song-item'}
      style={{
        backgroundColor: sentimentData.rgba()
      }}
    >
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
        <p className={'text-sm'}>{sentimentData.getMood()}</p>
      </figcaption>
    </figure>
  )
}
