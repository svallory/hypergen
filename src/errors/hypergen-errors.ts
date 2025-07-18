/**
 * Hypergen Error System
 * 
 * Provides comprehensive error handling with user-friendly messages
 * and actionable guidance for common issues
 */

export enum ErrorCode {
  // Configuration errors
  CONFIG_FILE_NOT_FOUND = 'CONFIG_FILE_NOT_FOUND',
  CONFIG_INVALID_FORMAT = 'CONFIG_INVALID_FORMAT',
  CONFIG_MISSING_REQUIRED = 'CONFIG_MISSING_REQUIRED',
  
  // Template errors
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  TEMPLATE_INVALID_SYNTAX = 'TEMPLATE_INVALID_SYNTAX',
  TEMPLATE_MISSING_VARIABLES = 'TEMPLATE_MISSING_VARIABLES',
  TEMPLATE_INVALID_FRONTMATTER = 'TEMPLATE_INVALID_FRONTMATTER',
  
  // Action errors
  ACTION_NOT_FOUND = 'ACTION_NOT_FOUND',
  ACTION_EXECUTION_FAILED = 'ACTION_EXECUTION_FAILED',
  ACTION_INVALID_PARAMETERS = 'ACTION_INVALID_PARAMETERS',
  ACTION_MISSING_REQUIRED_PARAM = 'ACTION_MISSING_REQUIRED_PARAM',
  ACTION_INVALID_PARAM_TYPE = 'ACTION_INVALID_PARAM_TYPE',
  ACTION_INVALID_PARAM_VALUE = 'ACTION_INVALID_PARAM_VALUE',
  
  // File system errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_PERMISSION_DENIED = 'FILE_PERMISSION_DENIED',
  FILE_ALREADY_EXISTS = 'FILE_ALREADY_EXISTS',
  DIRECTORY_NOT_FOUND = 'DIRECTORY_NOT_FOUND',
  DIRECTORY_NOT_EMPTY = 'DIRECTORY_NOT_EMPTY',
  
  // Generator discovery errors
  GENERATOR_NOT_FOUND = 'GENERATOR_NOT_FOUND',
  GENERATOR_INVALID_STRUCTURE = 'GENERATOR_INVALID_STRUCTURE',
  GENERATOR_MISSING_METADATA = 'GENERATOR_MISSING_METADATA',
  
  // URL resolution errors
  URL_INVALID_FORMAT = 'URL_INVALID_FORMAT',
  URL_RESOLUTION_FAILED = 'URL_RESOLUTION_FAILED',
  URL_FETCH_FAILED = 'URL_FETCH_FAILED',
  
  // Network errors
  NETWORK_CONNECTION_FAILED = 'NETWORK_CONNECTION_FAILED',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_UNAUTHORIZED = 'NETWORK_UNAUTHORIZED',
  
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

export interface ErrorSuggestion {
  title: string
  description: string
  command?: string
  url?: string
}

export interface ErrorContext {
  file?: string
  line?: number
  column?: number
  function?: string
  action?: string
  parameter?: string
  value?: any
  expected?: string
  received?: string
}

export class HypergenError extends Error {
  public readonly code: ErrorCode
  public context: ErrorContext
  public readonly suggestions: ErrorSuggestion[]
  public readonly isUserError: boolean
  public readonly severity: 'low' | 'medium' | 'high' | 'critical'
  
