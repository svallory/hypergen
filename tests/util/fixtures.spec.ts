import { describe, it, expect } from 'bun:test'
import fs from 'fs-extra'
import path from 'node:path'
import {
  fixture,
  fixtureFor,
  templateFixture,
  fixtureExists,
  listFixtures,
  withTempFixtures,
  copyFixture
} from './fixtures.js'

describe('fixture helpers', () => {
  describe('fixture()', () => {
    it('should resolve fixture paths', () => {
      const fixturePath = fixture('app/new.ejs.t')
      expect(fixturePath).toContain('fixtures/app/new.ejs.t')
    })

    it('should resolve fixture paths with base directory', () => {
      const fixturePath = fixture('new.ejs.t', { base: 'app' })
      expect(fixturePath).toContain('fixtures/app/new.ejs.t')
    })

    it('should read fixture content when read option is true', () => {
      const content = fixture('empty.ejs.t', { read: true })
      expect(content).toBeDefined()
      expect(typeof content).toBe('string')
    })
  })

  describe('fixtureFor()', () => {
    it('should create specialized fixture functions', () => {
      const appFix = fixtureFor('app')
      const fixturePath = appFix('new.ejs.t')
      expect(fixturePath).toContain('fixtures/app/new.ejs.t')
    })
  })

  describe('templateFixture()', () => {
    it('should resolve template fixtures', () => {
      const fixturePath = templateFixture('app')
      expect(fixturePath).toContain('fixtures/templates/app')
    })
  })

  describe('fixtureExists()', () => {
    it('should return true for existing fixtures', () => {
      expect(fixtureExists('empty.ejs.t')).toBe(true)
    })

    it('should return false for non-existing fixtures', () => {
      expect(fixtureExists('non-existent.txt')).toBe(false)
    })
  })

  describe('listFixtures()', () => {
    it('should list fixtures in a directory', () => {
      const fixtures = listFixtures('app')
      expect(Array.isArray(fixtures)).toBe(true)
      expect(fixtures.length).toBeGreaterThan(0)
    })

    it('should return empty array for non-existent directory', () => {
      const fixtures = listFixtures('non-existent')
      expect(fixtures).toEqual([])
    })
  })

  describe('withTempFixtures()', () => {
    it('should create and cleanup temporary fixtures', async () => {
      const { path: tempPath, cleanup } = await withTempFixtures(async (dir) => {
        await fs.writeFile(path.join(dir, 'test.txt'), 'hello')
      })

      // Verify temp directory exists and has our file
      expect(fs.existsSync(tempPath)).toBe(true)
      expect(fs.existsSync(path.join(tempPath, 'test.txt'))).toBe(true)

      // Cleanup
      cleanup()

      // Verify cleanup worked
      expect(fs.existsSync(tempPath)).toBe(false)
    })

    it('should handle errors during setup', async () => {
      expect(async () => {
        await withTempFixtures(async () => {
          throw new Error('Setup failed')
        })
      }).toThrow()
    })
  })

  describe('copyFixture()', () => {
    it('should copy fixtures to destination', async () => {
      const { path: tempPath, cleanup } = await withTempFixtures(async (dir) => {
        await copyFixture('empty.ejs.t', path.join(dir, 'copied.ejs.t'))
        
        expect(fs.existsSync(path.join(dir, 'copied.ejs.t'))).toBe(true)
      })
      
      cleanup()
    })
  })
})