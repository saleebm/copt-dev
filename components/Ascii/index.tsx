import { FC, useState, useEffect, useRef, createElement, Fragment } from 'react'
import figlet from 'figlet'
// @ts-ignore
import computer from 'figlet/importable-fonts/Computer'

interface ASCIIProps {
  text?: string
  rainbow?: boolean
  fallback?: string
  font?: figlet.Fonts
  id?: string
  className?: string
}

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
  const Rainbow: FC = () => {
    const lineColors = lines.map((_line, line) => {
      return Array.from('rbg').map((_c, rbgi) => getPhaseRBG(line, (rbgi * Math.PI * 2) / 3))
    })
    function getPhaseRBG(rbgi: number, phase: number) {
      return Math.floor(Math.sin((Math.PI / lines.length) * 2 * rbgi + phase) * 127) + 128
    }
    return (
      <Fragment>
        {lines.map((line, i) => {
          const [red, blue, green] = lineColors[i]
          return (
            <pre key={i} style={{ color: `rgb(${red},${green},${blue})` }}>
              {line}
            </pre>
          )
        })}
      </Fragment>
    )
  }
  const measureStyle: React.CSSProperties = {
    fontSize: `${measuredFontSize}px`,
    position: 'absolute',
    visibility: 'hidden'
  }
  const uniqueClass = `responsive-ascii${id ? `-${id}` : ''}`
  return (
    <div ref={preWrap} className={`${uniqueClass} ${className}`} title={text} aria-label={text}>
      {hasMounted ? (
        <Fragment>
          <style>{`.${uniqueClass} {width: 100%;} .${uniqueClass} pre {margin: 0; padding: 0; font-size: ${fontSize}px; line-height: 1.1;}`}</style>
          {rainbow ? <Rainbow /> : <pre>{ascii}</pre>}
        </Fragment>
      ) : (
        createElement(fallback, null, [ascii])
      )}
      <pre ref={widthTest} style={measureStyle}>
        &nbsp;
      </pre>
    </div>
  )
}

export { ASCII }
