# Contributing to maxrects-packer

Thanks for taking the time to contribute. This document covers everything you need to go from a fresh
clone to a merged pull request: language rules, setup, coding conventions, the commit format, and what
CI will check. Deeper material lives in [`docs/contributor/`](./docs/contributor/index.md) — development
setup, testing, architecture, behaviour contracts, compatibility and releasing.

`maxrects-packer` is a small, dependency-free geometry library that a lot of projects build on, so the
bar for changes is *"does this keep the published API and packing behavior intact, and is it proven by a
test?"* rather than *"is this clever?"*.

- [Language policy](#language-policy)
- [Ways to contribute](#ways-to-contribute)
- [Prerequisites](#prerequisites)
- [Getting set up](#getting-set-up)
- [Project layout](#project-layout)
- [Making changes](#making-changes)
- [Commit messages](#commit-messages)
- [Code style](#code-style)
- [Tests](#tests)
- [Submitting a pull request](#submitting-a-pull-request)
- [Release process](#release-process)
- [Security](#security)
- [Getting help](#getting-help)

## Language policy

**All project communication is in English.** That includes commit messages, pull request titles and
descriptions, issue titles/bodies/comments, code comments, JSDoc and documentation. This is a hard
requirement: the library is used worldwide, `CHANGELOG.md` is generated from commit messages, and future
maintainers need the history without a translation step. Do not mix languages within a thread; if
English is not your first language, write plain, short sentences — clarity matters far more than
grammar.

## Ways to contribute

- **Bug reports** — use the [bug report template](https://github.com/soimy/maxrects-packer/issues/new?template=bug_report.yml).
  A minimal, runnable reproduction is worth more than a long description.
- **Feature requests** — use the [feature request template](https://github.com/soimy/maxrects-packer/issues/new?template=feature_request.yml).
  Explain the packing problem you are trying to solve, not just the API you want.
- **Pull requests** — bug fixes, performance work, documentation, tooling. See
  [Submitting a pull request](#submitting-a-pull-request).
- **Questions and ideas** — use [GitHub Discussions](https://github.com/soimy/maxrects-packer/discussions)
  rather than the issue tracker.
- **Anything that fits neither template** — the forms are guidance, not a gate. Open a blank issue, or
  start a discussion and link it.

## Prerequisites

- **Node.js `^20.19.0 || >= 22.12.0`** for the development toolchain — the `engines` range `oxlint` and
  `oxfmt` declare, so Node 21.x and 22.0–22.11 are *not* supported. CI runs the suite on Node 20, 22
  and 24.
- **npm** — the repository ships a `package-lock.json`, so use `npm ci`, not yarn or pnpm.

The published bundle targets ES5 and has zero runtime dependencies; that constraint is about the
*output*, not about your machine.

## Getting set up

```bash
git clone https://github.com/soimy/maxrects-packer.git
cd maxrects-packer
npm ci --include=dev     # --include=dev matters when NODE_ENV=production is set in your shell
npm test                 # builds dist/ and runs the vitest suite
```

If `npm test` passes, you are ready. The commands you will use most:

```bash
npm test                                   # clean build + full vitest suite
npx vitest run test/maxrects-bin.spec.js   # a single spec, no rebuild needed
npm run typecheck                          # native TypeScript 7 type check
npm run lint / lint:fix                    # oxlint (baseline: 0 warnings, 0 errors)
npm run format / format:check              # oxfmt writes back / what CI runs
npm run cover                              # coverage -> test/coverage/
npm run verify:package                     # pack a tarball and consume it by package name (build first)
npm run verify:docs                        # documentation boundary: tracked source vs build products
npm run docs:build                         # generate docs/api/ and build the documentation site
```

## Project layout

| Path | Contents |
| --- | --- |
| `src/` | TypeScript sources — the entire library |
| `src/maxrects-bin.ts` | Single-bin packing algorithm (`place` / `findNode` / `splitNode` / `updateBinSize`) |
| `src/maxrects-packer.ts` | Multi-bin scheduling (`add` / `addArray` / `next` / `repack` / `save` / `load`) |
| `test/*.spec.js` | Vitest specs, ESM, importing the TypeScript sources directly |
| `scripts/` | Build and verification gates (`verify-entry.mjs`, `verify-coverage.mjs`, `verify-docs.mjs`, `verify-package.mjs`, `typecheck.mjs`) |
| `docs/` | Documentation **source**: user guide, contributor guide, specs, plans |
| `docs/api/`, `docs/.vitepress/dist/` | Generated documentation — ignored, never committed |
| `dist/` | Build output — generated, ignored, never committed |

Algorithm changes usually have to touch `place`, `findNode` and `updateBinSize` together. Read the
module before editing it; the invariants the library relies on are in
[docs/contributor/behavior-contracts.md](./docs/contributor/behavior-contracts.md).
**Those invariants are the contract with downstream users — breaking one is a breaking change.**

## Making changes

1. Fork the repository (or, if you have write access, create a branch here).
2. Branch off `master` using `type/short-slug`, matching the commit type you intend to use:
   `fix/updatebinsize-edgy-placement`, `feat/non-exclusive-tags`, `docs/contributing-guide`. Include the
   issue number when one exists: `fix/54-expanding-one-dimension`.
3. Keep one logical change per branch — unrelated cleanups belong in their own PR.

For parallel or isolated work, this repository keeps linked worktrees under `.worktrees/` (gitignored):

```bash
git worktree add .worktrees/<branch> -b <branch>
cd .worktrees/<branch>
npm ci --include=dev      # each worktree has its own node_modules
```

Never commit `dist/`, `docs/api/`, `docs/.vitepress/{cache,dist}/`, `test/coverage/`, `node_modules/` or
`.worktrees/`. The rest of `docs/` is **source** — see
[docs/contributor/documentation.md](./docs/contributor/documentation.md) for the boundary and the gate
that enforces it.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

Optional body explaining why, wrapped at 100 characters.

Refs #54
```

- `type` is required and lower-case; `scope` is optional (`maxrects-bin`, `packer`, `build`, `deps`).
- The subject is imperative, lower-case, and has no trailing period: `fix: keep padding when a bin
  grows`, not `Fixed padding bug.`
- One logical change per commit; do not mix formatting churn into a behavioral fix.

| Type | Use for | In `CHANGELOG.md` |
| --- | --- | --- |
| `feat` | A new user-visible capability | Features |
| `fix` | A user-visible bug fix | Bug Fixes |
| `perf` | A change that only improves performance | Performance Improvements |
| `revert` | Reverting a previous commit | Reverts |
| `refactor` / `docs` / `test` / `build` / `ci` / `chore` | Internal work | hidden |

**A breaking change must be marked** — either `feat!:` / `fix(scope)!:`, or a
`BREAKING CHANGE: <description>` footer. `commit-and-tag-version` uses that marker to choose between a
major, minor and patch release, so an unmarked breaking change ships as a patch and surprises
downstream users.

**Do not edit `CHANGELOG.md` and do not bump the version in `package.json`** — both belong to
`commit-and-tag-version`. The full release procedure is in
[docs/contributor/releasing.md](./docs/contributor/releasing.md).

## Code style

Formatting and linting are automated; do not hand-format or argue with the tools.

- **`oxfmt`** formats the code: 4-space indentation, double quotes, semicolons, printWidth 120, no
  trailing commas, no space between a function name and its parentheses. Run `npm run format` before
  committing, or `npm run format:check` to see what CI sees.
- **`oxlint`** lints `src`, `test`, `scripts` and the documentation config. Only **errors** fail CI —
  four rules (`no-console`, `no-unused-vars`, `no-unneeded-ternary`, `jsdoc/require-property-type`) are
  deliberately set to `warn`. Keep the run at `0 warnings / 0 errors` anyway; use an
  `// oxlint-disable-next-line <rule>` comment rather than loosening the config.
- Keep explicit `public` / `private` modifiers on class members.
- **New public API needs JSDoc**: `@param` entries use a `- ` separator, `@property` entries carry a
  type. The API reference on the documentation site is generated from those comments.
- Line endings are LF everywhere (`.gitattributes` sets `* text=auto eol=lf`).
- **Do not add runtime dependencies** — the library ships with zero, and that is a feature. If you
  believe one is unavoidable, open an issue first and make the case.

## Tests

```bash
npm test                                  # the full gate: clean build + vitest
npx vitest run test/rectangle.spec.js     # fast iteration on one spec
npm run cover                             # coverage
```

- The specs are ESM JavaScript that `import` the TypeScript sources directly (`../src/…`, no file
  extension) and pull `describe / test / expect / beforeEach` from `vitest` rather than from globals;
  they deliberately do **not** test `dist/`.
- Baseline: **8 spec files, 126 passing, 2 skipped, 100% coverage** (v8 provider). Both the test list
  and the coverage thresholds are gates — see [docs/contributor/testing.md](./docs/contributor/testing.md).
- `test/maxrects-bin.spec.js` contains randomized "monkey" tests that assert no rect overlaps and none
  exceeds its bin. They are the main regression net for algorithm changes — keep them passing.
- **Every bug fix needs a test that fails before the fix and passes after it.** For a bug reported with
  a specific input, add an explicit assertion with that input rather than relying on the randomized
  tests to stumble onto it.
- New behavior needs a test too; if a PR changes packing output without one, we will ask you to add it.

## Submitting a pull request

1. Rebase on the latest `master`.
2. Run the same gates CI runs, and make sure they all pass:

   ```bash
   npm ci --include=dev
   npm run lint
   npm run format:check
   npm run typecheck
   npm run verify:docs
   npm run docs:build
   npm run cover
   npm run verify:package
   ```

3. Open the PR and fill in the template — summary, related issue, type of change, and verification.
4. **Write the PR title as a valid conventional commit.** The repository sets
   `squash_merge_commit_title: PR_TITLE`, so whatever the PR is titled when it merges becomes the commit
   subject on `master`, which is what `commit-and-tag-version` parses. Retitling the PR is how you fix a
   wrong type.
5. **A breaking change must be marked in a commit message**, not only in the PR description — the squash
   body is built from the branch's commit messages and the description never reaches a commit.
6. Confirm the CI matrix is green (Node 20, 22 and 24: lint → format:check → typecheck → verify:docs →
   docs:build → cover → verify:package). `verify:package` runs last on purpose: it consumes a real
   packed tarball.
7. A maintainer will review. Expect questions about edge cases, the
   [behaviour contracts](./docs/contributor/behavior-contracts.md), and whether the change is covered by
   a test.

**No CLA or DCO sign-off is required** — contributions are accepted under the project's MIT licence.
This is a one-maintainer project, so reviews can take a while, and a quiet PR is not a rejection: ping
it, reopen it, or rebase it. Nothing is auto-closed.

Please keep the diff focused, and avoid force-pushing over a review in progress — push follow-up commits
and let the squash merge collapse them. What does get insisted on is the substance: English, a
conventional PR title, a test for a behaviour change, and no new runtime dependencies.

## Release process

Maintainers only; see [docs/contributor/releasing.md](./docs/contributor/releasing.md) for the full
procedure.

```bash
npm run prepare-release   # npm test, then commit-and-tag-version (bumps version + CHANGELOG)
git push --follow-tags
```

Pushing a `v*` tag triggers `.github/workflows/release.yml`, which builds the bundles and creates a
GitHub release with `dist/` attached. **It does not publish to npm** — there is no `npm publish` step and
no `NPM_TOKEN` in the repository, so publishing is a separate manual step from the tagged commit.

## Security

If you believe you have found a security issue, **do not open a public issue**. Use GitHub's private
reporting form at
[github.com/soimy/maxrects-packer/security/advisories/new](https://github.com/soimy/maxrects-packer/security/advisories/new)
or email the maintainer — the address is in the `author` field of [`package.json`](./package.json) and in
the git history. Include a description and, if possible, a minimal reproduction.

This library performs pure in-memory geometry computation with no I/O, so the realistic risk surface is
malformed input causing an unbounded loop or excessive memory use — reports of that kind are still worth
sending privately first.

## Getting help

- [GitHub Discussions](https://github.com/soimy/maxrects-packer/discussions) — questions, ideas and usage
  help.
- [Issue tracker](https://github.com/soimy/maxrects-packer/issues) — bugs and feature requests only.
- [Documentation](https://soimy.github.io/maxrects-packer/) — user guide and generated API reference.

Be respectful and assume good faith. Harassment, personal attacks and dismissive behavior are not
acceptable in any project space; maintainers may moderate or block accounts that behave that way.
