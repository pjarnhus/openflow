Last updated at planning: TypeScript 6, Bun test, ESLint 10, Prettier 3, OpenCode V2 plugin.

# Code Standards

## Project Conventions

- Write TypeScript in strict mode. Never use `any`. Use `unknown` and narrow it with `isRecord` or an explicit cast.
- Use ESM. Use `import type` for type-only imports. `verbatimModuleSyntax` enforces this.
- Format with Prettier: 2 spaces, no semicolons, double quotes, width 88, trailing commas. Run `npm run format`.
- Name files in snake_case: `set_definition.ts`, `term_definitions.ts`.
- Name functions and variables in camelCase. Name types and interfaces in PascalCase.
- Annotate every tool object with `ToolDefinition` from `utils/schema.ts`.
- Build tool input schemas with `str`, `boolOpt`, `enumSchema`, and `objSchema`. Do not write raw JSON schema objects in tool files.
- Return tool results as `{ content: string }`. Report expected failures with `err(message)`. Do not throw for expected failures.
- Keep comments for non-obvious constraints. Do not narrate the code.
- Run `npm run check` before every commit.

## Module Boundaries

- `index.ts` only registers tools. It contains no domain logic.
- `tui.ts` only registers keymap commands and config dialogs. It contains no glossary logic.
- `tools/*.ts` run one operation each. They call the glossary domain and return a message.
- `utils/term.ts` owns all term writes and the shared read helpers.
- `utils/config.ts` owns `.openflow.json` and project root resolution.
- `utils/schema.ts` owns the JSON schema builders and `ToolDefinition`.
- `utils/state.ts` owns the active signal. Do not add other process state.
- `commands/*.ts` own TUI commands and receive `Plugin.Context`.
- Allowed imports: `node:*`, `@opencode/plugin`, `@opencode/plugin/tui`, `@opencode/plugin/promise/tool` (type only), `solid-js`, and relative project modules.
- Do not import `@opencode/schema`, `effect`, or other transitive dependencies directly. Use the public subpaths of `@opencode/plugin`.
- Do not put tests, configs, or `node_modules` inside `plugins/openflow`. OpenCode symlinks that directory into `~/.config/opencode/plugins`.
- Put dev tooling at the repo root. Put tests in `tests/`.

## Data Handling

- Store one term per JSON file in the configured terms directory. Name the file `slugify(term.term) + ".json"`.
- Treat `.openflow.json` as the only source of the terms directory and index path.
- Never write `_index.json` by hand. Call `regenerate()`.
- Append to `_decision_log.jsonl`. Never rewrite or truncate it.
- Mark a proposal resolved with `resolved: "accepted: <rationale>"` or `"rejected: <rationale>"`. A proposal without `resolved` is open.
- Never change a deprecated term through `setDefinition` or `setImplementation`. Reactivate it with `promoteStatus` during consolidation.
- Never change a ratified field through `proposeChange`. Proposals are append-only.
- Keep `aliases` and `related_terms` as string arrays. Do not use them for status changes.
- Read term files with `readTerm`. Do not parse term JSON in tool files.
- Read-only queries may use `fs` directly when they scan the directory. Writes must go through `utils/term.ts`.

## Testing

- Use Bun test. Do not add another test runner.
- Put test files in `tests/` and mirror the source tree. `tests/utils/term.test.ts` tests `plugins/openflow/utils/term.ts`.
- Name test files `<module>.test.ts`.
- Import the module under test with a relative path: `../../plugins/openflow/utils/term`.
- Use `tests/helpers.ts`: `createTempProject()`, `makeTerm()`, `writeTermFile()`, `callTool()`, `readDecisionLog()`.
- Create a temp project in `beforeEach`. Call `project.cleanup()` in `afterEach`.
- Call tools through `callTool(tool, input)`. Do not pass a context argument.
- Mock external modules with `mock.module()` before a dynamic `await import()`.
- Assert on the returned `content` string and on file side effects. Do not assert on module internals.
- Run `npm test` for the suite. Run `npm run test:coverage` for coverage.
- Keep every test independent. Do not depend on execution order.

## Known Pitfalls

- `initConfig()` reads `location.project.directory`. A context without that path leaves the root unset.
- `utils/config.ts` and `utils/state.ts` hold module-level state. Re-initialize them in each test.
- `getTermsDir()` keeps the trailing slash from the configured location. Compare against the configured string, not a normalized path.
- `JSON.parse` results are not validated. A malformed term file throws at read time.
- `nextProposalId()` uses `proposals.length + 1`. Deleting proposals breaks the sequence.
- `regenerate()` counts open proposals with `!p.resolved`. Do not use the `in` operator on `resolved`.
- `regenerate()` does not create the index directory. Create the terms directory first.
- Prettier ignores `*.md`. Do not format `templates/` or `docs/` with Prettier.
- Keep TypeScript below 6.1.0. `typescript-eslint` 8.72 does not support TypeScript 7.
- Keep module mocks in the test file that needs them. Do not rely on a mock from another test file.
