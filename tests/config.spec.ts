import { describe, it, expect } from 'bun:test'
import path from 'node:path'
import { reversePathsToWalk } from '~/config.js'

const { sep } = path

describe("config lookup with separator '/'", () => {
  it('sanitizes bad "from" path', () => {
    const from = '/foo/bar/'
    const result = reversePathsToWalk({ folder: from, path })
    expect(result).toEqual(['/foo/bar', '/foo', '/'])
  })

  it('looks up configuration upwards', () => {
    const from = '/foo/bar'
    const result = reversePathsToWalk({ folder: from, path })
    expect(result).toEqual(['/foo/bar', '/foo', '/'])
  })

  it('looks up windows folders', () => {
    const from = `C:${sep}foo${sep}bar`
    const result = reversePathsToWalk({ folder: from, path })
    if (sep === '\\\\') {
      expect(result).toEqual([`C:${sep}foo${sep}bar`, `C:${sep}foo`, `C:${sep}`])
    }
  })
})