  constructor(
    code: ErrorCode,
    message: string,
    context: ErrorContext = {},
    suggestions: ErrorSuggestion[] = [],
    isUserError: boolean = true,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    super(message)
    this.name = 'HypergenError'
    this.code = code
    this.context = context
    this.suggestions = suggestions
    this.isUserError = isUserError
    this.severity = severity
  }
}

export class ErrorHandler {
  private static readonly ERROR_MESSAGES: Record<ErrorCode, string> = {
    [ErrorCode.CONFIG_FILE_NOT_FOUND]: 'Configuration file not found',
    [ErrorCode.CONFIG_INVALID_FORMAT]: 'Configuration file has invalid format',
    [ErrorCode.CONFIG_MISSING_REQUIRED]: 'Configuration is missing required fields',
    
    [ErrorCode.TEMPLATE_NOT_FOUND]: 'Template file not found',
    [ErrorCode.TEMPLATE_INVALID_SYNTAX]: 'Template has invalid syntax',
    [ErrorCode.TEMPLATE_MISSING_VARIABLES]: 'Template is missing required variables',
    [ErrorCode.TEMPLATE_INVALID_FRONTMATTER]: 'Template has invalid frontmatter',
    
    [ErrorCode.ACTION_NOT_FOUND]: 'Action not found',
    [ErrorCode.ACTION_EXECUTION_FAILED]: 'Action execution failed',
    [ErrorCode.ACTION_INVALID_PARAMETERS]: 'Action has invalid parameters',
    [ErrorCode.ACTION_MISSING_REQUIRED_PARAM]: 'Action is missing required parameter',
    [ErrorCode.ACTION_INVALID_PARAM_TYPE]: 'Action parameter has invalid type',
    [ErrorCode.ACTION_INVALID_PARAM_VALUE]: 'Action parameter has invalid value',
    
    [ErrorCode.FILE_NOT_FOUND]: 'File not found',
    [ErrorCode.FILE_PERMISSION_DENIED]: 'Permission denied',
    [ErrorCode.FILE_ALREADY_EXISTS]: 'File already exists',
    [ErrorCode.DIRECTORY_NOT_FOUND]: 'Directory not found',
    [ErrorCode.DIRECTORY_NOT_EMPTY]: 'Directory is not empty',
    
    [ErrorCode.GENERATOR_NOT_FOUND]: 'Generator not found',
    [ErrorCode.GENERATOR_INVALID_STRUCTURE]: 'Generator has invalid structure',
    [ErrorCode.GENERATOR_MISSING_METADATA]: 'Generator is missing metadata',
    
    [ErrorCode.URL_INVALID_FORMAT]: 'URL has invalid format',
    [ErrorCode.URL_RESOLUTION_FAILED]: 'URL resolution failed',
    [ErrorCode.URL_FETCH_FAILED]: 'Failed to fetch URL',
    
    [ErrorCode.NETWORK_CONNECTION_FAILED]: 'Network connection failed',
    [ErrorCode.NETWORK_TIMEOUT]: 'Network request timed out',
    [ErrorCode.NETWORK_UNAUTHORIZED]: 'Network request unauthorized',
    
    [ErrorCode.UNKNOWN_ERROR]: 'Unknown error occurred',
    [ErrorCode.INTERNAL_ERROR]: 'Internal error occurred',
    [ErrorCode.VALIDATION_ERROR]: 'Validation error occurred'
  }

