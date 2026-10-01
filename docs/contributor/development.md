# Development

## Prerequisites

- **Node.js `^20.19.0 || >= 22.12.0`** — the `engines` range `oxlint` and `oxfmt` declare. Node 21.x
  and 22.0–22.11 are not supported. CI runs the suite on Node 20, 22 and 24.
- **npm** — the repository ships a `package-lock.json`, so use `npm ci`, not yarn or pnpm. No other
  global tooling is needed.

The published bundle targets ES5 with zero runtime dependencies; that constraint is about the *output*,
not about your machine. Do not add a runtime dependency — if you believe one is unavoidable, open an
issue first and make the case.

## Getting set up

```bash
git clone https://github.com/soimy/maxrects-packer.git
cd maxrects-packer
npm ci --include=dev     # --include=dev matters when NODE_ENV=production is set in your shell
npm test                 # builds dist/ and runs the vitest suite
```

`NODE_ENV=production` makes npm skip devDependencies, which is why `--include=dev` is spelled out
everywhere in the repository's own documentation.

## Scripts

| Command | What it does |
| --- | --- |
| `npm test` | Clean build (`dist/`, `lib/`) then the full vitest suite. |
| `npm run build` | rollup bundle only; `build:clean` also removes the previous output. |
| `npm run typecheck` | Native TypeScript 7 type check; the script asserts the compiler version first. |
| `npm run lint` / `lint:fix` | oxlint over `src`, `test`, `scripts` and the docs config; baseline is 0 warnings / 0 errors. |
| `npm run format` / `format:check` | oxfmt writes back / checks, including `docs/.vitepress/*.mts`. |
| `npm run cover` | Coverage run plus the artifact self-check; writes `test/coverage/` (gitignored). |
| `npm run verify:package` | Packs a tarball, installs it into a temp consumer and consumes it **by package name**; compile the type fixture under `bundler`, `node16` and `nodenext`. Needs a build first. |
| `npm run verify:docs` | Asserts the documentation boundary: tracked source, ignored build products, and what `docs:clean` may delete. |
| `npm run docs:build` | Generates `docs/api/`, builds the site into `docs/.vitepress/dist/`, writes the legacy-URL redirects, then checks the output. |
| `npx vitest run test/maxrects-bin.spec.js` | A single spec, no rebuild needed. |

## Worktrees

Parallel or isolated work belongs in a linked worktree under `.worktrees/` (gitignored), so experiments
never leak into the repository root:

```bash
git worktree add .worktrees/<branch> -b <branch>
cd .worktrees/<branch>
npm ci --include=dev      # each worktree has its own node_modules and dist
```

Never commit `dist/`, `docs/api/`, `docs/.vitepress/{cache,dist}/`, `test/coverage/`, `node_modules/` or
`.worktrees/`. The tracked documentation under `docs/` is source, not output — see
[documentation](./documentation.md).

## Code style

- **oxfmt owns formatting**: 4-space indentation, double quotes, semicolons, printWidth 120, no
  trailing comma, no space between a function name and its parentheses. Run `npm run format` before
  committing instead of aligning anything by hand.
- **oxlint** reports warnings but only errors fail CI; four rules are deliberately set to `warn`
  (`no-console`, `no-unused-vars`, `no-unneeded-ternary`, `jsdoc/require-property-type`). Keep the run
  at 0/0 anyway, and use `// oxlint-disable-next-line <rule>` for a genuine exception rather than
  loosening the config.
- Keep explicit `public` / `private` modifiers, and give new public API JSDoc: `@param` entries use a
  `- ` separator, `@property` entries carry a type. The API reference on this site is generated from
  those comments.
- Line endings are LF everywhere (`.gitattributes` sets `* text=auto eol=lf`); configure your editor
  instead of committing CRLF.

## Branching

Branch off `master` with `type/short-slug`, matching the commit type you intend to use —
`fix/updatebinsize-edgy-placement`, `feat/non-exclusive-tags`, `docs/contributing-guide`. Include the
issue number when there is one: `fix/54-expanding-one-dimension`. One logical change per branch;
unrelated cleanups belong in their own pull request.