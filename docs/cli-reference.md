# CLI Reference

Complete reference for all Hypergen CLI commands and options.

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Action Commands](#action-commands)
- [Discovery Commands](#discovery-commands)
- [Template Commands](#template-commands)
- [Generator Commands](#generator-commands)
- [URL Commands](#url-commands)
- [System Commands](#system-commands)
- [Global Options](#global-options)
- [Exit Codes](#exit-codes)

## Installation

```bash
# Install globally
npm install -g hypergen

# Or use with npx
npx hypergen <command>
```

## Basic Usage

```bash
hypergen <command> [subcommand] [options]
```

All commands provide help with the `--help` flag:

```bash
hypergen --help
hypergen action --help
hypergen template --help
```

## Action Commands

### Execute Actions

#### `hypergen action <action-name> [parameters...]`

Execute a specific action with parameters.

**Usage:**
```bash
hypergen action create-component --name=Button --type=tsx --withTests=true
hypergen action create-api-endpoint --name=users --methods=GET,POST --withAuth=true
```

**Parameters:**
- `<action-name>`: The name of the action to execute
- `[parameters...]`: Action-specific parameters in `--key=value` format

**Examples:**
```bash
# Simple component creation
hypergen action create-component --name=Header

# Complex API endpoint with multiple options
hypergen action create-api-endpoint \
  --name=users \
  --methods=GET,POST,PUT,DELETE \
  --withAuth=true \
  --withValidation=true \
  --database=postgresql
```

### List Actions

#### `hypergen list [category]`

List all available actions, optionally filtered by category.

**Usage:**
```bash
hypergen list
hypergen list component
hypergen list api
```

**Parameters:**
- `[category]`: Optional category to filter by

**Examples:**
```bash
# List all actions
hypergen list

# List only React component actions
hypergen list component

# List all API-related actions
hypergen list api
```

### Action Information

#### `hypergen info <action-name>`

Show detailed information about a specific action.

**Usage:**
```bash
hypergen info create-component
hypergen info create-api-endpoint
```

**Parameters:**
- `<action-name>`: The name of the action to inspect

**Output includes:**
- Action description
- Required and optional parameters
- Parameter types and validation rules
- Usage examples
- Category and tags

## Discovery Commands

### Discover Generators

#### `hypergen discover [sources...]`

Discover generators from all available sources.

**Usage:**
```bash
hypergen discover
hypergen discover local
hypergen discover local npm
hypergen discover github:user/repo
```

**Parameters:**
- `[sources...]`: Optional list of sources to discover from

**Available Sources:**
- `local`: Local `_templates` directories
- `npm`: Installed npm packages
- `workspace`: Workspace-specific generators
- `github:user/repo`: GitHub repositories
- `npm:package-name`: Specific npm packages

**Examples:**
```bash
# Discover all generators
hypergen discover

# Discover only local generators
hypergen discover local

# Discover from specific sources
hypergen discover local npm workspace

# Discover from GitHub
hypergen discover github:facebook/react
```

## Template Commands

### Validate Templates

#### `hypergen template validate <path>`

Validate a template.yml file for syntax and configuration errors.

**Usage:**
```bash
hypergen template validate _templates/my-generator/template.yml
hypergen template validate ./template.yml
```

**Parameters:**
- `<path>`: Path to the template.yml file

**Examples:**
```bash
# Validate a specific template
hypergen template validate _templates/react-component/template.yml

# Validate current directory template
hypergen template validate ./template.yml
```

### Template Information

#### `hypergen template info <path>`

Show detailed information about a template configuration.

**Usage:**
```bash
hypergen template info _templates/my-generator/template.yml
```

**Parameters:**
- `<path>`: Path to the template.yml file

**Output includes:**
- Template name and description
- Author and version information
- Variable definitions
- Examples and usage

### List Templates

#### `hypergen template list [directory]`

List all templates in a directory.

**Usage:**
```bash
hypergen template list
hypergen template list _templates
hypergen template list ./generators
```

**Parameters:**
- `[directory]`: Directory to scan for templates (default: `_templates`)

**Examples:**
```bash
# List templates in default directory
hypergen template list

# List templates in custom directory
hypergen template list ./my-generators
```

### Template Examples

#### `hypergen template examples <path>`

Show usage examples for a template.

**Usage:**
```bash
hypergen template examples _templates/my-generator/template.yml
```

**Parameters:**
- `<path>`: Path to the template.yml file

**Output includes:**
- Example usage commands
- Parameter combinations
- Expected outputs

## Generator Commands

### Initialize Generator

#### `hypergen init generator [options]`

Create a new generator with scaffolding.

**Usage:**
```bash
hypergen init generator --name=my-generator --framework=react
hypergen init generator --name=api-generator --framework=node --withTests=true
```

**Options:**
- `--name=<name>`: Generator name (required)
- `--description=<text>`: Generator description
- `--category=<category>`: Generator category (default: "custom")
- `--author=<author>`: Generator author (default: "Unknown")
- `--directory=<path>`: Target directory (default: "_templates")
- `--type=<type>`: Generator type - "action", "template", or "both" (default: "both")
- `--framework=<framework>`: Target framework - "react", "vue", "node", "cli", "api", or "generic" (default: "generic")
- `--withExamples=<boolean>`: Include example usage (default: true)
- `--withTests=<boolean>`: Include test files (default: true)

**Examples:**
```bash
# Basic generator
hypergen init generator --name=my-widget

# React component generator
hypergen init generator \
  --name=react-component \
  --framework=react \
  --category=component \
  --withTests=true

# API generator without examples
hypergen init generator \
  --name=api-endpoint \
  --framework=node \
  --type=both \
  --withExamples=false
```

### Initialize Workspace

#### `hypergen init workspace [options]`

Initialize a generator workspace with examples.

**Usage:**
```bash
hypergen init workspace
hypergen init workspace --directory=generators --withExamples=true
```

**Options:**
- `--directory=<path>`: Target directory (default: "_templates")
- `--withExamples=<boolean>`: Include example generators (default: true)

**Examples:**
```bash
# Initialize with examples
hypergen init workspace --withExamples=true

# Initialize in custom directory
hypergen init workspace --directory=./my-generators
```

## URL Commands

### Resolve URLs

#### `hypergen url resolve <url>`

Resolve a template URL to its local path.

**Usage:**
```bash
hypergen url resolve github:user/repo
hypergen url resolve npm:@company/generators
hypergen url resolve file:./my-templates
```

**Parameters:**
- `<url>`: URL to resolve

**Supported URL formats:**
- `github:user/repo[/path][@ref]`: GitHub repository
- `npm:package-name[/path]`: npm package
- `file:./path`: Local file path
- `http://example.com/template.zip`: HTTP URL

**Examples:**
```bash
# Resolve GitHub repository
hypergen url resolve github:facebook/react/packages/react-scripts/template

# Resolve npm package
hypergen url resolve npm:@company/generators

# Resolve local path
hypergen url resolve file:./shared-templates
```

### Cache Management

#### `hypergen url cache <action>`

Manage the template URL cache.

**Usage:**
```bash
hypergen url cache clear
hypergen url cache info
```

**Actions:**
- `clear`: Clear all cached templates
- `info`: Show cache information

**Examples:**
```bash
# Clear cache
hypergen url cache clear

# Show cache info
hypergen url cache info
```

## System Commands

### System Help

#### `hypergen system help`

Show comprehensive help for all commands.

**Usage:**
```bash
hypergen system help
```

### System Status

#### `hypergen system status`

Show system status and statistics.

**Usage:**
```bash
hypergen system status
```

**Output includes:**
- Number of discovered generators
- Available actions by source
- Cache statistics
- Current project path

### Version Information

#### `hypergen system version`

Show version information.

**Usage:**
```bash
hypergen system version
```

**Output includes:**
- Hypergen version
- Runtime information
- Repository links

## Global Options

### Help

Add `--help` to any command to see its documentation:

```bash
hypergen --help
hypergen action --help
hypergen template validate --help
```

### Verbose Output

Use `--verbose` or `-v` for detailed output:

```bash
hypergen discover --verbose
hypergen action my-action --name=test --verbose
```

### Debug Mode

Use `--debug` for development debugging:

```bash
hypergen discover --debug
hypergen action my-action --name=test --debug
```

### Configuration

Use `--config` to specify a custom configuration file:

```bash
hypergen discover --config=./my-config.js
hypergen action my-action --config=./hypergen.config.js
```

## Exit Codes

Hypergen uses standard exit codes:

- `0`: Success
- `1`: General error
- `2`: Invalid arguments
- `3`: File not found
- `4`: Permission denied
- `5`: Network error

## Parameter Syntax

### Basic Parameters

Parameters use `--key=value` syntax:

```bash
hypergen action my-action --name=example --type=basic
```

### Boolean Parameters

Boolean parameters can be specified as:

```bash
--withTests=true
--withTests=false
--withTests          # same as --withTests=true
```

### Array Parameters

Array parameters use comma-separated values:

```bash
--methods=GET,POST,PUT,DELETE
--tags=react,component,ui
```

### Complex Parameters

Complex parameters use JSON syntax:

```bash
--config='{"api": {"version": "v1", "auth": true}}'
--metadata='{"author": "John Doe", "version": "1.0.0"}'
```

## Environment Variables

Hypergen supports these environment variables:

- `HYPERGEN_CONFIG`: Path to configuration file
- `HYPERGEN_TEMPLATES_DIR`: Default templates directory
- `HYPERGEN_CACHE_DIR`: Cache directory
- `HYPERGEN_DEBUG`: Enable debug mode
- `HYPERGEN_VERBOSE`: Enable verbose output

Example:

```bash
export HYPERGEN_TEMPLATES_DIR=./my-templates
export HYPERGEN_DEBUG=true
hypergen discover
```

## Configuration Files

Hypergen looks for configuration files in this order:

1. `--config` flag value
2. `HYPERGEN_CONFIG` environment variable
3. `hypergen.config.js` in current directory
4. `hypergen.config.json` in current directory
5. `.hypergenrc` in current directory
6. `hypergen.config.js` in home directory

## Examples

### Common Workflows

#### 1. Setting up a new project

```bash
# Initialize workspace
hypergen init workspace --withExamples=true

# Discover generators
hypergen discover

# List available actions
hypergen list
```

#### 2. Creating a React component

```bash
# Get component action info
hypergen info create-react-component

# Create component with tests
hypergen action create-react-component \
  --name=Button \
  --type=tsx \
  --withTests=true \
  --withStories=true
```

#### 3. Building a custom generator

```bash
# Create generator
hypergen init generator --name=my-widget --framework=react

# Validate template
hypergen template validate _templates/my-widget/template.yml

# Test generator
hypergen action my-widget --name=TestWidget
```

#### 4. Working with remote templates

```bash
# Resolve GitHub template
hypergen url resolve github:company/generators

# Clear cache
hypergen url cache clear

# Discover with remote sources
hypergen discover github:company/generators
```

For more examples and detailed usage, see the [Getting Started Guide](./getting-started.md) and [User Guide](./user-guide.md).