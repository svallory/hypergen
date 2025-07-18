# my-test-generator Generator

Test generator for React components

## Usage

```bash
hypergen action my-test-generator --name=my-my-test-generator
```

## Parameters

- **name** (required): my-test-generator name
- **type**: Component type (default: "functional")
- **withProps**: Include props interface (default: true)
- **withStorybook**: Generate Storybook stories (default: false)
- **styling**: Styling approach (default: "css")

## Examples

```bash
# Basic usage
hypergen action my-test-generator --name=example-my-test-generator

# With all options
hypergen action my-test-generator --name=my-my-test-generator --type="functional" --withProps=true --withStorybook=false --styling="css"
```

## Generated Files

This generator creates the following files:

- Component.tsx
- Component.test.tsx
- Component.stories.tsx
- index.ts

## Configuration

You can customize the generator by modifying:

- `actions.ts` - Action implementation
- `template.yml` - Variable definitions and examples
- `templates/` - Template files
- `README.md` - Documentation

## Framework

This generator is configured for: **react**

## Category

Category: **custom**

## Author

Unknown
