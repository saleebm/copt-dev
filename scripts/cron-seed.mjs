// @ts-check

import { queueSentimentAnalysis } from './seed.mjs'

queueSentimentAnalysis(true)
  .then(total => {
    console.log('done. total: ' + total)
  })
  .catch(e => {
    console.error(e)
  })
