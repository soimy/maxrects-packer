# AGENTS.md

Repository-level guide for AI coding agents working on `maxrects-packer`.
Human contributors should start with [CONTRIBUTING.md](./CONTRIBUTING.md) instead.

## Project

`maxrects-packer` (v2.7.4, MIT, zero runtime dependencies) is a **MaxRects 2D bin packing** library
written in TypeScript. It aims to pack arbitrary `{width, height}` rectangles into as few bins as
possible, each staying within `maxWidth × maxHeight` (sprite sheets / texture atlases).

- **Packing is a heuristic, not an optimal solver — never claim a minimum bin count.** `addArray()`
  sorts the input, `add()` first-fits each rect into the existing bins in order, and inside a bin
  `findNode()` greedily takes the best-scoring free rectangle for `options.logic`. Nothing searches
  for a global optimum, so a change may only ever claim "fewer bins than before **on these inputs**",
  measured — never "the fewest possible".
- Geometry only: it never reads or writes images or files and depends on no DOM/Node API, so it runs
  in the browser as well.
- The target use case is WebGL/atlases: opening another bin is preferred over emitting a single
  gigantic image.
- It is a rewrite of [Multi-Bin-Packer](https://github.com/marekventur/multi-bin-packer) and the
  public API is kept compatible, so do not change signatures casually.

## Layout

| File | Responsibility |
| --- | --- |
| `src/index.ts` | The only barrel export. Runtime values: `Rectangle / MaxRectsPacker / PACKING_LOGIC / Bin / MaxRectsBin / OversizedElementBin`; types: `IRectangle / IOption / IBin` |
| `src/types.ts` | `IOption`, `PACKING_LOGIC` (MAX_AREA/MAX_EDGE/FILL_WIDTH), `EDGE_MAX_VALUE=4096`, `EDGE_MIN_VALUE=128` (**never used inside the library, but re-exported by `src/maxrects-packer.ts` and part of the public `.d.ts` — not dead code, do not delete**) |
| `src/geom/Rectangle.ts` | `IRectangle` interface + `Rectangle`: `width/height/x/y/rot/data/allowRotation` all go through getters/setters and bump `_dirty` on every mutation; the `rot` setter swaps width/height, the `data` setter syncs `data.allowRotation` |
| `src/abstract-bin.ts` | `IBin` / abstract `Bin<T>`: the `dirty` semantics and `setDirty()`; `add/reset/repack/clone` are left to subclasses |
| `src/maxrects-bin.ts` | Core single-bin algorithm: `place → findNode(scoring) → updateBinSize(expand) → splitNode(split) → pruneFreeList` |
| `src/oversized-element-bin.ts` | Placeholder bin for one oversized element (`rect.oversized = true`, `add()` always returns `undefined`) |
| `src/maxrects-packer.ts` | Multi-bin scheduling: `add / addArray / next / repack / save / load / sort / rects` |

Data flow:

```
caller's rects
  → addArray: sort (MAX_EDGE|MAX_AREA, ties broken by hash; group by tag first when tags are not exclusive)
  → add: out of bounds? → OversizedElementBin; otherwise take the first bin from bins[_currentBinIndex..] that fits
  → MaxRectsBin.place: findNode scores free rects by logic → updateBinSize grows the bin (pot/square) → splitNode splits → pruneFreeList
  → write x/y/rot back onto that very rect in place and push it into bin.rects
```

## Invariants you must preserve

1. **In-place mutation**: `add()/addArray()` write `x/y/rot/oversized` directly onto the object passed
   in and return that same object (only the multi-argument overloads construct an internal
   `new Rectangle`).
2. **Tag grouping**: with `exclusiveTag: true` (the default) a tagged rect may only enter a bin with
   the same tag, and an untagged bin refuses tagged rects — there is one such check in
   `MaxRectsBin.add()` and another in `place()`, so both must change together. `exclusiveTag: false`
   takes the grouping + recursion path inside `addArray()`.
3. **`next()` only affects what comes after**: it sets `_currentBinIndex = bins.length`, so earlier
   bins stop accepting new elements and every lookup starts at that index.
4. **Dirty propagation**: mutating a `Rectangle` property increments `_dirty`; `Bin.dirty` is true
   when its own `_dirty > 0` or any of its rects is dirty; `repack(quick=true)` only re-packs dirty
   bins. Changing setter semantics breaks incremental repack.
5. **save/load store free space only**: bins produced by `save()` always carry an empty `rects` array
   — dimensions/options/tag/freeRects only; `load()` restores free rectangles only. Already-placed
   rects have to be re-`add`ed by the caller (tests lock this behavior in — do not "helpfully" fill
   it in).
6. **Size accounting**: the initial freeRect is `maxWidth + padding - border*2`; placement probes with
   `rect.width + padding`; inside `updateBinSize`, pot/square are rounded first and only then
   validated against `maxWidth/maxHeight`, and growth is abandoned when that check fails.
7. **Generics**: `MaxRectsPacker<T extends IRectangle>` / `MaxRectsBin<T>` accept instances of custom
   classes and preserve their extra properties as-is.

## Commands

```bash
npm ci --include=dev         # NODE_ENV=production makes npm skip devDeps, so --include=dev is required
npm test                     # = rimraf dist + lib, rollup build, jest
npm run typecheck            # native TypeScript 7; scripts/typecheck.mjs asserts the tsc version first
npm run verify:package       # npm pack → install into a temp consumer → verify require/import by package name (build first)
npm run lint                 # oxlint (baseline is 0 warnings / 0 errors)
npm run lint:fix             # oxlint --fix
npm run format               # oxfmt writes back; CI only checks, via npm run format:check
npm run cover                # build + jest --coverage
npm run doc                  # typedoc → docs/ (not tracked by git)
npx jest test/maxrects-packer.spec.js   # run a single spec (no rebuild needed)
```

- Toolchain: rollup + `@rollup/plugin-typescript` for bundling, jest + ts-jest for tests,
  oxlint/oxfmt for linting and formatting, `commit-and-tag-version` for releases.
- **Lint enforcement**: `oxlint` reports warnings but **only errors fail CI**, even though the baseline
  is genuinely `0 warnings / 0 errors`. Four rules in `.oxlintrc.json` are deliberately set to `warn`
  (`no-console`, `no-unused-vars`, `no-unneeded-ternary`, `jsdoc/require-property-type`), so they are
  advisory only — `npm run lint` exits 0 with a warning present. Adding `--deny-warnings` to the
  `lint` script is what would make them blocking; that has not been done on purpose.
- **Dual TypeScript (the official 6/7 side-by-side setup)**: the `typescript` alias points at
  `@typescript/typescript6`, which provides the JS compiler API consumed by typedoc / ts-jest / the
  rollup plugin; `@typescript/native` is native TS 7 and `node_modules/.bin/tsc` points at it. So
  `npm run typecheck` runs TS 7 while the build, docs and tests run the TS 6 API. Both sides matter
  when you touch tsconfig: TS 7 removed `baseUrl` / `moduleResolution: node10` / `target: es5`, which
  is why `tsconfig.json` (type checking) stays clean, while `target: es5` in `tsconfig.build.json` is
  kept quiet for TS 6 by `ignoreDeprecations: "6.0"`. `@typescript/typescript6` is a forwarding
  shim, not a compiler: `lib/typescript.js` is the single line
  `module.exports = require("@typescript/old")`, and `@typescript/old` is its own dependency on the
  stock `typescript@^6`. `require("typescript")` therefore still yields the TS 6 JS API, while
  `node_modules/.bin/tsc6` is the unambiguous way to run TS 6 and `.bin/tsc` stays native TS 7.
- Test specs are CommonJS-style JS that `require("../src/xxx")` straight from the TypeScript sources
  (ts-jest ESM preset) — **they do not test `dist`**. A broken build or a broken artifact is
  invisible to them, so compare `dist` by hand whenever you touch the build.
- Baseline: `6 suites / 66 passed / 2 skipped`, ~95% statement coverage. `collectCoverage: true`
  means **every test run rewrites `test/coverage/`** (gitignored) — including a single-spec run,
  which leaves a misleading partial figure behind, so always read coverage from a full `npm run
  cover`.
- The two `test.skip`s in `test/efficiency.spec.js` are the bulk comparison table driven by
  `scenarios.json` + `ascii-table`; they only run once un-skipped by hand.
- CI: `.github/workflows/node.js.yml` (Node 20/22/24: lint → format:check → typecheck → cover →
  verify:package); `release.yml` is triggered by `v*` tags.

## Worktrees

The **default worktree location for this repository is `.worktrees/`**: when you need parallel or
isolated changes, create a linked worktree under the repository root rather than outside it.

```bash
git worktree add .worktrees/<branch> <branch>      # existing branch
git worktree add .worktrees/<branch> -b <branch>   # new branch
git worktree remove .worktrees/<branch>            # clean up when done
```

- `.worktrees/` is in `.gitignore`; never commit it, and never put version-controlled files in it.
- Each worktree is a separate working directory: `node_modules/`, `dist/`, `lib/` and
  `test/coverage/` are not shared, so run `npm ci --include=dev` on first use or `npm test` will fail
  on missing dependencies or pick up stale artifacts.
- The main worktree (repository root) is still the default place to work; reach for `.worktrees/`
  only when isolation is genuinely needed.

## Contribution rules

**Every piece of repository communication is written in English** — commit messages, PR titles and
descriptions, issue reports and comments, code comments and documentation. This library is a
dependency of software all over the world, and `CHANGELOG.md` is generated from commit messages, so
English keeps the project history usable for every contributor and every downstream consumer.

- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/):
  `type(scope): subject`, imperative mood, lower-case subject, no trailing period. Types used so far:
  `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`.
