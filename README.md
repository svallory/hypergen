<h3 align="center">
  <img src="https://raw.githubusercontent.com/svallory/hypergen/master/media/hygen-to-hypergen.png" alt="hygen logo an arrow to the right and then the hypergen logo" height=300 />
</h3>

## What the fork?

Hygen is an awesome tool, but I needed some extra features to better support [moon-launch](https://github.com/svallory/moon-launch).
Since I needed to publish them as package in npm anyways to share with my team, why not share, right?

## Here's my wishlist (a.k.a. The Roadmap)

- [x] Support for `cjs`/`mjs` files
- [x] Multiple template directories
- [x] Action conflict resolution via `config.conflictResolutionStrategy`
    The property value would be an enum with 3 possible values:

  - `fail`: [default] stops the generation and lets the user know that templates are in conflict, and it needs to pick a strategy
  - `override`: keeps the template that appears last in the array
  - `skip`: keeps the template that appeared first skipping the ones that conflict
- [x] Make it possible to use `hygen` and `hypergen` in the same machine/project
  - [x] Change command name
  - [x] Change configuration file name
- [x] Ability to deal with hundreds of generators
- [ ] File-based template routing
  - [ ] `to:` in frontmatter becomes optional

  - [ ] Define and document renaming rules when there's no `to:` in the frontmatter (for example: automatic removal of .ejs extension)

  - [ ] All files are copied unless their path (from the generator root) contains the word "partial[s]?"
    anywhere. Meaning that:

    These would not be generated:

    - generator/**partials**/helpers.ejs
    - generator/**partial**-helpers.js
    - generator/my-**partials**-file.js
    - generator/helpers.**partial**.ts

    But these would:

    - generator/**partially**.ejs
    - generator/im**partial**-note.md

    **NOTE:** you'll be able to configure the partial matching rule via a `filterFiles` property
    which can be a regular expression or a filter function `(path: string) => boolean`.

  - [ ] Dynamic file routing

    A new configuration option that allows the template maker to define a function that will be called
    to determine where the template file should be generated:

    ```typescript
    type fileRouter = (path: string, content: string) => boolean
    ```


- [ ] Support [moon's template.yml](https://moonrepo.dev/docs/config/template) configuration file
  - [ ] Add support for generator extension via `extends`
  - [ ] Allow simple prompts to be defined via `variables` by setting `prompt` to any `string`
  - [ ] Prevent the use of prompt in `variables` and `prompt.js` at the same time

  Moon's template.yml is well thought out. I see no need to invent a new format from scratch

- [ ] Support Extension and Composition among Generators
  - [ ] **Extension:** add support for the `extends` option following the same rules moon uses
  - [ ] **Composition:**

    > **needs planning**

    Being able to compose generators means that individual actions or templates from other generators
    can be imported and executed.

    **First idea:**
    To define lifecycle hooks and allow them to be used in `template.yml` to execute:

    - external generator's actions
    - internal scripts
    - any command?


- [ ] **[breaking change]** Change the command line arguments to:

  ```shell
  hypergen PATH/TO/GENERATOR:FILE_FILTER DESTINATION [--param1 value, --param2 value, ...]
  ```

  If not provided, the destination setting configured in template.yml will be used, or you'll be prompted during generation to provide one.

  **Why?**
  This will allow hypergen to:
  - Accept a target directory
  - Simplify resolution rules
  - Reduce conflicts in generator actions

- [ ] B.Y.O.T. (T is for template engine)

  Although ejs isn't bad, I'm sure some people would prefer Mustache, Hogan, ...

  I want to see if I can use [Marko JS](https://github.com/marko-js) to be the template language
- [ ] Better documentation
  - [ ] New features
  - [ ] All configuration options
  - [ ] A schema for the configuration file

Have any wishes? [Open an issue!](https://github.com/svallory/hypergen/issues/new) 😊

### Need a customization done ASAP?

Let's chat! Checkout [my contacts here](https://about.me/saulovallory)

If you prefer to stay on Github, there's a one-time donation option in my [sponsors profile](https://github.com/sponsors/svallory?frequency=one-time&sponsor=svallory)

## What is hygen / hypergen

[![build status](https://img.shields.io/travis/jondot/hygen/master.svg)](https://travis-ci.org/jondot/hygen)
[![npm version](https://img.shields.io/npm/v/hygen.svg)](https://www.npmjs.com/package/hygen)

`hygen` is the simple, fast, and scalable code generator that lives _in_ your project.

<div align="center">
  <img src="https://raw.githubusercontent.com/jondot/hygen/master/media/hygen.gif" width=600/>
</div>

## Features

- ✅ Build ad-hoc generators quickly and full on project scaffolds.
- ✅ Local generators per project (and global, if you must)
- ✅ Built-in scaffolds to quickly create generators
- ✅ Full logic templates and rendering
- ✅ Prompts and flows for taking in arguments
- ✅ Automatic CLI arguments
- ✅ Adding new files
- ✅ Injecting into existing files
- ✅ Running shell commands
- ✅ Super fast, constantly optimized for speed

> New in hygen v4.0.0: a positional `NAME` parameter.
> Now you can use `$ hygen component new MyComponent` instead of `$ hygen component new --name MyComponent`.

## Quick Start

Hygen can be used to supercharge your workflow with [Redux](https://hygen.io/docs/redux), [React Native](https://hygen.io/docs/react-native), [Express](https://hygen.io/docs/express) and more, by allowing you avoid manual work and generate, add, inject and perform custom operations on your codebase.

If you're on macOS and have Homebrew:

```
brew tap jondot/tap
brew install hygen
```

If you have node.js installed, you can install globally with `npm` (or Yarn):

```
npm i -g hygen
```

If you like a no-strings-attached approach, you can use `npx` without installing globally:

```
npx hygen ...
```

For other platforms, see [releases](https://github.com/jondot/hygen/releases).

Initialize `hygen` in your project (do this once per project):

```
cd your-project
hygen init self
```

Build your first generator, called `mygen`:

```
$ hygen generator new mygen

Loaded templates: _templates
       added: _templates/mygen/new/hello.ejs.t
```

Now you can use it:

```
$ hygen mygen new

Loaded templates: _templates
       added: app/hello.js
```

You've generated content into the current working directory in `app/`. To see how the generator is built, look at `_templates` (which you should check-in to your project from now on, by the way).

You can build a generator that uses an interactive prompt to fill in a variable:

```
$ hygen generator with-prompt mygen

Loaded templates: _templates
       added: _templates/mygen/with-prompt/hello.ejs.t
       added: _templates/mygen/with-prompt/prompt.js
```

Done! Now let's use `mygen`:

```
$ hygen mygen with-prompt
? What's your message? hello

Loaded templates: _templates
       added: app/hello.js
```

## Use a template repo

Want to start from a repo?

```
hygen init repo antfu/vitesse --to my-folder
```

Want to start from an existing repo on an existing project?

```
mkdir your-project && cd your-project
hygen init repo antfu/vitesse
```

## What's Next?

Go to the [documentation](https://hygen.io/docs/quick-start) to get to know the rest of Hygen and generators.

If you're in a hurry:

- To learn how to edit generator templates, [look here](https://hygen.io/docs/templates)
- To see how to use generators [look here](https://hygen.io/docs/generators)
- Take a look at the [ecosystem](https://hygen.io/docs/packages) and tooling built around Hygen.

## A Different Kind of a Generator

`hygen` is a scalable generator. It has developer and team ergonomics as first priority.

It avoids "blessed" or dedicated projects that codifies code generation, which before you know it, become a product you build, needs testing, CI, separate pull request reviews, and ultimately sucks up your time and becomes this super hated thing no one likes to touch anymore.

Plus, since they are not the product you are building they become notoriously hard to reason about.

## Scratch Your Own Itch

Because `hygen` templates live _in_ your project, it cuts the time from having an itch for generating code (Redux, anyone?) in your current
project to code generated with it and others benefiting from it.

### Template Locality

`hygen` picks up a local `_templates` folder
at any folder level of your project you're working from.

This is important because:

- Templates are project-local. A git clone of the project fetches all generators as well.
- Different generators can be tucked in different parts of the project, making it contextual.
- Template locality is scalable; different teams can maintain different generators.
- When you change your code, you can make changes in the template and pack in the same commit, to be reviewed and merged in the same PR (as opposed to installing different "plugins" or different templates from out-of-repo places).

And yet, if you don't like project-local templates:

- You can have a global `_templates` folder (maybe a central git repo you maintain?) by populating an environment variable `HYGEN_TMPLS`
- You can build a [custom generator](#build-your-own) of your own with `hygen` at its core, and pack your own templates with it.

### Folder Structure is Command Structure

The templates folder structure _maps directly_ to the command structure:

```
hygen worker new jobrunner
```

For this command, `hygen worker new` maps to `_templates/worker/new` and all files within `worker/new` are rendered.

Template parameters are given with `--flag VALUE`, as many as you'd like. In this example we've set a parameter named `name` to the value `jobrunner`.

### Subcommands

A subcommand is a file inside a your folder structure. So if the structure is this:

```
_templates/
    worker/
      new/
        index.html.ejs
        setup.html.ejs
```

And you only want `setup`, you can run:

```
hygen worker new:setup
```

You can also use the subcommand as a regular expression so, these will do the same:

```
hygen worker new:se
```

```
hygen worker new:se.*
```

### Frontmatter for Decluttering

Here's how a template looks like (in our example, `index.ejs.t`). Templates bodies are [ejs](https://github.com/tj/ejs):

```javascript
---
to: app/workers/<%=name%>.js
---

class <%= h.capitalize(name) %> {
    work(){
        // your code here!
    }
}
```

The first part of the template is a [front matter](https://jekyllrb.com/docs/frontmatter/), idea borrowed from Markdown, this is the metadata part of a `hygen` template and is part of the reason of why your templates will feel more lightweight and flexible.

All frontmatter metadata _are also run through the template engine_ so feel free to use variables in the frontmatter as you wish.

There's one required metadata variable: `to`.
`to` points to where this file will be placed (folders are created as needed).

### Case changing

`hygen` provides ability to semantic case changing with `change-case` library, it's simple to use and very easy to understand.

There is a usecase for react based components generation:

```yaml
---
to: components/<%= name %>/index.jsx
---
import React from 'react'

export const <%= name %> = ({ children }) => (
  <div className="<%= h.changeCase.paramCase(name) %>">{children}</div>"
)
```

With name `HelloWorld` will be compiled to:

```js
import React from 'react'

export const HelloWorld = ({ children }) => (
  <div className="hello-world">{children}</div>"
)
```

You can see the full list [here](https://github.com/blakeembrey/change-case).

### Addition, Injection, and More

By default templates are 'added' to your project as a new target file, but you can also choose to inject a template _into_ an existing target file.

For this to work, you need to use `inject: true` with the accompanied inject-specific props.

```yaml
---
to: package.json
inject: true
after: dependencies
skip_if: react-native-fs
---
"react-native-fs":"*",
```

This template will add the `react-native-fs` dependency into a `package.json` file, but it will not add it twice (see `skip_if`).

Here are the available mutually-exclusive options for where to inject at:

- `before | after` - a regular expression / text to locate. The inject line will appear before or after the located line.
- `prepend | append` - add a line to start or end of file respectively.
- `line_at` - add a line at this exact line number.

You can guard against double injection:

- `skip_if` - a regular expression / text. If exists injection is skipped.

Also you can insert or remove empty line to injection body. That feature very useful if your editor or formatter automatically insert blank line at the end of file on save:

- `eof_last` - if falsy - trim blank line from the end of injection body, if truthy - insert it.

### Build Your Own

`hygen` is highly embeddable. You should be able to use it by simply listing it
as a dependency and having [this kind of workflow](src/bin.ts) in your binary.

```javascript
const { runner } = require('hygen')
const Logger = require('hygen/dist/logger')
const path = require('path')
const defaultTemplates = path.join(__dirname, 'templates')

runner(process.argv.slice(2), {
  templates: defaultTemplates,
  cwd: process.cwd(),
  logger: new Logger.default(console.log.bind(console)),
  createPrompter: () => require('enquirer'),
  exec: (action, body) => {
    const opts = body && body.length > 0 ? { input: body } : {}
    return require('execa').shell(action, opts)
  },
  debug: !!process.env.DEBUG
})
```

# Development

The Hygen codebase has a functional style where possible. This is because naturally, it
feeds parameters and spits out files. Try to keep it that way.

Running `hygen` locally, rigged to your current codebase (note the additional `--` to allow passing flags)

```
yarn hygen -- mailer new foobar
```

Running tests in watch mode:

```
yarn watch
```

## Metaverse Testing

The easiest way to make an impact is to use the built-in [`metaverse`](src/__tests__/metaverse) tests suite, and then add the tests [here](src/__tests__/metaverse.spec.js).

The idea here is to copy templates from any project that use `hygen` and to test that it works at all times. This keeps tabs on the hygen universe / ecosystem (nicknamed metaverse) and makes sure this test suite breaks before `hygen` clients break.

## Internal Testing

## Start Up Speed Testing

Many generators become painfully slow to use as the thing you want to generate grow (because, real life),

This is why `hygen` takes speed as a first class citizen, and sports a dedicated start-up timing suite:

```
yarn test:require
```

In addition, thought is given to which dependencies to take in, how their file structure fan out and what kind of disk access (due to `require`) would `hygen` ultimately have when we run it. This is recorded with every test run.

Bundling a single file was evaluated (and the infrastructure is still there, using `webpack`) and wasn't faster than what we have right now.

# Contributing

Fork, implement, add tests, pull request, get my everlasting thanks and a respectable place here :).

### Thanks

To all [Contributors](https://github.com/jondot/hygen/graphs/contributors) - you make this happen, thanks!

# Copyright

Copyright (c) 2018 [Dotan Nahum](http://gplus.to/dotan) [@jondot](http://twitter.com/jondot). See [LICENSE](LICENSE.txt) for further details.
