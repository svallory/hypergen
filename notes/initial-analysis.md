# Initial Analysis and Decisions

## Current State Assessment

### Strengths of Current Implementation
- **Solid Foundation**: Hypergen builds on proven Hygen architecture with significant improvements
- **Performance Focus**: Hash-indexed template store enables handling hundreds of generators
- **Multiple Template Directories**: Already supports complex project structures
- **Conflict Resolution**: Strategic approach to template conflicts with configurable strategies
- **Modern Stack**: TypeScript, ESM, Bun for development and performance

### Key Requirements
1. **Replace EJS with LiquidJS** as default template engine
2. **Support Moon's template.yml** format for generator definitions
3. **Surpass Yeoman** in functionality and developer experience

## Research Findings

### LiquidJS Advantages Over EJS
- **Safety**: No `eval()` or `new Function()` usage - much safer than EJS
- **Performance**: Streamed rendering, 4x faster than previous versions
- **Compatibility**: Shopify Liquid standard, works with Jekyll/GitHub Pages
- **Features**: More expressive syntax, built-in filters, better error handling
- **TypeScript**: Native TypeScript support with strict mode

### Moon's template.yml Benefits
- **Structured Configuration**: Well-designed YAML format vs scattered JS files
- **Variable System**: Rich type system with prompts, defaults, validation
- **Inheritance**: `extends` feature for template composition
- **Metadata**: Proper title, description, destination management
- **Frontmatter**: Flexible per-file configuration

## Strategic Decisions

### 1. Migration Strategy
**Decision**: Gradual migration with backward compatibility
- Keep EJS support during transition
- Add LiquidJS as default for new templates
- Provide migration tooling

### 2. Configuration Priority
**Decision**: Support both formats simultaneously
- `template.yml` (Moon format) takes precedence
- Fall back to existing `index.js`/`prompt.js` pattern
- Provide conversion utilities

### 3. Template Engine Architecture
**Decision**: Plugin-based template engine system
- Abstract template rendering interface
- Support multiple engines (LiquidJS, EJS, future engines)
- Engine selection per template or global configuration

### 4. Yeoman Competitive Advantages
**Decision**: Focus on developer experience improvements
- Faster performance (already superior)
- Better template organization
- Modern tooling and TypeScript support
- Simpler configuration
- Local template development

## Next Steps Priority

1. **Template Engine Abstraction** - Create plugin system
2. **LiquidJS Integration** - Implement as default engine
3. **Moon Config Support** - Add template.yml parsing
4. **Migration Tools** - Help users transition from EJS to LiquidJS
5. **Enhanced CLI** - Improve user experience beyond Yeoman

## Technical Architecture Decisions

### Template Engine Interface
```typescript
interface TemplateEngine {
  render(template: string, context: object): Promise<string>
  renderFile(filePath: string, context: object): Promise<string>
  supports(extension: string): boolean
}
```

### Configuration Hierarchy
1. `template.yml` (Moon format)
2. `index.js` (existing format)
3. `prompt.js` (existing format)
4. Global hypergen configuration

This approach ensures we can surpass Yeoman while maintaining the excellent foundation that Hypergen already provides.