- **A PR title must itself be a valid conventional commit.** The repository sets
  `squash_merge_commit_title: PR_TITLE`, so the pull request title becomes the commit subject on
  `master` — which is what `commit-and-tag-version` parses to build `CHANGELOG.md`. Retitling the PR
  is therefore the way to correct the type. `feat:`/`fix:` land under Features/Bug Fixes while
  `chore:`/`docs:`/`ci:`/`build:`/`test:`/`refactor:` stay hidden from the changelog — pick the type
  for its user-visible effect, not for the size of the diff.
- **A breaking change must be marked in a commit message**, either with `!` (`feat!:`) or with a
  `BREAKING CHANGE:` footer. The squash commit body is assembled from the branch's commit messages
  (`squash_merge_commit_message: COMMIT_MESSAGES`), so a footer written only in the PR description
  never reaches `master` — and then `commit-and-tag-version` cuts a minor (for `feat`) or a patch
  (anything else) instead of a major.
- **Never hand-edit `CHANGELOG.md` or the version in `package.json`** — `commit-and-tag-version` owns
  both.
- Keep a PR to one logical change, and state in the description what you verified and how.
- New public API needs JSDoc; a behavior change needs a test that fails before the change and passes
  after it.
- Report suspected security issues privately to the maintainer rather than in a public issue — see
  the "Security" section of [CONTRIBUTING.md](./CONTRIBUTING.md).

