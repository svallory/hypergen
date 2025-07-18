import { GeneratorScaffolding } from '../src/cli/scaffolding'
import { beforeEach, afterEach, describe, it, expect } from 'bun:test'
import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'

describe('GeneratorScaffolding', () => {
  let scaffolding: GeneratorScaffolding
  let tempDir: string
  
  beforeEach(() => {
    scaffolding = new GeneratorScaffolding()
    tempDir = fs.mkdtempSync(path.join(tmpdir(), 'hypergen-scaffold-test-'))
  })
  
  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  describe('initGenerator', () => {
    it('should create a basic generator with actions and template', async () => {
      const result = await scaffolding.initGenerator({
        name: 'test-generator',
        description: 'Test generator',
        category: 'test',
        author: 'Test Author',
        directory: tempDir,
        type: 'both',
        framework: 'generic',
        withExamples: true,
        withTests: true
      })

      expect(result.success).toBe(true)
      expect(result.filesCreated).toBeDefined()
      expect(result.filesCreated!.length).toBeGreaterThan(0)

      // Check that files were created
      const generatorDir = path.join(tempDir, 'test-generator')
      expect(fs.existsSync(generatorDir)).toBe(true)
      expect(fs.existsSync(path.join(generatorDir, 'actions.ts'))).toBe(true)
      expect(fs.existsSync(path.join(generatorDir, 'template.yml'))).toBe(true)
      expect(fs.existsSync(path.join(generatorDir, 'README.md'))).toBe(true)
      expect(fs.existsSync(path.join(generatorDir, 'test-generator.test.ts'))).toBe(true)
    })

    it('should create React component generator', async () => {
      const result = await scaffolding.initGenerator({
        name: 'react-widget',
        description: 'React widget generator',
        category: 'react',
        author: 'Test Author',
        directory: tempDir,
        type: 'both',
        framework: 'react',
        withExamples: true,
        withTests: true
      })

      expect(result.success).toBe(true)

      // Check React-specific files
      const generatorDir = path.join(tempDir, 'react-widget')
      expect(fs.existsSync(path.join(generatorDir, 'templates', 'component.tsx.ejs'))).toBe(true)
      expect(fs.existsSync(path.join(generatorDir, 'templates', 'component.test.tsx.ejs'))).toBe(true)
      expect(fs.existsSync(path.join(generatorDir, 'templates', 'component.stories.tsx.ejs'))).toBe(true)

      // Check actions.ts content
      const actionsContent = fs.readFileSync(path.join(generatorDir, 'actions.ts'), 'utf-8')
      expect(actionsContent).toContain('react-widget')
      expect(actionsContent).toContain('type: \'enum\'')
      expect(actionsContent).toContain('functional')
      expect(actionsContent).toContain('withProps')
      expect(actionsContent).toContain('withStorybook')
    })

    it('should create API endpoint generator', async () => {
      const result = await scaffolding.initGenerator({
        name: 'api-endpoint',
        description: 'API endpoint generator',
        category: 'api',
        author: 'Test Author',
        directory: tempDir,
        type: 'both',
        framework: 'api',
        withExamples: true,
        withTests: false
      })

      expect(result.success).toBe(true)

      // Check API-specific files
      const generatorDir = path.join(tempDir, 'api-endpoint')
      expect(fs.existsSync(path.join(generatorDir, 'templates', 'route.ts.ejs'))).toBe(true)
      expect(fs.existsSync(path.join(generatorDir, 'templates', 'route.test.ts.ejs'))).toBe(true)
      expect(fs.existsSync(path.join(generatorDir, 'templates', 'model.ts.ejs'))).toBe(true)

      // Check template.yml content
      const templateContent = fs.readFileSync(path.join(generatorDir, 'template.yml'), 'utf-8')
      expect(templateContent).toContain('method:')
      expect(templateContent).toContain('withAuth:')
      expect(templateContent).toContain('withValidation:')
      expect(templateContent).toContain('values: ["GET","POST","PUT","DELETE","PATCH"]')
    })

    it('should create action-only generator', async () => {
      const result = await scaffolding.initGenerator({
        name: 'action-only',
        description: 'Action-only generator',
        directory: tempDir,
        type: 'action',
        framework: 'generic',
        withExamples: false,
        withTests: false
      })

      expect(result.success).toBe(true)

      const generatorDir = path.join(tempDir, 'action-only')
      expect(fs.existsSync(path.join(generatorDir, 'actions.ts'))).toBe(true)
      expect(fs.existsSync(path.join(generatorDir, 'template.yml'))).toBe(false)
      expect(fs.existsSync(path.join(generatorDir, 'README.md'))).toBe(true)
    })

    it('should create template-only generator', async () => {
      const result = await scaffolding.initGenerator({
        name: 'template-only',
        description: 'Template-only generator',
        directory: tempDir,
        type: 'template',
        framework: 'generic',
        withExamples: false,
        withTests: false
      })

      expect(result.success).toBe(true)

      const generatorDir = path.join(tempDir, 'template-only')
      expect(fs.existsSync(path.join(generatorDir, 'actions.ts'))).toBe(false)
      expect(fs.existsSync(path.join(generatorDir, 'template.yml'))).toBe(true)
      expect(fs.existsSync(path.join(generatorDir, 'README.md'))).toBe(true)
    })
  })

  describe('initWorkspace', () => {
    it('should create workspace with examples', async () => {
      const result = await scaffolding.initWorkspace({
        directory: tempDir,
        withExamples: true
      })

      expect(result.success).toBe(true)
      expect(result.filesCreated).toBeDefined()
      expect(result.filesCreated!.length).toBeGreaterThan(0)

      // Check workspace files
      expect(fs.existsSync(path.join(tempDir, 'hypergen.config.js'))).toBe(true)
      expect(fs.existsSync(path.join(tempDir, 'README.md'))).toBe(true)

      // Check example generators
      expect(fs.existsSync(path.join(tempDir, 'component'))).toBe(true)
      expect(fs.existsSync(path.join(tempDir, 'api-route'))).toBe(true)
      expect(fs.existsSync(path.join(tempDir, 'util-function'))).toBe(true)

      // Check example generator files
      expect(fs.existsSync(path.join(tempDir, 'component', 'actions.ts'))).toBe(true)
      expect(fs.existsSync(path.join(tempDir, 'component', 'template.yml'))).toBe(true)
      expect(fs.existsSync(path.join(tempDir, 'api-route', 'actions.ts'))).toBe(true)
      expect(fs.existsSync(path.join(tempDir, 'api-route', 'template.yml'))).toBe(true)
      expect(fs.existsSync(path.join(tempDir, 'util-function', 'actions.ts'))).toBe(true)
      expect(fs.existsSync(path.join(tempDir, 'util-function', 'template.yml'))).toBe(true)
    })

    it('should create workspace without examples', async () => {
      const result = await scaffolding.initWorkspace({
        directory: tempDir,
        withExamples: false
      })

      expect(result.success).toBe(true)

      // Check workspace files
      expect(fs.existsSync(path.join(tempDir, 'hypergen.config.js'))).toBe(true)
      expect(fs.existsSync(path.join(tempDir, 'README.md'))).toBe(true)

      // Check that no example generators were created
      expect(fs.existsSync(path.join(tempDir, 'component'))).toBe(false)
      expect(fs.existsSync(path.join(tempDir, 'api-route'))).toBe(false)
      expect(fs.existsSync(path.join(tempDir, 'util-function'))).toBe(false)
    })
  })

  describe('template content validation', () => {
    it('should generate valid EJS templates', async () => {
      const result = await scaffolding.initGenerator({
        name: 'test-template',
        directory: tempDir,
        type: 'both',
        framework: 'react',
        withExamples: true,
        withTests: true
      })

      expect(result.success).toBe(true)

      const templateDir = path.join(tempDir, 'test-template', 'templates')
      const componentTemplate = fs.readFileSync(path.join(templateDir, 'component.tsx.ejs'), 'utf-8')
      
      // Check for valid EJS syntax
      expect(componentTemplate).toContain('<%=')
      expect(componentTemplate).toContain('---')
      expect(componentTemplate).toContain('to:')
      expect(componentTemplate).toContain('React.FC')
      expect(componentTemplate).toContain('export default')
    })

    it('should generate valid template.yml', async () => {
      const result = await scaffolding.initGenerator({
        name: 'test-yaml',
        directory: tempDir,
        type: 'template',
        framework: 'vue',
        withExamples: true,
        withTests: false
      })

      expect(result.success).toBe(true)

      const templateYml = fs.readFileSync(path.join(tempDir, 'test-yaml', 'template.yml'), 'utf-8')
      
      // Check for valid YAML structure
      expect(templateYml).toContain('name: test-yaml')
      expect(templateYml).toContain('variables:')
      expect(templateYml).toContain('examples:')
      expect(templateYml).toContain('type: enum')
      expect(templateYml).toContain('sfc')
      expect(templateYml).toContain('composition')
      expect(templateYml).toContain('options')
    })
  })
})