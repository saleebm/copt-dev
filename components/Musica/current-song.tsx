import type { CurrentlyPlayingItemProps } from '@types'
import { useMemo } from 'react'
import useSWR from 'swr'
import { motion } from 'framer-motion'

import { CURRENTLY_PLAYED_URL } from 'config/routes'
import { floatLeft } from 'utilities/animations/variants'
import { transitionChildren } from 'utilities/animations/transitions'
import { Track } from './track'

async function fetcher(url: string) {
  const res = await fetch(url, { method: 'GET' })
  if (res.status === 200) {
    return await res.json()
  } else {
    console.error(`status=${res.status} statusCode=${res.statusText} res="${await res.text()}"`)
  }
  return null
}

export function CurrentSong({
  fallback
}: {
  fallback: { [CURRENTLY_PLAYED_URL]: CurrentlyPlayingItemProps }
}): JSX.Element {
  // todo handle error
  const { data: currentlyPlaying } = useSWR<CurrentlyPlayingItemProps | null>(
    CURRENTLY_PLAYED_URL,
    fetcher,
    { fallback }
  )

  return useMemo(
    () => (
      <motion.div
        className={'musica-current-wrap'}
        variants={floatLeft}
        transition={transitionChildren}
      >
        {!!currentlyPlaying ? (
          <Track item={currentlyPlaying} />
        ) : (
          <p className={'not-playing'}>Nothing playing 🤫</p>
        )}
      </motion.div>
    ),
    [currentlyPlaying]
  )
}