## Conventions

- Read the relevant `src` module before changing it (algorithm work usually couples
  `place/findNode/updateBinSize` together).
- Formatting is `oxfmt`'s job (4 spaces, double quotes, semicolons, printWidth 120, no trailing
  comma, no space between a function name and its parentheses) — never align by hand. Keep explicit
  `public/private` modifiers, and give new public API JSDoc (`@param` with a `- `, `@property` with a
  type).
- Line endings are LF everywhere (`.gitattributes` has `* text=auto eol=lf`) — do not let an editor
  flip them back to CRLF.
- Run `npm test` after any algorithm change: the randomized monkey tests in `maxrects-bin.spec.js`
  (overlap + out-of-bounds assertions) are the main regression net. For edge cases with fixed input,
  add explicit assertions instead of relying on randomness.
- Commits follow conventional commits (`feat/fix/chore/docs`) and `commit-and-tag-version` generates
  `CHANGELOG.md`; do not bump versions by hand.

## Known pitfalls (treat as current behavior — do not "fix" them into something else)

- **ES5 output is the only thing blocking an esbuild/rolldown pipeline**: `target: es5` in
  `tsconfig.build.json` makes the tsc family the only compiler path that can emit ES5 (esbuild fails
  outright with `Transforming const to the configured target environment ("es5") is not supported
  yet`). Should ES5 compatibility ever be dropped, the build can move wholesale to esbuild/rolldown
  and the dependency on the TS 6 JS API goes away with it.
- `typedoc` only supports the TS 6 JS API so far (peer `… || 6.0.x`), which is exactly why
  `typescript` has to stay aliased to 6.x; the alias can become a real `typescript@7` once typedoc
  supports TS 7.