  private static readonly ERROR_SUGGESTIONS: Record<ErrorCode, ErrorSuggestion[]> = {
    [ErrorCode.CONFIG_FILE_NOT_FOUND]: [
      {
        title: 'Create configuration file',
        description: 'Create a hypergen.config.js file in your project root',
        command: 'hypergen init workspace'
      },
      {
        title: 'Check file path',
        description: 'Verify the configuration file path is correct'
      }
    ],
    
    [ErrorCode.CONFIG_INVALID_FORMAT]: [
      {
        title: 'Check configuration syntax',
        description: 'Verify the configuration file has valid syntax'
      },
      {
        title: 'See configuration examples',
        description: 'Look at working configuration examples',
        url: 'https://hypergen.dev/docs/configuration'
      }
    ],
    
    [ErrorCode.CONFIG_MISSING_REQUIRED]: [
      {
        title: 'Add required fields',
        description: 'Ensure all required configuration fields are present'
      },
      {
        title: 'Check documentation',
        description: 'See required configuration fields',
        url: 'https://hypergen.dev/docs/configuration'
      }
    ],
    
    [ErrorCode.TEMPLATE_INVALID_SYNTAX]: [
      {
        title: 'Check template syntax',
        description: 'Verify the template file has valid syntax'
      },
      {
        title: 'Validate template',
        description: 'Use the template validator',
        command: 'hypergen template validate <path>'
      }
    ],
    
    [ErrorCode.TEMPLATE_MISSING_VARIABLES]: [
      {
        title: 'Add required variables',
        description: 'Ensure all required template variables are defined'
      },
      {
        title: 'Check template documentation',
        description: 'See template variable requirements',
        url: 'https://hypergen.dev/docs/templates'
      }
    ],
    
    [ErrorCode.TEMPLATE_INVALID_FRONTMATTER]: [
      {
        title: 'Check frontmatter syntax',
        description: 'Verify the template frontmatter has valid YAML syntax'
      },
      {
        title: 'See frontmatter examples',
        description: 'Look at working frontmatter examples',
        url: 'https://hypergen.dev/docs/frontmatter'
      }
    ],
    
    [ErrorCode.ACTION_EXECUTION_FAILED]: [
      {
        title: 'Check action parameters',
        description: 'Verify all required parameters are provided'
      },
      {
        title: 'Check file permissions',
        description: 'Ensure you have write permissions to the target directory'
      }
    ],
    
    [ErrorCode.ACTION_INVALID_PARAMETERS]: [
      {
        title: 'Check parameter format',
        description: 'Verify all parameters have correct format and types'
      },
      {
        title: 'View action details',
        description: 'See parameter requirements',
        command: 'hypergen info <action-name>'
      }
    ],
    
    [ErrorCode.ACTION_INVALID_PARAM_TYPE]: [
      {
        title: 'Check parameter type',
        description: 'Verify the parameter has the correct type'
      },
      {
        title: 'View action details',
        description: 'See parameter type requirements',
        command: 'hypergen info <action-name>'
      }
    ],
    
    [ErrorCode.ACTION_INVALID_PARAM_VALUE]: [
      {
        title: 'Check parameter value',
        description: 'Verify the parameter value is valid'
      },
      {
        title: 'View action examples',
        description: 'See example parameter values',
        command: 'hypergen info <action-name>'
      }
    ],
    
    [ErrorCode.FILE_ALREADY_EXISTS]: [
      {
        title: 'Use different name',
        description: 'Choose a different name for the file'
      },
      {
        title: 'Use force option',
        description: 'Use --force to overwrite existing files'
      }
    ],
    
    [ErrorCode.DIRECTORY_NOT_FOUND]: [
      {
        title: 'Create directory',
        description: 'Create the target directory first'
      },
      {
        title: 'Check directory path',
        description: 'Verify the directory path is correct'
      }
    ],
    
    [ErrorCode.DIRECTORY_NOT_EMPTY]: [
      {
        title: 'Use different directory',
        description: 'Choose an empty directory'
      },
      {
        title: 'Clean directory',
        description: 'Remove files from the directory first'
      }
    ],
    
    [ErrorCode.GENERATOR_INVALID_STRUCTURE]: [
      {
        title: 'Check generator structure',
        description: 'Verify the generator follows the correct structure'
      },
      {
        title: 'Create new generator',
        description: 'Create a new generator with proper structure',
        command: 'hypergen init generator --name=my-generator'
      }
    ],
    
    [ErrorCode.GENERATOR_MISSING_METADATA]: [
      {
        title: 'Add generator metadata',
        description: 'Ensure the generator has required metadata'
      },
      {
        title: 'Check generator documentation',
        description: 'See generator metadata requirements',
        url: 'https://hypergen.dev/docs/generators'
      }
    ],
    
    [ErrorCode.URL_FETCH_FAILED]: [
      {
        title: 'Check internet connection',
        description: 'Verify you have an active internet connection'
      },
      {
        title: 'Check URL format',
        description: 'Verify the URL is correct and accessible'
      }
    ],
    
    [ErrorCode.NETWORK_TIMEOUT]: [
      {
        title: 'Try again',
        description: 'The request may succeed on retry'
      },
      {
        title: 'Check network connection',
        description: 'Verify your internet connection is stable'
      }
    ],
    
    [ErrorCode.NETWORK_UNAUTHORIZED]: [
      {
        title: 'Check authentication',
        description: 'Verify your credentials are correct'
      },
      {
        title: 'Check permissions',
        description: 'Ensure you have access to the resource'
      }
    ],
    
    [ErrorCode.UNKNOWN_ERROR]: [
      {
        title: 'Try again',
        description: 'The operation might succeed on retry'
      },
      {
        title: 'Check error details',
        description: 'Review the error message for specific issues'
      }
    ],
    
    [ErrorCode.INTERNAL_ERROR]: [
      {
        title: 'Report this issue',
        description: 'This might be a bug in Hypergen',
        url: 'https://github.com/svallory/hypergen/issues'
      },
      {
        title: 'Try again',
        description: 'The operation might succeed on retry'
      }
    ],
    
    [ErrorCode.VALIDATION_ERROR]: [
      {
        title: 'Check input format',
        description: 'Verify your input follows the expected format'
      },
      {
        title: 'See documentation',
        description: 'Check the documentation for requirements',
        url: 'https://hypergen.dev/docs'
      }
    ],
    
    [ErrorCode.TEMPLATE_NOT_FOUND]: [
      {
        title: 'Check template path',
        description: 'Verify the template file exists at the specified path'
      },
      {
        title: 'Create template',
        description: 'Create a new template file',
        command: 'hypergen init generator --name=my-template'
      },
      {
        title: 'List available templates',
        description: 'See all available templates',
        command: 'hypergen template list'
      }
    ],
    
    [ErrorCode.FILE_NOT_FOUND]: [
      {
        title: 'Check file path',
        description: 'Verify the file exists at the specified path'
      },
      {
        title: 'Create the file',
        description: 'Create the missing file'
      }
    ],
    
    [ErrorCode.URL_RESOLUTION_FAILED]: [
      {
        title: 'Check URL format',
        description: 'Verify the URL follows the correct format'
      },
      {
        title: 'Check internet connection',
        description: 'Verify you have an active internet connection'
      }
    ],
    
    [ErrorCode.ACTION_NOT_FOUND]: [
      {
        title: 'List available actions',
        description: 'See all available actions',
        command: 'hypergen list'
      },
      {
        title: 'Discover generators',
        description: 'Run discovery to find available generators',
        command: 'hypergen discover'
      },
      {
        title: 'Create new action',
        description: 'Create a new action generator',
        command: 'hypergen init generator --name=my-action'
      }
    ],
    
    [ErrorCode.ACTION_MISSING_REQUIRED_PARAM]: [
      {
        title: 'Check required parameters',
        description: 'View action details to see required parameters',
        command: 'hypergen info <action-name>'
      },
      {
        title: 'Use action examples',
        description: 'See example usage for this action',
        command: 'hypergen info <action-name>'
      }
    ],
    
    [ErrorCode.FILE_PERMISSION_DENIED]: [
      {
        title: 'Check file permissions',
        description: 'Ensure you have write permissions to the target directory'
      },
      {
        title: 'Run with sudo',
        description: 'Try running the command with elevated privileges (use caution)'
      }
    ],
    
    [ErrorCode.GENERATOR_NOT_FOUND]: [
      {
        title: 'Run discovery',
        description: 'Discover available generators',
        command: 'hypergen discover'
      },
      {
        title: 'Install generator',
        description: 'Install a generator package',
        command: 'npm install <generator-package>'
      },
      {
        title: 'Create generator',
        description: 'Create your own generator',
        command: 'hypergen init generator --name=my-generator'
      }
    ],
    
    [ErrorCode.URL_INVALID_FORMAT]: [
      {
        title: 'Check URL format',
        description: 'Ensure the URL follows the correct format (e.g., github:user/repo)'
      },
      {
        title: 'URL examples',
        description: 'Valid formats: github:user/repo, npm:package-name, file:./path',
        url: 'https://hypergen.dev/docs/url-templates'
      }
    ],
    
    [ErrorCode.NETWORK_CONNECTION_FAILED]: [
      {
        title: 'Check internet connection',
        description: 'Verify you have an active internet connection'
      },
      {
        title: 'Check proxy settings',
        description: 'Verify proxy configuration if behind a corporate firewall'
      },
      {
        title: 'Try again later',
        description: 'The remote server might be temporarily unavailable'
      }
    ]
  }

