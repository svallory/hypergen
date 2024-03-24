import { metaverse } from './metaverse-utils'
const enquirer = require('enquirer')

const failPrompt = () => {
  throw new Error('set up prompt in testing')
}

describe('metaverse', () => {
  beforeEach(() => {
    enquirer.prompt = failPrompt
  })

  metaverse('hygen-defaults', [['use-defaults']], { overwrite: true })
})

export { metaverse }
