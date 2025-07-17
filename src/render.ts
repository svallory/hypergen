import path from 'node:path'
import fs from 'fs-extra'
import ejs from 'ejs'
import fm from 'front-matter'
import walk from 'ignore-walk'
import createDebug from 'debug'
import type { RenderedAction, RunnerConfig } from './types.js'
import context from './context.js'
import { initializeTemplateEnginesWithPlugins, getTemplateEngineForFile, getDefaultTemplateEngine } from './template-engines/index.js'
const debug = createDebug('hygen:render')

// Initialize template engines on module load (will be enhanced with plugin support)
let templateEnginesInitialized = false
const initializeTemplateEngines = async () => {
  if (!templateEnginesInitialized) {
    await initializeTemplateEnginesWithPlugins()
    templateEnginesInitialized = true
  }
}

// for some reason lodash/fp takes 90ms to load.
// inline what we use here with the regular lodash.
const map = (f) => (arr) => arr.map(f)
const filter = (f) => (arr) => arr.filter(f)

const ignores = [
  'prompt.js',
  'index.js',
  'prompt.ts',
  'index.ts',
  '.hypergenignore',
  '.DS_Store',
  '.Spotlight-V100',
  '.Trashes',
  'ehthumbs.db',
  'Thumbs.db',
]
const renderTemplate = async (tmpl, locals, config, filePath?: string) => {
  if (typeof tmpl !== 'string') {
    return tmpl
  }

  const ctx = context(locals, config)
  
  // Determine template engine based on file extension
  if (filePath) {
    const ext = path.extname(filePath)
    const engine = getTemplateEngineForFile(ext)
    
    if (engine) {
      debug('Using template engine: %s for file: %s', engine.name, filePath)
      return await engine.render(tmpl, ctx)
    }
  }
  
  // Try to detect template engine from content
  if (tmpl.includes('{{') && tmpl.includes('}}')) {
    // Likely LiquidJS template
    const liquidEngine = getTemplateEngineForFile('.liquid')
    if (liquidEngine) {
      debug('Auto-detected LiquidJS template')
      return await liquidEngine.render(tmpl, ctx)
    }
  }
  
  // Default to EJS for backward compatibility
  debug('Using EJS template engine (fallback)')
  return ejs.render(tmpl, ctx)
}

async function getFiles(dir) {
  const files = walk
    .sync({ path: dir, ignoreFiles: ['.hypergenignore'] })
    .map((f) => path.join(dir, f))
  return files
}

const render = async (
  args: any,
  config: RunnerConfig,
): Promise<RenderedAction[]> => {
  // Ensure template engines are initialized
  await initializeTemplateEngines()
  
  if (!args.actionFolder) {
    return []
  }
  return getFiles(args.actionFolder)
    .then((things) => things.sort((a, b) => a.localeCompare(b))) // TODO: add a test to verify this sort
    .then(filter((f) => !ignores.find((ig) => f.endsWith(ig)))) // TODO: add a
    // test for ignoring prompt.js and index.js
    .then(
      filter((file) =>
        args.subAction
          ? file.replace(args.actionFolder, '').match(args.subAction)
          : true,
      ),
    )
    .then(
      map((file) =>
        fs.readFile(file).then((text) => ({ file, text: text.toString() })),
      ),
    )
    .then((_) => Promise.all(_))
    .then(
      map(({ file, text }) => {
        debug('Pre-formatting file: %o', file)
        return { file, ...(fm as any)(text, { allowUnsafe: true }) }
      }),
    )
    .then(
      map(async ({ file, attributes, body }) => {
        const renderedAttrs = {}
        for (const [key, value] of Object.entries(attributes)) {
          renderedAttrs[key] = await renderTemplate(value, args, config, file)
        }
        debug('Rendering file: %o', file)
        return {
          file,
          attributes: renderedAttrs,
          body: await renderTemplate(
            body,
            { ...args, attributes: renderedAttrs },
            config,
            file,
          ),
        }
      }),
    )
    .then((_) => Promise.all(_))
}

export default render
