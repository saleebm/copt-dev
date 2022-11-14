import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { CatData } from 'lib/models/cats'
import backupKitty from 'public/static/images/kitty/image000000.jpg'

interface KittyProps {
  meowData?: CatData | null
}

export function KittyComponent({ meowData }: KittyProps) {
  // fuck why did I over engineer a kitty component!?
  const [cat, setCat] = useState<CatData | null>(() =>
    // server side meow
    typeof meowData === 'object' ? meowData : null
  )
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    const fetchKitty = async () => {
      let catData = await fetch('/api/v1/cats/get-meow')
      catData = await catData.json()
      if (catData) {
        setCat(catData as unknown as CatData)
        console.table(catData)
      }
    }
    ;(async function () {
      try {
        let fetchInterval = 10000
        if (process.env.NODE_ENV === 'development') {
          fetchInterval = 120000
        }
        await fetchKitty()
        intervalRef.current = setInterval(() => {
          fetchKitty()
        }, fetchInterval)
      } catch (e) {
        console.error(e)
      }
    })()
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return useMemo(
    () => (
      <div className='image-wrapper my-3'>
        <Image
          src={cat?.url ?? backupKitty}
          blurDataURL={backupKitty?.blurDataURL}
          unoptimized
          width={420}
          height={420}
          alt={'kitty'}
          style={{
            objectFit: 'contain'
          }}
        />
      </div>
    ),
    [cat?.url]
  )
}
