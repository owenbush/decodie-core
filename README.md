<p align="center"><img src="assets/decodie-logo.png" alt="Decodie" width="200"></p>

# Decodie Core

Shared data layer for the [Decodie](https://decodie.owenbush.dev) ecosystem. Provides TypeScript types, a data parser, and a content-based reference resolver used by [decodie-ui](https://github.com/owenbush/decodie-ui) and [decodie-vscode](https://github.com/owenbush/decodie-vscode).

## What's included

- **Types** -- TypeScript interfaces for all `.decodie/` data structures (index entries, session entries, config, references, resolutions)
- **Parser** -- Reads and caches `index.json`, session files, and config. Merges index metadata with session content. Supports cache invalidation for file watchers.
- **Reference Resolver** -- Content-based anchor matching that maps entries to source code using function signatures and class declarations instead of line numbers. Handles exact, fuzzy, drifted, and stale resolution statuses.

## Installation

```bash
npm install @owenbush/decodie-core
```

## Usage

```typescript
import { DataParser, resolveReference } from '@owenbush/decodie-core';

const parser = new DataParser('/path/to/project');
const index = parser.loadIndex();
const entry = parser.getEntryWithContent('entry-1234-abcd');
```

## Zero runtime dependencies

This package uses only Node.js built-ins (`fs`, `path`, `crypto`).

## Tests

```bash
npm test
```

## Related Repositories

- [owenbush/decodie](https://github.com/owenbush/decodie) -- Main site and documentation.
- [owenbush/decodie-skill](https://github.com/owenbush/decodie-skill) -- Claude Code skill that generates `.decodie/` data.
- [owenbush/decodie-ui](https://github.com/owenbush/decodie-ui) -- Web-based presentation layer.
- [owenbush/decodie-vscode](https://github.com/owenbush/decodie-vscode) -- VSCode extension with sidebar entry browser and right-click analysis.
- [owenbush/decodie-ddev](https://github.com/owenbush/decodie-ddev) -- DDEV add-on.