  /**
   * Create a user-friendly error with context and suggestions
   */
  static createError(
    code: ErrorCode,
    customMessage?: string,
    context: ErrorContext = {},
    customSuggestions: ErrorSuggestion[] = []
  ): HypergenError {
    const baseMessage = this.ERROR_MESSAGES[code] || 'Unknown error'
    const message = customMessage || baseMessage
    const suggestions = customSuggestions.length > 0 ? customSuggestions : this.ERROR_SUGGESTIONS[code] || []
    
    return new HypergenError(code, message, context, suggestions)
  }

  /**
   * Format error for display in CLI
   */
  static formatError(error: HypergenError): string {
    const lines: string[] = []
    
    // Error header
    lines.push(`❌ ${error.message}`)
    
    // Error code and severity
    if (error.code !== ErrorCode.UNKNOWN_ERROR) {
      lines.push(`   Code: ${error.code}`)
    }
    
    // Context information
    if (error.context.file) {
      let location = `   File: ${error.context.file}`
      if (error.context.line) {
        location += `:${error.context.line}`
        if (error.context.column) {
          location += `:${error.context.column}`
        }
      }
      lines.push(location)
    }
    
    if (error.context.action) {
      lines.push(`   Action: ${error.context.action}`)
    }
    
    if (error.context.parameter) {
      lines.push(`   Parameter: ${error.context.parameter}`)
    }
    
    if (error.context.expected && error.context.received) {
      lines.push(`   Expected: ${error.context.expected}`)
      lines.push(`   Received: ${error.context.received}`)
    }
    
    // Suggestions
    if (error.suggestions.length > 0) {
      lines.push('')
      lines.push('💡 Suggestions:')
      
      for (const [index, suggestion] of error.suggestions.entries()) {
        lines.push(`   ${index + 1}. ${suggestion.title}`)
        lines.push(`      ${suggestion.description}`)
        
        if (suggestion.command) {
          lines.push(`      $ ${suggestion.command}`)
        }
        
        if (suggestion.url) {
          lines.push(`      📖 ${suggestion.url}`)
        }
        
        if (index < error.suggestions.length - 1) {
          lines.push('')
        }
      }
    }
    
    return lines.join('\n')
  }

