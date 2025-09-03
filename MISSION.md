# Hypergen Mission and Goals

This document describes the Hypergen mission and goals. These definitions are our North Star and
ALL development MUST move us toward completing our mission and, more specifically, contribute to
a specific goal.

## Mission

To create a tool and ecosystem for code generation that allows development to be accelerated and, 
more importantly, standardized, helping both developers and AI Agents to produce correct code with
less effort.

## Values

- Convention over Configuration
  We think a lot about what's best for the users, but don't assume that's good for everyone.
  We provide lots of configuration options, but require almost none.

- Keep the Cognitive Burden Low
  - Progressive discovery: allow users to learn as they go, requiring minimal upfront learning
  - "easy to use" is better than "does everything"

## Goals

There's only one goal: make everything easy. To make the goal itself easy to follow, we break it down into 5 subgoals.

### Creating Templates Must Be Easy

#### Create from Code

Our CLI will allow users to create templates from existing code. Optionally, users can connect an AI provider
to improve the template generation.

### Using Templates Must Be Easy

#### Easy-to-Use CLI Tool

- Well organized, hierarchically structured commands
- Follows REST philosophy: `hypergen AREA|RESOURCE [sub-resource] ACTION`
  Examples from GitHub's `gh` tool:
    - `gh auth login` - area: auth, action: login
    - `gh repo create` - area: repo, action: create
    - `gh repo autolink create` - resource: repo, sub-resource: autolink, action: create
- Autocomplete
- Awesome help information available and specialized at each level
  Examples (each returns a specific help section):
    - `gh --help`
    - `gh repo --help`
    - `gh repo autolink --help`
    - `gh repo autolink create --help`

#### Easy on the Heart (worry free)

Think: what are the main concerns and questions a developer would have when using a template?

To answer this we need to think of, at least, two scenarios:

1. When using the template on a new/empty project
   - How do I choose the right template/pack? (when there's more than one option)
   - What tech stack will this template apply?
   - What shape will the project have?

2. When using the template on an existing project
   - What files will the template generate?
   - What happens if a file already exists?
   - Will the template mess with my git repository?


Also, in any scenario, there are these questions:

- Is this template safe to use?
   - Will it overwrite my code?
   - Will it execute any commands, shell scripts, or arbitrary code?
   - Can the template send information over the internet?
   - Will the template steal sensitive data?

 - What code, if any, will this template execute?

##### What can we do to address this concerns

- Explicit trust mechanism with different levels: template/action, pack, and creator (GitHub and npm user/org)
- Transparency on what will happen
- Use AI to check the template and flag suspicious code
- **Most importantly:**
  - NEVER overwrite content without permission
    - Offer visual diff when merging files
  - ALWAYS ask for permission before running commands (permission grants can be cached)

### Sharing Templates Must Be Easy

We'll allow users to share standalone templates or Packs which contain one or more templates.

#### Multiple Template Locations

Following the Progressive Discovery value, we'll allow the users to share the templates:

- with their teammates: using a local project folder called `templates` (configurable)
- across projects: using a folder in their home `~/.config/hyperdev/templates`
- with their company: using a private Git repository
- with the world: via a public Git repository or an npm package

#### CLI commands

The CLI will provide the `pack` command with subcommands for initializing and validating Hypergen Packs

### Discovering Templates and Packs Must Be Easy

#### The `search` command

- Searches packs and templates using the GitHub and npm APIs
- Results are returned with all stats that are relevant for decision making
  
### Maintaining Templates and Packs Must Be Easy

#### Actions Over Hard-Coded Values

Templates can replace code that gets outdated fast (like package versions) with actions 
that get the content when the template is executed (like `npm install`).

#### Allow New Versions of a Template to Update Previous Versions

When a template is updated, users should be able to apply those updates to projects previously generated 
with older versions. This requires:
- Template versioning and change tracking
- Intelligent merging of updates with user modifications
- Clear communication about what changes will be applied

## Constraints

### Technical Constraints
- Initially we'll only support Claude Code integration
  https://docs.anthropic.com/en/docs/claude-code/sdk/sdk-typescript
- Focus on JavaScript/TypeScript ecosystem first (npm, Node.js tooling)
- Templates must work cross-platform (Windows, macOS, Linux)

### Scope Constraints  
- **Not a build system** - we generate code, not compile/bundle it
- **Not a package manager** - we orchestrate existing tools like npm/bun
- **Not an IDE** - we integrate with existing development environments
- **Not a deployment tool** - we focus on code generation and setup

### Security Constraints
- All remote template execution must go through explicit trust mechanisms
- No automatic code execution without user consent
- All network requests must be transparent and logged
- Template sources must be cryptographically verifiable when possible

## Non-Goals

Things we explicitly choose **not** to do:

- **Complex enterprise workflows** - Keep it simple for individual developers and small teams
- **Visual/GUI template editors** - CLI-first, though integrations welcome
- **Template marketplace** - Leverage existing ecosystems (npm, GitHub)
- **Language-specific features** - Stay language-agnostic where possible
- **AI code generation** - We orchestrate templates, not generate novel code

## Success Metrics

We'll know we're succeeding when:

- **Developer Adoption**: Solo developers choose Hypergen over manual setup
- **Time Savings**: 80% reduction in project setup time for common stacks  
- **Trust**: Developers feel confident running external templates
- **Community Growth**: Active template sharing ecosystem emerges
- **AI Integration**: AI agents successfully use Hypergen for code scaffolding

## Decision Framework

When evaluating features or changes, ask:

1. **Does this make templates easier to create, use, share, discover, or maintain?**
2. **Does this align with our values (convention over configuration, low cognitive burden)?**
3. **Does this serve individual developers and small teams primarily?**
4. **Is this the simplest solution that could possibly work?**
5. **Does this increase or decrease trust and transparency?**

If the answer to any of these is "no" or unclear, the feature likely doesn't belong in Hypergen.