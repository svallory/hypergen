# Mental Model Analysis: Generators vs Templates

## The Current Mental Models

### Hygen/Hypergen: Generator → Action → Templates
```
_templates/
  component/          # Generator
    new/              # Action
      index.ejs.t     # Template
      style.ejs.t     # Template
```
- **User thinks**: "I want to generate a component with the new action"
- **Abstraction**: Generator is a collection of actions, action is a collection of templates

### Yeoman: Generator (Node.js module) → Templates (resources)
```
generators/
  app/
    index.js          # Generator logic
    templates/        # Template resources
      file1.ejs
```
- **User thinks**: "I want to write a generator program that uses templates"
- **Abstraction**: Generator is code, templates are data

### Moon: Template → Variables → Files
```
templates/
  my-template/
    template.yml      # Configuration
    file1.tera        # Template file
    file2.tera        # Template file
```
- **User thinks**: "I want to create a template that generates files"
- **Abstraction**: Template is the primary unit, files are implementation

## The Fundamental Question

**Should we distinguish between "generators" and "templates"?**

### Arguments for Keeping Generator/Template Distinction (Hygen model):

#### ✅ **Organizational Benefits**
- Clear hierarchical structure: `hypergen component new MyButton`
- Logical grouping of related functionality
- Predictable command structure
- Easier discovery: "What generators are available?"

#### ✅ **Mental Model Benefits**
- Matches how developers think: "I want to generate a thing"
- Clear separation of concerns: what vs how
- Familiar from other tools (Rails generators, etc.)

### Arguments for Simplifying to Templates Only (Moon model):

#### ✅ **Simplicity Benefits**
- Flatter mental model: one concept instead of two
- Easier to create: just make a template file
- More composable: templates can include other templates
- Less cognitive overhead

#### ✅ **Sharing Benefits**
- Templates are more granular and reusable
- Can share individual templates vs entire generators
- Easier to mix and match from different sources

## The Real Issue: What are we optimizing for?

### Current Hygen/Hypergen Model Optimizes For:
- **Discoverability**: "What generators exist?"
- **Organization**: Related templates grouped together
- **Predictability**: Consistent command structure
- **Familiarity**: Rails/Django-like generator experience

### Moon Model Optimizes For:
- **Simplicity**: One concept to understand
- **Composability**: Templates can include other templates
- **Sharing**: Granular, reusable units
- **Flexibility**: Templates can be standalone or composed

## Proposed Hybrid Approach

What if we **collapse the distinction** but keep the **organizational benefits**?

### Single Concept: "Templates" 
But allow templates to be:
1. **Standalone** (single file)
2. **Grouped** (directory with multiple files)
3. **Composable** (include other templates)

### Structure:
```
templates/
  # Standalone template
  license.liquid
  
  # Multi-file template (what we used to call "generator")
  react-component/
    template.yml      # Configuration
    component.liquid  # Main component
    test.liquid       # Test file
    style.liquid      # Style file
  
  # Composable template
  full-stack-app/
    template.yml      # Configuration with includes
    readme.liquid     # README
    # Includes other templates via URL
```

### Usage:
```bash
# Standalone template
hypergen license

# Multi-file template
hypergen react-component --name MyButton

# Composable template (includes others)
hypergen full-stack-app --name MyApp
```

### Benefits:
- **Simpler mental model**: Everything is a template
- **Organizational flexibility**: Templates can be single files or directories
- **Composability**: Templates can include other templates
- **Backward compatibility**: Existing generators become multi-file templates

## The Composability Connection

This relates directly to your composability question:

### Current Hygen Model:
- **Generators** compose **actions** 
- **Actions** compose **templates**
- Hard to reuse across generators

### Proposed Template Model:
- **Templates** compose **other templates**
- **Templates** can be standalone or grouped
- Easy to reuse and share

## Recommendation

**Yes, we should simplify the mental model to just "Templates"** because:

1. **Simpler**: One concept instead of generator/action/template hierarchy
2. **More composable**: Templates can include other templates naturally
3. **Better for sharing**: Granular reusable units
4. **Flexible**: Can be single files or directories as needed
5. **Future-proof**: Easier to add new composition features

### Migration Path:
1. **Phase 1**: Support both models simultaneously
2. **Phase 2**: Introduce new template-only commands
3. **Phase 3**: Gradually migrate documentation and examples
4. **Phase 4**: Eventually deprecate generator/action terminology

This would make Hypergen unique - **the first tool to truly nail template composability** by having the right mental model from the start.

What do you think? Should we collapse generators and templates into a single "template" concept?