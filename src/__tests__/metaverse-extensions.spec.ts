import { metaverse } from './metaverse-utils'
const enquirer = require('enquirer')

const failPrompt = () => {
  throw new Error('set up prompt in testing')
}

describe('metaverse', () => {
  beforeEach(() => {
    enquirer.prompt = failPrompt
  })

  metaverse('hygen-extension', [['hygen-js', 'new']], { overwrite: true })
})

export { metaverse }
