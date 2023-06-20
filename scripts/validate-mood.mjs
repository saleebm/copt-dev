// the source of truth 📜
// todo model
const d = {
  Angry: {
    Danceability: '< 0.5',
    Energy: '>= 0.75',
    Tempo: '< 80',
    Valence: '< 0.3'
  },
  Fiery: {
    Danceability: '>= 0.5',
    Energy: '>= 0.7',
    Tempo: '> 60 && < 120',
    Valence: '>= 0.7'
  },
  Lively: {
    Danceability: '>= 0.6',
    Energy: '>= 0.5 && < 0.8',
    Tempo: '>= 100',
    Valence: '>= 0.3 && < 0.8'
  },
  Nervous: {
    Danceability: '<= 0.4',
    Energy: '< 0.6',
    Tempo: '>= 100',
    Valence: '<= 0.5'
  },
  Anxious: {
    Danceability: '<= 0.7',
    Energy: '>= 0.5',
    Tempo: '>= 100',
    Valence: '> 0.2 && <= 0.5'
  },
  Worried: {
    Danceability: '<= 0.4',
    Energy: '<= 0.5',
    Tempo: '> 80',
    Valence: '<= 0.4'
  },
  Concerned: {
    Danceability: '<= 0.5',
    Energy: '< 0.6',
    Tempo: '< 120',
    Valence: '> 0.4 && < 0.7'
  },
  Confused: {
    Danceability: '> 0.5',
    Energy: '<= 0.5',
    Tempo: '<= 100',
    Valence: '> 0.4'
  },
  Amusement: {
    Danceability: '> 0.7',
    Energy: '>= 0.4 && < 0.8',
    Tempo: '> 120',
    Valence: '>= 0.7'
  },
  Afraid: {
    Danceability: '< 0.6',
    Energy: '< 0.6',
    Tempo: '< 120',
    Valence: '< 0.3'
  },
  Peaceful: {
    Danceability: '< 0.5',
    Energy: '<= 0.4',
    Tempo: '<= 90',
    Valence: '>= 0.3'
  },
  Excited: {
    Danceability: '>= 0.7',
    Energy: '>= 0.8',
    Tempo: '>= 120',
    Valence: '>= 0.7'
  },
  Amazed: {
    Danceability: '>= 0.3 && < 0.7',
    Energy: '>= 0.6',
    Tempo: '> 120 && < 140',
    Valence: '>= 0.7'
  },
  Happy: {
    Danceability: '>= 0.7',
    Energy: '< 0.8',
    Tempo: '> 80',
    Valence: '>= 0.5'
  },
  Hopeful: {
    Danceability: '>= 0.5',
    Energy: '>= 0.3 && < 0.7',
    Tempo: '< 120',
    Valence: '< 0.5'
  },
  Easygoing: {
    Danceability: '>= 0.5',
    Energy: '< 0.5',
    Tempo: '< 120',
    Valence: '>= 0.5'
  },
  Brooding: {
    Danceability: '> 0.2 && <= 0.5',
    Energy: '<= 0.5',
    Tempo: '< 80',
    Valence: '<= 0.3'
  },
  Grief: {
    Danceability: '<= 0.4',
    Energy: '<=0.4',
    Tempo: '> 90',
    Valence: '<= 0.3'
  },
  Melancholy: {
    Danceability: '> 0.4',
    Energy: '<= 0.4',
    Tempo: '<= 90',
    Valence: '<= 0.3'
  },
  Serene: {
    Danceability: '< 0.5',
    Energy: '<= 0.4',
    Tempo: '<= 90',
    Valence: '> 0.3 && < 0.7'
  },
  Disappointed: {
    Danceability: '<= 0.5',
    Energy: '<= 0.5',
    Tempo: '< 80',
    Valence: '<= 0.4'
  },
  Upset: {
    Danceability: '<= 0.2',
    Energy: '< 0.6',
    Tempo: '<= 80',
    Valence: '<= 0.3'
  },
  Disdain: {
    Danceability: '<= 0.3',
    Energy: '>= 0.6',
    Tempo: '< 100',
    Valence: '<= 0.4'
  },
  Horrify: {
    Danceability: '<= 0.3',
    Energy: '>= 0.7',
    Tempo: '>= 100',
    Valence: '<= 0.2'
  },
  Mysterious: {
    Danceability: '> 0.3 && <= 0.6',
    Energy: '< 0.6',
    Tempo: '< 100',
    Valence: '<= 0.5'
  },
  Cranky: {
    Danceability: '<= 0.3',
    Energy: '<= 0.5',
    Tempo: '> 80',
    Valence: '<= 0.3'
  }
}

