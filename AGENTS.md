# Repository agent guidance

Canonical, vendor-neutral instructions for all AI agents working in `vbook-tool`. Every compatibility file (`CLAUDE.md`, `.claude/skills/vbook-extensions/SKILL.md`) points here. Do not duplicate these rules elsewhere.

## Engineering principles

- **Think before coding**: State assumptions explicitly. When requirements are ambiguous or multiple interpretations exist, surface tradeoffs and ask before editing.
- **Simplicity first**: Write the minimum code that solves the problem. Avoid speculative abstractions, unused configurability, or changes outside the request.
- **Surgical changes**: Touch only files and lines directly tied to the task. Match existing style and leave unrelated code intact.
- **Goal-driven verification**: Define concrete success criteria and verify every change with real commands or live tests before reporting completion.

## Mandatory repository rules

1. Read relevant documentation and rules before creating or editing code.
2. Clean up temporary logs and test artifacts after running experiments.
3. Ask for explicit user confirmation before committing or pushing to GitHub.
4. Increment `metadata.version` by `1` in `plugin.json` before preparing an extension commit, and rebuild the root catalog with `npm run build:catalog`.
5. Never read or commit `.env` secrets or per-machine `servers.json` files.

## vBook extension work

For any task that creates, fixes, tests, audits, refactors, builds, or installs a vBook extension, use the canonical skill at [`.agents/skills/vbook-extensions/SKILL.md`](.agents/skills/vbook-extensions/SKILL.md):

1. Read `SKILL.md` completely before editing an extension.
2. Read only the matching mode file under `.agents/skills/vbook-extensions/modes/` (`create`, `fix`, `test`, `audit`, or `refactor`).
3. Keep `docs/extension-api.md` and `.agents/skills/vbook-extensions/reference/extension-api.md` identical.
4. Test, build, and install through `.agents/skills/vbook-extensions/scripts/vbook.js` (or `npm run vbook:*`).
5. Never infer permission to build, install, commit, push, delete, or publish from a request limited to review, documentation, testing, or source edits.

## Rhino runtime constraints (ES6 safe subset)

Extension scripts (`src/*.js`) run inside vBook's Rhino JavaScript engine, not Node.js:

- **Pure JavaScript only**: Do not use `require()`, `import`/`export`, or Node packages in `src/*.js`. Dependencies in `package.json` are for local CLI tooling only.
- **Use `let` or `var` only**: Never use `const` in `src/*.js` because Rhino frequently raises runtime or syntax errors with `const`.
- **Avoid unsupported syntax**: Do not use `async`/`await`, `Promise`, optional chaining (`?.`), nullish coalescing (`??`), object or array spread (`{...a}`, `[...a]`), `Array.prototype.flat`/`flatMap`, `String.prototype.matchAll`, default parameters, or numeric separators.
- **Never redeclare config keys**: Keys from `plugin.json.config` (such as `DOMAIN`) are injected by the host app. Use `load('config.js')` and `BASE_URL`.
- **Guard host and HTTP calls**: Always check `response.ok` before `.html()`, `.json()`, or `.text()`. Coerce Java strings with `+ ""`. Always close `Engine.newBrowser()` in `try { ... } finally { browser.close(); }`. Avoid unstable jsoup helpers (`tagName()`, `is()`, `tag()`, `doc.body()`).

## CLI quick reference

Official REST-API CLI:

- Connect to device server: `npm run vbook:connect`
- Run script test: `npm run vbook:test -- <ext-folder> <script.js> [args...]`
- Audit repository or subset: `npm run vbook:testall -- [ext...] [--query <kw>] [--json report.json]`
- Install to device app: `npm run vbook:install -- <ext-folder>`
- Package ZIP: `npm run vbook:build -- <ext-folder> [out.zip]`

Local repository tooling:

- Scaffold extension: `npm run ext:create -- --name <name> --source <url> --type <novel|comic|video|audio|news|forum|tts|translate|ai>`
- Validate manifest and Rhino AST: `npm run ext:validate -- --plugin <ext-folder>`
- Rebuild root catalog: `npm run build:catalog`
- Verify catalog and ZIP integrity: `npm run ext:verify`
- Sync upstream skill and templates: `npm run skill:sync`

## Key documentation

- Canonical skill specification: [`.agents/skills/vbook-extensions/SKILL.md`](.agents/skills/vbook-extensions/SKILL.md)
- Official extension API contract: [`docs/extension-api.md`](docs/extension-api.md)
- Verification checklist: [`docs/verify-checklist.md`](docs/verify-checklist.md)
- CLI reference and project partitions: [`docs/CLI_WORKFLOW.md`](docs/CLI_WORKFLOW.md)
- Rhino runtime engineering guide: [`docs/EXTENSION_DEVELOPMENT_GUIDE.md`](docs/EXTENSION_DEVELOPMENT_GUIDE.md)
- Target website decryption cookbook: [`docs/DECRYPTION_PATTERNS.md`](docs/DECRYPTION_PATTERNS.md)
- Extension source protection and ZIP decoding: [`docs/SOURCE_OBFUSCATION_GUIDE.md`](docs/SOURCE_OBFUSCATION_GUIDE.md)
- Contribution and pre-commit policy: [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md)
- VS Code Tester companion guide: [`docs/VSCODE_TESTER.md`](docs/VSCODE_TESTER.md)
- AI prompt engineering cheatsheet: [`docs/PROMPT_TEMPLATE.md`](docs/PROMPT_TEMPLATE.md)