- **npm does not reconcile an `npm:` alias change in an existing lockfile.** Swapping a dependency
  from a plain name to an alias (or back) and running `npm install` leaves the old resolution in
  place — silently: it reports `up to date`, and the entry keeps the pre-alias package (with no
  `name` field of its own), so `npm ci` installs that instead and the alias never appears (its bin,
  `tsc6`, is missing from `node_modules/.bin`). Reproduced on npm 10.9.8 and 12.0.2, with and without
  `--package-lock-only`; [npm/cli#4592](https://github.com/npm/cli/issues/4592) is the same family of
  alias/lockfile bugs and is still open. Remedy: delete the stale `node_modules/<name>` entry from
  `package-lock.json`, re-run `npm install --package-lock-only`, then confirm the entry carries the
  alias target in its `name` field — `scripts/typecheck.mjs` asserts exactly that, so CI catches a
  regression. `npm ls <name>` is **not** a usable check here: this environment sets
  `NODE_ENV=production`, which hides every devDependency from `npm ls` unless `--include=dev` is
  passed, so the tree looks empty in the broken and the fixed state alike.
- `MaxRectsBin.reset(true, true)` replaces `options` with an incomplete object: `exclusiveTag`/`logic`
  are missing and `square` becomes `true` (unlike the class default).
- `packer.add(w, h, undefined)` throws `TypeError` when `options.tag === true` (`rect.data.tag`; the
  single-argument branch has an `&&` guard, this one does not).
- **Per-rect `allowRotation` is much narrower than it looks.** Only `MaxRectsBin.place()` honours it,
  and only when the rect object itself carries an own `_allowRotation` property — true for `Rectangle`
  instances (its `data` setter maintains it) but **not** for the plain `{width, height}` objects the
  README advertises. On top of that, `MaxRectsPacker.add()` decides "oversized" from
  `options.allowRotation` alone, so a per-rect `allowRotation: true` **cannot** rescue a rect that
  only fits when rotated while the packer option is `false` — it goes straight to
  `OversizedElementBin`. Measured on the built bundle; the spec named "Per rectangle allow rotation"
  only covers rects that already fit unrotated, so it does not catch this.
- Packaging / entry points: `package.json` is `"type": "module"`, so a `.js` file inside the package
  is parsed as ESM by Node — which is why `main` must point at `.cjs`
  (`dist/maxrects-packer.cjs`). Historically `main` pointed at the UMD `.js`, and `require()` returned
  an empty object for three and a half years. Two gates protect the entry points: `postbuild` runs
  `scripts/verify-entry.mjs` (fast, checks file paths) and CI runs `npm run verify:package` (slow —
  `npm pack`s a real tarball, installs it into a temp consumer and verifies `require`/`import` by
  **package name**). Both will stop you after a change to the entry points, `files` or artifact names.
  There is still no `exports` field, so deep imports (`maxrects-packer/dist/...`) work; adding one
  would seal off deep paths, which is breaking and therefore reserved for 3.0.0.
- Published content is decided by the `files` allowlist in `package.json`: `dist` + `src` +
  `assets/{custom.css,custom.js,favicon.ico}` + `CHANGELOG.md` + `tsconfig*.json` + `typedoc.json`
  (measured `npm pack`: ~62kB / 30 files — the byte count drifts slightly between builds, the file
  count does not; the published 2.7.4 tarball was 67.0kB / 33 files). The differences from 2.7.4 are
  all deliberate: `eslint.config.js`, `.eslintrc.json` and `.github/workflows/node.js.yml` are no
  longer published, `dist/maxrects-packer.cjs` is new, and `UPGRADE_SUMMARY.md` was deleted as an
  obsolete dependency-upgrade log. There is **no `.npmignore`**, so npm falls back to `.gitignore`
  (which lists `dist`/`lib`), but `files` wins and `dist` still ships. Note that `assets/*.png` is not
  in the allowlist (2.7.x did not ship it either), so the README images stay broken on the npm page;
  adding the whole `assets` directory would fix that at the cost of growing the tarball from ~62kB to
  ~530kB (`assets/` is 468kB, mostly uncompressed PNG). `clean` removes both `dist` and the legacy
  `lib`.
- The `resolved` fields in `package-lock.json` must point at `registry.npmjs.org`: this machine has a
  China-based npm mirror configured at the user level, and regenerating the lockfile through it
  rewrites every absolute tarball URL to the mirror host, which breaks `npm ci` for everyone else
  (this was P1 in the PR #68 review). After regenerating, confirm
  `grep -c mirrors.cloud.tencent.com package-lock.json` is 0; if needed, `sed` the host name back to
  npmjs (paths and integrity are unchanged) and re-verify with an **empty cache**:
  `npm ci --registry=https://registry.npmjs.org --cache <empty-dir>`.
- The rollup config that builds `min.js` (`sourcemap: false`) prints
  `Rollup 'sourcemap' option must be set to generate source maps` — known, harmless noise.
- `cz-conventional-changelog` is the last stale dependency (it only powers interactive commits via
  commitizen); it can be swapped for commitlint or dropped entirely.