// First, we need to parse the values in each object to extract the comparison operator and the value itself
function parseValue(value) {
  const operator = value.match(/[<>]=?|&&/g)
  const numValue = value.match(/\d+(\.\d+)?/g).map(parseFloat)
  return { operator, numValue }
}

// Next, we need a function to compare two values and see if they overlap
// return true if there is a value that matches both
function valueOverlap(v1, v2) {
  // Check if either object has "&&" in its operator array
  const v1HasAnd = v1.operator.includes('&&')
  const v2HasAnd = v2.operator.includes('&&')

  // If v1 has "&&", split it into 2 values
  let v1Values = []
  if (v1HasAnd) {
    const andIndex = v1.operator.indexOf('&&')
    const lowerValue = v1.numValue[andIndex]
    const upperValue = v1.numValue[andIndex + 1]
    v1Values.push(lowerValue, upperValue)
  } else {
    v1Values.push(v1.numValue[0])
  }

  // If v2 has "&&", split it into 2 values
  let v2Values = []
  if (v2HasAnd) {
    const andIndex = v2.operator.indexOf('&&')
    const lowerValue = v2.numValue[andIndex]
    const upperValue = v2.numValue[andIndex + 1]
    v2Values.push(lowerValue, upperValue)
  } else {
    v2Values.push(v2.numValue[0])
  }

  // Determine highest or lowest possibility for x for v1
  let x1
  if (v1.operator[0] === '<=') {
    x1 = v1.numValue[0]
  } else if (v1.operator[0] === '<') {
    x1 = v1.numValue[0] - 0.01
  } else if (v1.operator[0] === '>=') {
    x1 = v1.numValue[0] + 0.01
  } else if (v1.operator[0] === '>') {
    x1 = v1.numValue[0]
  }

  // Determine if x1 satisfies v2
  let satisfiesV2 = false
  if (v2HasAnd) {
    const lowerValue = v2Values[0]
    const upperValue = v2Values[1]
    if (x1 > lowerValue && x1 < upperValue) {
      satisfiesV2 = true
    }
  } else {
    if (v2.operator[0] === '<=' && x1 <= v2.numValue[0]) {
      satisfiesV2 = true
    } else if (v2.operator[0] === '<' && x1 < v2.numValue[0]) {
      satisfiesV2 = true
    } else if (v2.operator[0] === '>=' && x1 >= v2.numValue[0]) {
      satisfiesV2 = true
    } else if (v2.operator[0] === '>' && x1 > v2.numValue[0]) {
      satisfiesV2 = true
    }
  }

  // Determine if x1 satisfies v1 and v2
  let satisfiesV1 = false
  if (v1HasAnd) {
    const lowerValue = v1Values[0]
    const upperValue = v1Values[1]
    if (x1 > lowerValue && x1 < upperValue) {
      satisfiesV1 = true
    }
  } else {
    if (v1.operator[0] === '<=' && x1 <= v1.numValue[0]) {
      satisfiesV1 = true
    } else if (v1.operator[0] === '<' && x1 < v1.numValue[0]) {
      satisfiesV1 = true
    } else if (v1.operator[0] === '>=' && x1 >= v1.numValue[0]) {
      satisfiesV1 = true
    } else if (v1.operator[0] === '>' && x1 > v1.numValue[0]) {
      satisfiesV1 = true
    }
  }

  // If both objects have "&&", check if x1 satisfies both bounds
  if (v1HasAnd && v2HasAnd) {
    const v1Lower = v1Values[0]
    const v1Upper = v1Values[1]
    const v2Lower = v2Values[0]
    const v2Upper = v2Values[1]
    if (x1 > v1Lower && x1 < v1Upper && x1 > v2Lower && x1 < v2Upper) {
      satisfiesV1 = true
      satisfiesV2 = true
    } else {
      satisfiesV1 = false
      satisfiesV2 = false
    }
  }

  return satisfiesV1 && satisfiesV2
}

let totalOverlap = 0
// Now we can loop through each key in the object and compare the values for each pair of objects
for (let key1 in d) {
  for (let key2 in d) {
    if (key1 !== key2) {
      let overlap = [] // if four overlaps, then we got a match!
      let log = []
      for (let prop in d[key1]) {
        if (d[key2][prop]) {
          const value1 = parseValue(d[key1][prop])
          const value2 = parseValue(d[key2][prop])
          if (valueOverlap(value1, value2)) {
            overlap = [...overlap, true]
            log.push(`${prop}\n${value1.operator + ' ' + value1.numValue} \n${value2.operator + ' ' + value2.numValue}`)
          }
        }
      }
      if (overlap.length > 3) {
        totalOverlap += 1
        console.log('---------')
        console.log(`${key1} and ${key2} have overlapping values`)
        log.forEach(l => console.error(l))
        console.log('---------')
      }
    }
  }
}

console.log(`total overlapping: ${totalOverlap}`)
