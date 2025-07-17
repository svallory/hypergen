# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development
- `bun run build` - Build the project (compiles TypeScript and generates changelog)
- `bun run build:lib` - Compile TypeScript only
- `bun run test` - Run tests with coverage
- `bun run test:code` - Run tests without coverage
- `bun run watch` - Run tests in watch mode
- `bun run hygen` - Run hypergen locally during development
- `bun run hygen:build` - Run built version of hypergen

### Testing
- `bun test` - Run full test suite with coverage
- `bun test --watch` - Run tests in watch mode
- Tests are located in `tests/` directory and use Vitest
- Metaverse testing in `src/__tests__/metaverse/` validates real-world template usage

## Architecture Overview

### Core Components

**Main Entry Point**: `src/bin.ts` - CLI entry point that sets up the runner with configuration
**Engine**: `src/engine.ts` - Core orchestration logic that validates arguments and coordinates rendering/execution
**Render**: `src/render.ts` - Template rendering engine using EJS, processes frontmatter and template files
**Execute**: `src/execute.ts` - Executes rendered actions (file operations, injections, shell commands)

### Key Systems

**Template Resolution**: Uses `TemplateStore.ts` with hash-indexed storage for fast template lookup across multiple directories
**Configuration**: `config.ts` and `config-resolver.ts` handle configuration loading and resolution
**Operations**: `src/ops/` contains file operations (add, inject, shell) that can be performed on templates
**Context**: `src/context.ts` provides template variables and helpers (inflection, change-case, etc.)

### Template Structure
- Templates live in `_templates/` directories (configurable)
- Folder structure maps to command structure: `_templates/generator/action/`
- Files use `.ejs.t` extension for EJS templates
- Frontmatter (YAML) defines metadata like `to:` (destination path), `inject:` (injection mode)
- Multiple template directories supported via configuration

### Current Template Engine
- Uses **EJS** for template rendering (`src/render.ts:28-29`)
- Templates processed through `ejs.render()` with context helpers
- Frontmatter attributes are also templated

### Configuration Files
- `hypergen.json` - Main configuration file (differs from hygen's `hygen.json`)
- Supports `conflictResolutionStrategy`, `templates` array, `helpers` path
- Uses `config-resolver.ts` for loading from multiple locations

## Important Implementation Details

### Performance Considerations
- Lazy loading of dependencies for better startup performance
- Hash-indexed template store for fast lookups with hundreds of generators
- Startup speed testing available via `bun run test:require`

### Template Processing Pipeline
1. Arguments parsed via `params.ts`
2. Templates discovered via `TemplateStore.ts`
3. Files rendered via `render.ts` (EJS + frontmatter)
4. Actions executed via `execute.ts` (file operations)

### Testing Strategy
- Unit tests in `tests/` directory
- Metaverse tests validate real-world template usage
- Snapshot testing for template outputs
- Coverage reporting enabled by default

## Migration Context (Hygen → Hypergen)
- Forked from Hygen with additional features
- Changed command name and config file names for coexistence
- Added multiple template directory support
- Enhanced conflict resolution strategies
- Improved scalability for large generator sets