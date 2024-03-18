# Design Document

## Overview

This design outlines the modernization of the Hypergen project, focusing on four key areas: transitioning to Bun for tooling, resolving git conflicts from the multiple-template-directories feature, updating project documentation to reflect Hypergen's independent status, and establishing a foundation for future roadmap implementations.

The approach prioritizes immediate, actionable changes while setting up the project structure for future enhancements outlined in the existing roadmap.

## Architecture

### Current State Analysis

The project currently uses:
- Yarn for package management (yarn.lock present)
- npm scripts in package.json
- Git feature branch with merge conflicts
- README positioning Hypergen as a fork of Hygen
- Mixed references to both hygen and hypergen throughout documentation

### Target State

The modernized project will have:
- Bun as the primary tooling solution
- Clean linear git history with multiple-template-directories feature integrated
- Documentation presenting Hypergen as an independent project
- Consistent hypergen branding throughout
- Foundation for implementing remaining roadmap items

## Components and Interfaces

### 1. Build System Migration

**Component:** Package Management and Build Scripts
- **Current:** yarn.lock, npm-based scripts
- **Target:** bun.lockb, bun-based scripts
- **Interface:** package.json scripts section

**Migration Strategy:**
- Remove yarn.lock
- Update package.json scripts to use bun commands
- Generate new bun.lockb through dependency installation
- Maintain npm compatibility for publishing

### 2. Git History Resolution

**Component:** Version Control Integration
- **Current:** Feature branch with merge conflicts
- **Target:** Clean linear history on main branch
- **Interface:** Git repository structure

**Resolution Strategy:**
- Resolve conflicts in affected files:
  - src/config-resolver.ts
  - src/generators.ts
  - src/help.ts
  - src/params.ts
  - src/types.ts
  - Test files and yarn.lock
- Maintain functionality from both branches
- Preserve commit history through rebase

### 3. Documentation Modernization

**Component:** Project Documentation
- **Current:** Fork-focused README with hygen references
- **Target:** Independent project documentation with hypergen branding
- **Interface:** README.md and related documentation files

**Update Strategy:**
- Restructure README to lead with Hypergen identity
- Update all command examples to use hypergen
- Add acknowledgment section for Hygen origins
- Update installation instructions
- Maintain existing roadmap structure

### 4. Project Identity Consistency

**Component:** Branding and Naming
- **Current:** Mixed hygen/hypergen references
- **Target:** Consistent hypergen branding
- **Interface:** All user-facing text and examples

## Data Models

### Package Configuration
```json
{
  "name": "hypergen",
  "scripts": {
    "build": "bun run build-script",
    "test": "bun test",
    "dev": "bun run dev-script"
  }
}
```

### Git Conflict Resolution Map
```
Conflicted Files:
├── src/config-resolver.ts (merge template directory logic)
├── src/generators.ts (resolve add/add conflict)
├── src/help.ts (merge help text updates)
├── src/params.ts (merge parameter handling)
├── src/types.ts (merge type definitions)
└── yarn.lock (replace with bun.lockb)
```

### Documentation Structure
```
README.md:
├── Header (Hypergen branding)
├── Introduction (independent project)
├── Existing Roadmap (maintained as-is)
├── Features & Quick Start (updated commands)
├── Core Documentation (hypergen examples)
└── Acknowledgments (Hygen origins)
```

## Error Handling

### Git Conflict Resolution
- **Strategy:** Manual resolution with testing validation
- **Fallback:** Abort rebase and use merge strategy if conflicts are too complex
- **Validation:** Run full test suite after resolution

### Bun Migration Issues
- **Strategy:** Gradual migration with fallback to npm for problematic scripts
- **Validation:** Test all package.json scripts after migration
- **Rollback:** Keep npm as backup for critical operations

### Documentation Consistency
- **Strategy:** Systematic find-and-replace with manual review
- **Validation:** Review all examples and links for accuracy
- **Quality Check:** Ensure all hypergen commands are valid

## Testing Strategy

### Pre-Migration Testing
1. Run existing test suite with current setup
2. Document any failing tests as baseline
3. Verify multiple-template-directories functionality

### Post-Migration Testing
1. **Bun Integration Tests:**
   - Verify all package.json scripts work with bun
   - Test dependency installation and management
   - Validate build and test processes

2. **Git Integration Tests:**
   - Verify all existing functionality works after rebase
   - Test multiple-template-directories feature specifically
   - Run full test suite to catch regressions

3. **Documentation Tests:**
   - Verify all command examples in README work
   - Test installation instructions
   - Validate all links and references

### Continuous Validation
- Set up automated testing with bun
- Validate that npm publish still works for package distribution
- Monitor for any performance changes with bun adoption

## Implementation Phases

### Phase 1: IMMEDIATE - Resolve Active Git Conflicts
**CRITICAL:** There is currently an active rebase in progress that must be resolved first
- Resolve merge conflicts in the currently rebasing commit
- Complete the rebase process
- Test multiple-template-directories functionality
- Push the rebased commits to main branch
- This must be completed before any other work can proceed

### Phase 2: Bun Migration
- Install bun and generate lockfile
- Update package.json scripts
- Remove yarn.lock
- Test all build and development workflows

### Phase 3: Documentation Update
- Update README structure and branding
- Replace hygen references with hypergen
- Add acknowledgment section
- Update installation and usage examples

### Phase 4: Validation and Cleanup
- Run comprehensive test suite
- Verify all examples and documentation
- Clean up any remaining inconsistencies
- Prepare for future roadmap implementation

## Future Considerations

This design establishes the foundation for implementing the remaining roadmap items:
- File-based template routing (requires investigation and design)
- Moon's template.yml support (needs specification review)
- Generator extension and composition (requires architecture planning)
- CLI format changes (breaking change requiring migration strategy)
- Template engine flexibility (needs research and plugin architecture)

The current design focuses on immediate, actionable improvements while maintaining the project's roadmap for future development.