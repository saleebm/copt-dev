import { FC, useState, useEffect, useRef, createElement, Fragment } from 'react'
import figlet from 'figlet'
// @ts-ignore
import computer from 'figlet/importable-fonts/Computer'
import { motion } from 'framer-motion'

import { transitionChildren } from 'utilities/animations/transitions'
import { floatLeft } from 'utilities/animations/variants'
import { Rainbow } from './rainbow'

interface ASCIIProps {
  text?: string
  rainbow?: boolean
  fallback?: string
  font?: figlet.Fonts
  id?: string
  className?: string
}

// adapted from https://github.com/localjo/react-rainbow-ascii
const ASCII: FC<ASCIIProps> = ({
  text = 'meow',
  rainbow = true,
  font = computer,
  fallback = 'pre',
  id,
  className
}) => {
  const [ascii, setAscii] = useState<string>(text)
  const [width, setWidth] = useState<number>(0)
  const [baseFontSize, setBaseFontSize] = useState<number>(16)
  const preWrap = useRef<HTMLDivElement>(null)
  const widthTest = useRef<HTMLPreElement>(null)
  const lines = ascii.split('\n').filter(line => {
    return line.trim().length > 0
  }) || [' ']
  const measuredWidth = widthTest.current ? widthTest.current.offsetWidth : 100
  const lineLength = lines[0] ? lines[0].length : 1
  const measuredFontSize = 100
  const targetFontSize = (measuredFontSize * (width / lineLength)) / measuredWidth
  const fontSize = targetFontSize < baseFontSize ? targetFontSize : baseFontSize

  useEffect(() => {
    figlet.parseFont('Computer', font)
    figlet.text(text, { font: 'Computer' }, (_err, data) => setAscii(data as string))
    const getParentWidth = () => {
      if (preWrap.current) {
        setWidth(preWrap.current.offsetWidth)
        setBaseFontSize(
          parseFloat(window.getComputedStyle(preWrap.current).getPropertyValue('font-size'))
        )
      }
    }
    if (preWrap.current) getParentWidth()
    window.addEventListener('resize', getParentWidth)
    return () => window.removeEventListener('resize', getParentWidth)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preWrap.current, text, font])

  const hasMounted = ascii !== text // If they're equal, figlet hasn't been applied

  const measureStyle: React.CSSProperties = {
    fontSize: `${measuredFontSize}px`,
    position: 'absolute',
    visibility: 'hidden'
  }
  const uniqueClass = `responsive-ascii${id ? `-${id}` : ''}`
  return (
    <motion.div
      ref={preWrap}
      className={`${uniqueClass} ${className}`}
      title={text}
      aria-label={text}
      transition={transitionChildren}
      variants={floatLeft}
    >
      {hasMounted ? (
        <Fragment>{rainbow ? <Rainbow lines={lines} /> : <pre>{ascii}</pre>}</Fragment>
      ) : (
        createElement(fallback, null, [ascii])
      )}
      <pre ref={widthTest} style={measureStyle}>
        &nbsp;
      </pre>

      <style global jsx>{`
        .${uniqueClass} {
          width: 100%;
        }
        .${uniqueClass} pre {
          margin: 0;
          padding: 0;
          font-size: ${fontSize + 3}px;
          line-height: 1;
          display: block;
        }
      `}</style>
    </motion.div>
  )
}

export { ASCII }
