/**
 * Hypergen V8 Engine
 * 
 * Clean V8-only implementation without legacy compatibility
 */

import type { ActionResult, ResolvedRunnerConfig } from './types.js'
import { HypergenCLI } from './cli/index.js'
import type { HypergenCliConfig } from './cli/index.js'

class ShowHelpError extends Error {
  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, ShowHelpError.prototype)
  }
}

const engine = async (
  argv: string[],
  config: ResolvedRunnerConfig,
): Promise<ActionResult[]> => {
  const { logger } = config

  // Handle help flags
  if (['-h', '--help'].includes(argv[0])) {
    const helpMessage = `
🚀 Hypergen - The Modern Code Generator

USAGE:
  hypergen <command> [options]

COMMANDS:
  action <name> [params...]        Execute an action
  discover [sources...]            Discover generators
  list [category]                  List available actions
  info <action-name>               Show action details
  url <subcommand> [args...]       URL template operations
  system <subcommand> [args...]    System operations

OPTIONS:
  -h, --help                       Show this help message
  --debug                          Enable debug output

EXAMPLES:
  hypergen discover                Discover all generators
  hypergen list component          List component actions
  hypergen action create-component --name=Button --type=tsx
  hypergen url resolve github:user/repo/templates
  hypergen system status           Show system status

For more information, run: hypergen system help
`
    logger.log(helpMessage)
    throw new ShowHelpError('Help requested')
  }

  // All commands go through Hypergen CLI
  const cliConfig: HypergenCliConfig = {
    ...config
  }

  const cli = new HypergenCLI(cliConfig)
  
  try {
    const result = await cli.execute(argv)
    
    if (result.success) {
      // Log success message
      if (result.message) {
        logger.log(result.message)
      }
      
      // Return empty actions array (V8 handles its own output)
      return []
    } else {
      // Log error message and throw
      if (result.message) {
        logger.log(result.message)
      }
      
      throw new Error(result.message || 'Command failed')
    }
  } catch (error: any) {
    throw new Error(`Command failed: ${error.message}`)
  }
}

export default engine
export { ShowHelpError }