  /**
   * Handle and format any error for CLI display
   */
  static handleError(error: unknown): string {
    if (error instanceof HypergenError) {
      return this.formatError(error)
    }
    
    if (error instanceof Error) {
      // Try to categorize common Node.js errors
      if (error.message.includes('ENOENT')) {
        const hypergenError = this.createError(
          ErrorCode.FILE_NOT_FOUND,
          error.message,
          { file: this.extractFileFromError(error.message) }
        )
        return this.formatError(hypergenError)
      }
      
      if (error.message.includes('EACCES')) {
        const hypergenError = this.createError(
          ErrorCode.FILE_PERMISSION_DENIED,
          error.message,
          { file: this.extractFileFromError(error.message) }
        )
        return this.formatError(hypergenError)
      }
      
      if (error.message.includes('EEXIST')) {
        const hypergenError = this.createError(
          ErrorCode.FILE_ALREADY_EXISTS,
          error.message,
          { file: this.extractFileFromError(error.message) }
        )
        return this.formatError(hypergenError)
      }
      
      if (error.message.includes('ENOTDIR')) {
        const hypergenError = this.createError(
          ErrorCode.DIRECTORY_NOT_FOUND,
          error.message,
          { file: this.extractFileFromError(error.message) }
        )
        return this.formatError(hypergenError)
      }
      
      // Generic error handling
      const hypergenError = this.createError(
        ErrorCode.UNKNOWN_ERROR,
        error.message,
        {},
        [{
          title: 'Check the error details',
          description: 'Review the error message for specific issues'
        }]
      )
      return this.formatError(hypergenError)
    }
    
    // Unknown error type
    const hypergenError = this.createError(
      ErrorCode.INTERNAL_ERROR,
      'An unexpected error occurred',
      {},
      [{
        title: 'Report this issue',
        description: 'This might be a bug in Hypergen',
        url: 'https://github.com/svallory/hypergen/issues'
      }]
    )
    return this.formatError(hypergenError)
  }

  /**
   * Extract file path from error message
   */
  private static extractFileFromError(message: string): string | undefined {
    const match = message.match(/(?:open|access|stat) '([^']+)'/)
    return match ? match[1] : undefined
  }

