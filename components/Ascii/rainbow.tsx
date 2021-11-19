export const Rainbow = ({ lines, className }: { lines: string[]; className?: string }) => {
  const lineColors = lines.map((_line, line) => {
    return Array.from('rbg').map((_c, rbgi) => getPhaseRBG(line, (rbgi * Math.PI * 2) / 3))
  })
  function getPhaseRBG(rbgi: number, phase: number) {
    return Math.floor(Math.sin((Math.PI / lines.length) * 2 * rbgi + phase) * 127) + 128
  }
  return (
    <>
      {lines.map((line, i) => {
        const [red, blue, green] = lineColors[i]
        return (
          <pre className={className} key={i} style={{ color: `rgb(${red},${green},${blue})` }}>
            {line}
          </pre>
        )
      })}
    </>
  )
}
