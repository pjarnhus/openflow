# Tool Stack

## Summary

| Area | Choice | Version |
|---|---|---|
| Plugin host | OpenCode V2 | host-provided |
| Plugin SDK | `@opencode/plugin` | 2.1.4 |
| Language | TypeScript | 6.0.3 |
| Module system | ESM (`"type": "module"`) | — |
| Type checker | `tsc --noEmit` | 6.0.3 |
| Package manager | npm | 11.19.0 |
| Node.js (tooling) | Node.js | 24.21.0 |
| Test runner | Bun test | 1.4.4 |
| Linter | ESLint | 10.13.0 |
| TypeScript lint rules | `typescript-eslint` | 8.72.0 |
| ESLint base rules | `@eslint/js` | 10.0.1 |
| Lint/format bridge | `eslint-config-prettier` | 10.1.8 |
| Formatter | Prettier | 3.9.10 |
| Node types | `@types/node` | 24.19.2 |
| Bun types | `@types/bun` | 1.4.4 |
| UI primitives | `solid-js` | 1.9.17 |
| CI | GitHub Actions | `ubuntu-latest`, Node 24 |

All versions are locked by `package-lock.json`. CI installs with `npm ci`.

## Language and module system

- Write TypeScript only. Do not add JavaScript source files.
- Use ESM. `package.json` sets `"type": "module"`.
- `tsconfig.json` sets `module: "preserve"` and `moduleResolution: "bundler"`. This matches the ESM-only `@opencode/plugin` package.
- `tsconfig.json` enables `strict`, `noUnusedLocals`, `noUnusedParameters`, `isolatedModules`, and `verbatimModuleSyntax`.
- Use `import type` for type-only imports. `verbatimModuleSyntax` requires it.
- Target `ES2022`. Library set is `["ES2022"]`.
- The compiler runs with `noEmit`. There is no build step and no output directory.

## Runtime

- OpenCode loads `plugins/openflow/index.ts` and `plugins/openflow/tui.ts` directly. It transpiles TypeScript at load time.
- OpenCode runs on Bun. Do not use Node-only APIs that Bun does not implement.
- Plugin code uses `node:fs` and `node:path` only. It makes no network calls.
- `solid-js` is a devDependency. The OpenCode host supplies the runtime copy. The repo needs it for type checking and tests.

## Package management

- Use npm. The lockfile is `package-lock.json`.
- Install with `npm install`. Reproduce with `npm ci`.
- Add runtime-independent tooling as `devDependencies`. The plugin ships no `dependencies`.
- Bun is installed as a devDependency (`bun@1.4.4`). npm installs it, Bun runs the tests. No global Bun install is required.

## Test framework

- Use Bun test. It is the only test runner in the project.
- Test files live in `tests/` and mirror the source tree.
- Run the suite with `npm test`. Run coverage with `npm run test:coverage`.
- Bun test uses Jest-compatible `describe`, `test`, and `expect` from `bun:test`.
- Module mocks use `mock.module()` from `bun:test`.

## Static analysis and formatting

- ESLint uses the flat config in `eslint.config.js`.
- Rule sets: `@eslint/js` recommended plus `typescript-eslint` recommended. Type-aware rules are not enabled.
- Prettier uses `.prettierrc.json`: width 88, 2 spaces, no semicolons, double quotes, trailing commas.
- `eslint-config-prettier` disables rules that conflict with Prettier.
- Prettier ignores `*.md` through `.prettierignore`. Markdown is not formatted by tooling.
- `npm run check` runs typecheck, lint, format check, and tests in that order.

## Commands

| Command | Action |
|---|---|
| `npm install` | Install dependencies |
| `npm ci` | Install from the lockfile |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `eslint .` |
| `npm run format` | `prettier --write .` |
| `npm run format:check` | `prettier --check .` |
| `npm test` | `bun test` |
| `npm run test:watch` | `bun test --watch` |
| `npm run test:coverage` | `bun test --coverage` |
| `npm run check` | All gates |

## Version rules

- Pin TypeScript to `~6.0.3`. `typescript-eslint` 8.72 requires TypeScript `<6.1.0`. Do not install TypeScript 7 while this lint toolchain is in use.
- Keep `@opencode/plugin` on the OpenCode V2 line. A host upgrade can require a matching SDK upgrade.
- Keep `@types/node` on the major version of the Node runtime used for tooling. CI uses Node 24.
- Update Prettier, ESLint, and their plugins together. A major ESLint upgrade can require a new `@eslint/js` major.
- Commit `package-lock.json` with every dependency change.

## Not used

| Tool | Reason |
|---|---|
| Vitest, Jest, Mocha | Bun test is the runner. One runner only. |
| `ts-node`, `tsx` | Bun runs TypeScript directly. |
| webpack, esbuild, tsup, Rollup | OpenCode loads the source. There is no bundle. |
| pnpm, Yarn | npm is the installer. |
| TypeScript 7 | Not supported by `typescript-eslint` 8.72. |
| Type-aware ESLint rules | Deferred. Enable after the current rule set is stable. |
