# [8.0.0-dev](https://github.com/svallory/hypergen/compare/v7.0.0-rc.1...HEAD) (2025-07-19)


### ⚠ BREAKING CHANGES

* **architecture**: Complete rewrite of core architecture with TypeScript-first approach
* **templates**: New action-based system with @action decorators replacing template-based approach  
* **cli**: Interactive parameter resolution with mandatory prompts for missing values
* **config**: Configuration system redesigned with hypergen.config.js support

### Features

#### 🚀 Core V8 Architecture
* **advanced-composition**: implement advanced composition features for Hypergen V8 ([8e7f799](https://github.com/svallory/hypergen/commit/8e7f7997c01484b04c760676245a1f74cb699107))
  - Template inheritance and conflict resolution system
  - Conditional template inclusion with safe expression evaluation
  - Template versioning and dependency management
  - Action lifecycle management with pre/post/error hooks
  - Cross-action communication and state sharing
  - Action pipelines and workflow orchestration
  - Comprehensive test suite with 85 tests passing
  - Enhanced error handling for composition scenarios

* **cli-v8**: implement Hypergen V8 with interactive parameter resolution and modern CLI ([b933120](https://github.com/svallory/hypergen/commit/b933120fc8df7b8de0bcbc5e3fb3e4c42fce2e68))
  - Interactive prompts with @clack/prompts for beautiful CLI experience
  - Multi-select enum support with automatic detection
  - New CLI flags: --defaults, --dryRun, --force for enhanced workflow control
  - Comprehensive error handling with actionable suggestions
  - Template URL resolution with GitHub and local resolver support
  - Generator discovery system for local, npm, and workspace sources
  - Generator scaffolding with `hypergen init` commands
  - Parameter validation with type safety and constraint checking
  - Dry run mode for safe testing without file writes
  - Force mode for overwriting existing files
  - Configuration file support with environment-specific settings
  - 90+ comprehensive tests covering all major functionality

#### 🎨 Template Engine System
* **template-engines**: implement template engine abstraction with LiquidJS and plugin system ([3066d22](https://github.com/svallory/hypergen/commit/3066d221a84d741f87f52b4846fd52e2a3ecfba6))
  - Plugin-based template engine system with TemplateEngine interface
  - TemplateEngineFactory for registration and discovery
  - Automatic engine selection based on file extensions
  - Support engine-specific configuration and customization
  - LiquidTemplateEngine as default engine for safer, faster rendering
  - Comprehensive filter system (camelCase, kebabCase, etc.)
  - Template inheritance and includes with file system access
  - 4x performance improvement through streaming rendering
  - Auto-discovery system for hypergen-plugin-* packages
  - Plugin validation and registration system
  - Full EJS backward compatibility through EJSTemplateEngine
  - Seamless migration path with side-by-side support
  - 15/15 tests pass with full coverage

#### 📁 Template Management
* **multi-templates**: multiple template directories ([#7](https://github.com/svallory/hypergen/issues/7)) ([d887a77](https://github.com/svallory/hypergen/commit/d887a7795fa6867d2e32d310919ce6923e0c1f38))

#### ⚡ Performance
* **indexing**: add hash indexed store to speed up action conflict resolution ([#3](https://github.com/svallory/hypergen/issues/3)) ([f68d330](https://github.com/svallory/hypergen/commit/f68d330fb6e0bf41b4e862b0bf7ba85f8b49ef96))

#### 📋 Planning & Strategy  
* **roadmap**: initial analysis and roadmap for hypergen evolution ([f863dd5](https://github.com/svallory/hypergen/commit/f863dd59060b144bf064e99ef7c94efc2ebd819f))
  - Comprehensive CLAUDE.md with development guidance
  - Create notes folder with initial analysis and roadmap
  - Document strategy for LiquidJS integration and Moon template.yml support
  - Establish 10-week roadmap to surpass Yeoman performance and features
  - Set up progress tracking and decision documentation

### Documentation

* **v8-docs**: create comprehensive Hypergen V8 documentation site ([0119f3f](https://github.com/svallory/hypergen/commit/0119f3f6bb37ef3b35a7bb4a53db10e43ac20c1e))
  - Set up Astro/Starlight documentation site with professional theme
  - Create Getting Started guide with current V8 implementation
  - Add V8 Features Overview documenting all implemented capabilities
  - Include complete Advanced Composition guide with examples
  - Create V8 Roadmap clearly separating implemented vs planned features
  - Configure proper navigation structure and cross-linking
  - Add frontmatter and proper Astro content schema compliance
  - Ready for GitHub Pages deployment

* **design-docs**: add design notes and implementation strategy ([dac07c0](https://github.com/svallory/hypergen/commit/dac07c0b94caf2c3e4b5e78f5bd0b2f20c6b5b35))
  - Add composability redesign analysis
  - Include mental model analysis for user experience
  - Document template composability analysis
  - Add V8 implementation strategy and decisions
  - Provide historical context for architectural choices

### Build System

* **runtime**: move to bun and esm ([dfd0c86](https://github.com/svallory/hypergen/commit/dfd0c86b893aa8e3eaca2d4b8fab3c9f1e1c6b1e))

* **ci**: add GitHub Pages deployment workflow for documentation ([7c7605b](https://github.com/svallory/hypergen/commit/7c7605b5b57c01e6cb0d2fe8a8b3f33b5e7cd83e))
  - Configure automated deployment to GitHub Pages
  - Use Bun for fast dependency installation and builds
  - Deploy from docs/ directory with Astro build output
  - Trigger on pushes to main branch affecting docs/

### Code Refactoring

* **cleanup**: clean up legacy documentation and backup existing docs ([5169836](https://github.com/svallory/hypergen/commit/51698366cbeb11b6bb6b3c5ba5bf93ecd8ff45be))
  - Move existing documentation to docs-backup/ for reference
  - Remove legacy hygen.io documentation site
  - Clean up old template examples
  - Remove outdated technical documentation files
  - Prepare for new V8 documentation structure


# [7.0.0-rc.2](https://github.com/svallory/hypergen/compare/v7.0.0-rc.1...v7.0.0-rc.2) (2025-07-16)


### Features

* multiple template directories ([#7](https://github.com/svallory/hypergen/issues/7)) ([d887a77](https://github.com/svallory/hypergen/commit/d887a7795fa6867d2e32d310919ce6923e0c1f38))



