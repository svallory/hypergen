import { ErrorHandler, ErrorCode, HypergenError } from '../src/errors/hypergen-errors'
import { describe, it, expect } from 'bun:test'

describe('Error Handling System', () => {
  describe('ErrorHandler', () => {
    it('should create basic error with code and message', () => {
      const error = ErrorHandler.createError(
        ErrorCode.ACTION_NOT_FOUND,
        'Test action not found'
      )

      expect(error).toBeInstanceOf(HypergenError)
      expect(error.code).toBe(ErrorCode.ACTION_NOT_FOUND)
      expect(error.message).toBe('Test action not found')
      expect(error.isUserError).toBe(true)
      expect(error.severity).toBe('medium')
    })

    it('should create error with context', () => {
      const error = ErrorHandler.createError(
        ErrorCode.TEMPLATE_INVALID_SYNTAX,
        'Template syntax error',
        { file: 'test.yml', line: 10, column: 5 }
      )

      expect(error.context.file).toBe('test.yml')
      expect(error.context.line).toBe(10)
      expect(error.context.column).toBe(5)
    })

    it('should create error with suggestions', () => {
      const suggestions = [
        {
          title: 'Check file path',
          description: 'Verify the file exists'
        },
        {
          title: 'Run command',
          description: 'Try this command',
          command: 'hypergen list'
        }
      ]

      const error = ErrorHandler.createError(
        ErrorCode.FILE_NOT_FOUND,
        'File not found',
        {},
        suggestions
      )

      expect(error.suggestions).toHaveLength(2)
      expect(error.suggestions[0].title).toBe('Check file path')
      expect(error.suggestions[1].command).toBe('hypergen list')
    })

    it('should format error for CLI display', () => {
      const error = ErrorHandler.createError(
        ErrorCode.ACTION_NOT_FOUND,
        'Action not found',
        { action: 'test-action' },
        [
          {
            title: 'List available actions',
            description: 'See all available actions',
            command: 'hypergen list'
          }
        ]
      )

      const formatted = ErrorHandler.formatError(error)

      expect(formatted).toContain('❌ Action not found')
      expect(formatted).toContain('Code: ACTION_NOT_FOUND')
      expect(formatted).toContain('Action: test-action')
      expect(formatted).toContain('💡 Suggestions:')
      expect(formatted).toContain('List available actions')
      expect(formatted).toContain('$ hypergen list')
    })

    it('should handle unknown errors', () => {
      const jsError = new Error('JavaScript error')
      const formatted = ErrorHandler.handleError(jsError)

      expect(formatted).toContain('❌ JavaScript error')
      expect(formatted).toContain('💡 Suggestions:')
    })

    it('should handle file system errors', () => {
      const enoentError = new Error('ENOENT: no such file or directory, open \'/path/to/file.txt\'')
      const formatted = ErrorHandler.handleError(enoentError)

      expect(formatted).toContain('❌')
      expect(formatted).toContain('File: /path/to/file.txt')
      expect(formatted).toContain('💡 Suggestions:')
    })

    it('should handle permission errors', () => {
      const eaccesError = new Error('EACCES: permission denied, open \'/protected/file.txt\'')
      const formatted = ErrorHandler.handleError(eaccesError)

      expect(formatted).toContain('❌')
      expect(formatted).toContain('File: /protected/file.txt')
      expect(formatted).toContain('💡 Suggestions:')
      expect(formatted).toContain('Check file permissions')
    })
  })

  describe('Specialized Error Creation', () => {
    it('should create action not found error', () => {
      const error = ErrorHandler.createActionNotFoundError('missing-action')

      expect(error.code).toBe(ErrorCode.ACTION_NOT_FOUND)
      expect(error.message).toContain('missing-action')
      expect(error.context.action).toBe('missing-action')
      expect(error.suggestions.length).toBeGreaterThan(0)
      expect(error.suggestions.some(s => s.command === 'hypergen list')).toBe(true)
    })

    it('should create parameter error', () => {
      const error = ErrorHandler.createParameterError(
        'name',
        'invalid-value',
        'string matching pattern ^[a-zA-Z]+$',
        'create-component'
      )

      expect(error.code).toBe(ErrorCode.ACTION_INVALID_PARAM_VALUE)
      expect(error.context.parameter).toBe('name')
      expect(error.context.value).toBe('invalid-value')
      expect(error.context.expected).toBe('string matching pattern ^[a-zA-Z]+$')
      expect(error.context.action).toBe('create-component')
    })

    it('should create template error', () => {
      const error = ErrorHandler.createTemplateError(
        'template.yml',
        15,
        20,
        'Invalid YAML syntax'
      )

      expect(error.code).toBe(ErrorCode.TEMPLATE_INVALID_SYNTAX)
      expect(error.context.file).toBe('template.yml')
      expect(error.context.line).toBe(15)
      expect(error.context.column).toBe(20)
      expect(error.message).toContain('Invalid YAML syntax')
    })

    it('should create file operation error', () => {
      const error = ErrorHandler.createFileError(
        'write',
        '/path/to/file.txt',
        'permission denied'
      )

      expect(error.code).toBe(ErrorCode.FILE_PERMISSION_DENIED)
      expect(error.context.file).toBe('/path/to/file.txt')
      expect(error.message).toContain('write')
      expect(error.message).toContain('permission denied')
    })
  })

  describe('Error Formatting', () => {
    it('should format error with complete context', () => {
      const error = new HypergenError(
        ErrorCode.TEMPLATE_INVALID_SYNTAX,
        'Template validation failed',
        {
          file: 'component.yml',
          line: 10,
          column: 5,
          action: 'create-component',
          parameter: 'name',
          expected: 'string',
          received: 'number'
        },
        [
          {
            title: 'Fix template syntax',
            description: 'Check the YAML syntax',
            command: 'hypergen template validate component.yml'
          },
          {
            title: 'Read documentation',
            description: 'Learn about template syntax',
            url: 'https://hypergen.dev/docs/templates'
          }
        ]
      )

      const formatted = ErrorHandler.formatError(error)

      expect(formatted).toContain('❌ Template validation failed')
      expect(formatted).toContain('Code: TEMPLATE_INVALID_SYNTAX')
      expect(formatted).toContain('File: component.yml:10:5')
      expect(formatted).toContain('Action: create-component')
      expect(formatted).toContain('Parameter: name')
      expect(formatted).toContain('Expected: string')
      expect(formatted).toContain('Received: number')
      expect(formatted).toContain('💡 Suggestions:')
      expect(formatted).toContain('1. Fix template syntax')
      expect(formatted).toContain('$ hypergen template validate component.yml')
      expect(formatted).toContain('2. Read documentation')
      expect(formatted).toContain('📖 https://hypergen.dev/docs/templates')
    })

    it('should format error without context', () => {
      const error = new HypergenError(
        ErrorCode.NETWORK_CONNECTION_FAILED,
        'Network connection failed'
      )

      const formatted = ErrorHandler.formatError(error)

      expect(formatted).toContain('❌ Network connection failed')
      expect(formatted).toContain('Code: NETWORK_CONNECTION_FAILED')
      expect(formatted).not.toContain('File:')
      expect(formatted).not.toContain('Action:')
    })

    it('should format error with minimal suggestions', () => {
      const error = new HypergenError(
        ErrorCode.UNKNOWN_ERROR,
        'Something went wrong',
        {},
        [
          {
            title: 'Try again',
            description: 'The operation might succeed on retry'
          }
        ]
      )

      const formatted = ErrorHandler.formatError(error)

      expect(formatted).toContain('❌ Something went wrong')
      expect(formatted).toContain('💡 Suggestions:')
      expect(formatted).toContain('1. Try again')
      expect(formatted).not.toContain('$')
      expect(formatted).not.toContain('📖')
    })
  })

  describe('Error Context Extraction', () => {
    it('should extract file path from ENOENT error', () => {
      const error = new Error('ENOENT: no such file or directory, open \'/home/user/file.txt\'')
      const formatted = ErrorHandler.handleError(error)

      expect(formatted).toContain('File: /home/user/file.txt')
    })

    it('should extract file path from EACCES error', () => {
      const error = new Error('EACCES: permission denied, access \'/protected/file.txt\'')
      const formatted = ErrorHandler.handleError(error)

      expect(formatted).toContain('File: /protected/file.txt')
    })

    it('should extract file path from stat error', () => {
      const error = new Error('ENOENT: no such file or directory, stat \'/missing/directory\'')
      const formatted = ErrorHandler.handleError(error)

      expect(formatted).toContain('File: /missing/directory')
    })
  })
})