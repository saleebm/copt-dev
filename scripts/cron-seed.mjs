// @ts-check

import { seed } from './seed.mjs'

seed()
  .then(total => {
    console.log('done. total: ' + total)
  })
  .catch(e => {
    console.error(e)
  })
