import { describe, it, expect } from 'bun:test'
import render from '~/render.js'
import { appFixture } from './util/fixtures.js'

describe('render', () => {
  it('should return an empty array if no action folder is provided', async () => {
    const result = await render({ actionFolder: null }, {})
    expect(result).toEqual([])
  })
})