  /**
   * Create parameter validation error
   */
  static createParameterError(
    parameter: string,
    value: any,
    expected: string,
    action?: string
  ): HypergenError {
    return this.createError(
      ErrorCode.ACTION_INVALID_PARAM_VALUE,
      `Invalid value for parameter '${parameter}'`,
      {
        parameter,
        value: String(value),
        expected,
        action
      },
      [
        {
          title: 'Check parameter format',
          description: `Parameter '${parameter}' should be ${expected}`
        },
        {
          title: 'View action details',
          description: 'See all parameters and their requirements',
          command: action ? `hypergen info ${action}` : undefined
        }
      ]
    )
  }

  /**
   * Create template validation error
   */
  static createTemplateError(
    file: string,
    line?: number,
    column?: number,
    details?: string
  ): HypergenError {
    return this.createError(
      ErrorCode.TEMPLATE_INVALID_SYNTAX,
      `Template validation failed${details ? ': ' + details : ''}`,
      { file, line, column },
      [
        {
          title: 'Check template syntax',
          description: 'Verify the template file has valid syntax'
        },
        {
          title: 'Validate template',
          description: 'Use the template validator',
          command: `hypergen template validate ${file}`
        }
      ]
    )
  }

  /**
   * Create action not found error
   */
  static createActionNotFoundError(actionName: string): HypergenError {
    return this.createError(
      ErrorCode.ACTION_NOT_FOUND,
      `Action '${actionName}' not found`,
      { action: actionName },
      [
        {
          title: 'List available actions',
          description: 'See all available actions',
          command: 'hypergen list'
        },
        {
          title: 'Discover generators',
          description: 'Run discovery to find available generators',
          command: 'hypergen discover'
        },
        {
          title: 'Check spelling',
          description: 'Verify the action name is spelled correctly'
        }
      ]
    )
  }

  /**
   * Create file operation error
   */
  static createFileError(
    operation: string,
    file: string,
    reason: string
  ): HypergenError {
    let code = ErrorCode.FILE_NOT_FOUND
    
    if (reason.includes('permission')) {
      code = ErrorCode.FILE_PERMISSION_DENIED
    } else if (reason.includes('exists')) {
      code = ErrorCode.FILE_ALREADY_EXISTS
    }
    
    return this.createError(
      code,
      `Failed to ${operation} file '${file}': ${reason}`,
      { file }
    )
  }
}

/**
 * Utility function to wrap async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorContext: ErrorContext = {}
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof HypergenError) {
      // Add additional context to existing error
      error.context = { ...error.context, ...errorContext }
      throw error
    }
    
    // Convert unknown errors to HypergenError
    const hypergenError = ErrorHandler.createError(
      ErrorCode.UNKNOWN_ERROR,
      error instanceof Error ? error.message : String(error),
      errorContext
    )
    throw hypergenError
  }
}

/**
 * Utility function to validate parameters
 */
export function validateParameter(
  name: string,
  value: any,
  type: string,
  required: boolean = false,
  pattern?: string,
  allowedValues?: string[]
): void {
  if (required && (value === undefined || value === null || value === '')) {
    throw ErrorHandler.createError(
      ErrorCode.ACTION_MISSING_REQUIRED_PARAM,
      `Required parameter '${name}' is missing`,
      { parameter: name }
    )
  }
  
  if (value !== undefined && value !== null && value !== '') {
    // Type validation
    if (type === 'string' && typeof value !== 'string') {
      throw ErrorHandler.createParameterError(name, value, 'string')
    }
    
    if (type === 'number' && typeof value !== 'number') {
      throw ErrorHandler.createParameterError(name, value, 'number')
    }
    
    if (type === 'boolean' && typeof value !== 'boolean') {
      throw ErrorHandler.createParameterError(name, value, 'boolean')
    }
    
    if (type === 'array' && !Array.isArray(value)) {
      throw ErrorHandler.createParameterError(name, value, 'array')
    }
    
    // Pattern validation
    if (pattern && typeof value === 'string') {
      const regex = new RegExp(pattern)
      if (!regex.test(value)) {
        throw ErrorHandler.createParameterError(name, value, `string matching pattern ${pattern}`)
      }
    }
    
    // Allowed values validation
    if (allowedValues && !allowedValues.includes(value)) {
      throw ErrorHandler.createParameterError(name, value, `one of: ${allowedValues.join(', ')}`)
    }
  }
}