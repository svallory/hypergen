#!/usr/bin/env bun
/**
 * Hypergen CLI Entry Point
 */

import { HypergenCLI } from './cli/cli.js'

async function main() {
  const args = process.argv.slice(2)
  
  // Parse global options
  const config = {
    cwd: process.cwd(),
    debug: !!process.env.DEBUG || args.includes('--debug'),
    verbose: !!process.env.VERBOSE || args.includes('--verbose'),
    configPath: process.env.HYPERGEN_CONFIG
  }
  
  // Remove global flags from args
  const filteredArgs = args.filter(arg => 
    !arg.startsWith('--debug') && 
    !arg.startsWith('--verbose') && 
    !arg.startsWith('--config')
  )
  
  try {
    const cli = new HypergenCLI(config)
    await cli.initialize()
    const result = await cli.execute(filteredArgs)
    
    if (result.success) {
      if (result.message) {
        console.log(result.message)
      }
      process.exit(0)
    } else {
      if (result.message) {
        console.error(result.message)
      }
      process.exit(1)
    }
  } catch (error: any) {
    console.error('Error:', error.message)
    if (config.debug) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
