# Contributing to maxrects-packer

Thanks for taking the time to contribute. This document covers everything you need to go from a
fresh clone to a merged pull request: language rules, setup, coding conventions, the commit format,
and what CI will check.

`maxrects-packer` is a small, dependency-free geometry library that a lot of projects build on, so
the bar for changes is *"does this keep the published API and packing behavior intact, and is it
proven by a test?"* rather than *"is this clever?"*.

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

**All project communication is in English.** That includes:

- commit messages
- pull request titles and descriptions
- issue titles, bodies and comments
- code comments, JSDoc and documentation
- review comments and discussion threads

This is a hard requirement, not a preference. The library is used by software worldwide, `CHANGELOG.md`
is generated from commit messages, and future maintainers need to be able to read the history without
a translation step. Do not mix languages within a single thread; if English is not your first
language, write plain, short sentences — clarity matters far more than grammar.

There is no legacy exception to lean on: the repository contains no Chinese today, so new and
modified content — including comments in `scripts/` and the config files — is English too.

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
  start a [Discussion](https://github.com/soimy/maxrects-packer/discussions) and link it. Nobody will
  be turned away for using their own structure; what matters is that the report is reproducible or the
  proposal is explained.

## Prerequisites

- **Node.js `^20.19.0 || >= 22.12.0`** for the development toolchain — that is the `engines` range
  declared by `oxlint` and `oxfmt`, so Node 21.x and 22.0–22.11 are *not* supported. CI runs the suite
  on Node 20, 22 and 24.
- **npm** — the repository ships a `package-lock.json`, so use `npm ci`, not `yarn`/`pnpm`.
- No other global tooling. The published bundle targets ES5 and has zero runtime dependencies; that
  constraint is about the *output*, not about your machine.

## Getting set up

```bash
git clone https://github.com/soimy/maxrects-packer.git
cd maxrects-packer
npm ci --include=dev     # --include=dev matters when NODE_ENV=production is set in your shell
npm test                 # builds dist/ and runs the jest suite
```

If `npm test` passes, you are ready. Useful commands:

```bash
npm test                              # clean build + full jest suite
npx jest test/maxrects-bin.spec.js    # a single spec, no rebuild needed
npm run typecheck                     # native TypeScript 7 type check
npm run lint                          # oxlint (baseline: 0 warnings, 0 errors)
npm run lint:fix                      # oxlint with autofix
npm run format                        # oxfmt writes changes back
npm run format:check                  # what CI runs
npm run cover                         # jest with coverage -> test/coverage/
npm run verify:package                # pack a tarball and consume it by package name (build first)
npm run doc                           # typedoc -> docs/
```

## Project layout

| Path | Contents |
| --- | --- |
| `src/` | TypeScript sources — the entire library |
| `src/maxrects-bin.ts` | Single-bin packing algorithm (`place` / `findNode` / `splitNode` / `updateBinSize`) |
| `src/maxrects-packer.ts` | Multi-bin scheduling (`add` / `addArray` / `next` / `repack` / `save` / `load`) |
| `test/*.spec.js` | Jest specs, written in CommonJS style against the TypeScript sources |
| `scripts/` | Build and verification gates (`verify-entry.mjs`, `typecheck.mjs`, `verify-package.mjs`) |
| `dist/` | Build output — generated, gitignored, never committed |

Algorithm changes usually have to touch `place`, `findNode` and `updateBinSize` together. Read the
module before editing it, and see [AGENTS.md](./AGENTS.md) for the invariants the library relies on
(in-place mutation, tag grouping, dirty propagation, `save`/`load` semantics, size accounting).
**Those invariants are the contract with downstream users — breaking one is a breaking change.**

## Making changes

1. Fork the repository (or, if you have write access, create a branch here).
2. Branch off `master` using `type/short-slug`, matching the commit type you intend to use:
   `fix/updatebinsize-edgy-placement`, `feat/non-exclusive-tags`, `docs/contributing-guide`.
   Including the issue number is welcome when one exists: `fix/54-expanding-one-dimension`.
3. Keep one logical change per branch. Unrelated cleanups belong in their own PR.

For parallel or isolated work, this repository keeps linked worktrees under `.worktrees/`
(gitignored), so nothing leaks into the repository root:

```bash
git worktree add .worktrees/<branch> -b <branch>
cd .worktrees/<branch>
npm ci --include=dev      # each worktree has its own node_modules
```

Never commit `dist/`, `docs/`, `test/coverage/`, `node_modules/` or `.worktrees/` — all are
gitignored, and build output is produced by CI and the release workflow.

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
| `refactor` | Internal restructuring, no behavior change | hidden |
| `docs` | Documentation only | hidden |
| `test` | Tests only | hidden |
| `build` | Build system, bundler or dependency changes | hidden |
| `ci` | CI configuration | hidden |
| `chore` | Everything else that is not user-visible | hidden |

**A breaking change must be marked** — either `feat!:` / `fix(scope)!:`, or a
`BREAKING CHANGE: <description>` footer. `commit-and-tag-version` uses that marker to decide between
a major, minor and patch release, so an unmarked breaking change will ship as a patch and break
downstream users.

**Do not edit `CHANGELOG.md` and do not bump the version in `package.json`** — both are generated by
`commit-and-tag-version` during release.

## Code style

Formatting and linting are automated; do not hand-format or argue with the tools.

- **`oxfmt`** formats the code: 4-space indentation, double quotes, semicolons, printWidth 120, no
  trailing commas, no space between a function name and its parentheses. Run `npm run format` before
  committing, or `npm run format:check` to see what CI sees.
- **`oxlint`** lints `src`, `test` and `scripts`. Only **errors** fail CI — `npm run lint` exits 0 with
  a warning present, and four rules (`no-console`, `no-unused-vars`, `no-unneeded-ternary`,
  `jsdoc/require-property-type`) are deliberately set to `warn`. Keep the run at the current
  `0 warnings / 0 errors` anyway; if you genuinely need an exception, use an
  `// oxlint-disable-next-line <rule>` comment rather than loosening the config.
- Keep explicit `public` / `private` modifiers on class members.
- **New public API needs JSDoc**: `@param` entries use a `- ` separator, `@property` entries carry a
  type. The docs site is generated from these comments.
- Line endings are LF everywhere (`.gitattributes` sets `* text=auto eol=lf`). Configure your editor
  accordingly instead of committing CRLF.
- **Do not add runtime dependencies** — the library ships with zero, and that is a feature, not an
  accident. If you believe one is unavoidable, open an issue first and make the case.

## Tests

```bash
npm test                 # the full gate: clean build + jest
npx jest test/rectangle.spec.js   # fast iteration on one spec
npm run cover            # coverage report
```

- The specs are CommonJS-style JavaScript that `require("../src/…")` the TypeScript sources directly;
  they deliberately do **not** test `dist/`.
- Baseline: 6 suites, 66 passing, 2 skipped, ~95% statement coverage. Do not lower it.
- `test/maxrects-bin.spec.js` contains randomized "monkey" tests that assert no rect overlaps and
  none exceeds its bin. They are the main regression net for algorithm changes — keep them passing.
- **Every bug fix needs a test that fails before the fix and passes after it.** For a bug that was
  reported with a specific input, add an explicit assertion with that input rather than relying on
  the randomized tests to stumble onto it.
- New behavior needs a test too; if a PR changes packing output without one, we will ask you to add it.
- The two `test.skip`s in `test/efficiency.spec.js` are an optional bulk comparison table
  (`scenarios.json` + `ascii-table`); they are skipped by default and only run when un-skipped
  locally.

## Submitting a pull request

1. Rebase on the latest `master`.
2. Run the same gates CI runs, and make sure they all pass:

   ```bash
   npm ci --include=dev
   npm run lint
   npm run format:check
   npm run typecheck
   npm run cover
   npm run verify:package
   ```

3. Open the PR and fill in the template — summary, related issue, type of change, and the
   verification section.
4. **Write the PR title as a valid conventional commit.** The repository sets
   `squash_merge_commit_title: PR_TITLE`, so whatever the PR is titled when it merges becomes the
   commit subject on `master` — which is what `commit-and-tag-version` parses for `CHANGELOG.md`.
   Retitling the PR is therefore how you fix a wrong type. `chore: clean up lint config` is fine for
   internal work; a user-visible fix must merge as `fix: …` or it will not appear in the changelog.
5. **A breaking change must be marked in a commit message**, with `!` or a `BREAKING CHANGE:` footer —
   not in the PR description. The squash commit body is built from the branch's commit messages
   (`squash_merge_commit_message: COMMIT_MESSAGES`), and `commit-and-tag-version` only sees the notes
   that reach a commit. A footer typed only into the PR description is invisible to it, and the
   release will be cut as a minor or patch instead of a major.
6. Confirm the CI matrix is green (Node 20, 22 and 24: lint → format:check → typecheck → cover →
   verify:package). Note that `verify:package` runs last on purpose — it consumes a real packed
   tarball, so it only means something after the build.
7. A maintainer will review. Expect questions about edge cases, the invariants in
   [AGENTS.md](./AGENTS.md), and whether the change is covered by a test.

**No CLA or DCO sign-off is required** — contributions are accepted under the project's MIT licence.
This is a one-maintainer project, so reviews can take a while, and a quiet PR is not a rejection:
ping it, reopen it, or rebase it. Nothing is auto-closed.

Please keep the diff focused, and avoid force-pushing over a review in progress — push follow-up
commits and let the squash merge collapse them. The PR template is a suggestion, not a form to
complete: delete the sections that do not apply and add your own if they communicate better. The
things that do get insisted on are the substance — English, a conventional PR title, a test for a
behaviour change, and no new runtime dependencies.

## Release process

Maintainers only. Releases are driven from `master`:

```bash
npm run prepare-release   # npm test, then commit-and-tag-version (bumps version + CHANGELOG)
git push --follow-tags
```

Pushing a `v*` tag triggers `.github/workflows/release.yml`, which builds the bundles and creates a
GitHub release with `dist/` attached. **`release.yml` does not publish to npm** — there is no
`npm publish` step and no `NPM_TOKEN` anywhere in the repository, so publishing is a separate manual
`npm publish` from the tagged commit. Contributors never need to touch versions, tags or
`CHANGELOG.md`.

## Security

If you believe you have found a security issue, **do not open a public issue**. Use GitHub's private
reporting form at
[github.com/soimy/maxrects-packer/security/advisories/new](https://github.com/soimy/maxrects-packer/security/advisories/new)
(the *Security* tab → *Report a vulnerability*), or email the maintainer — the address is in the
`author` field of [`package.json`](./package.json) and in the git history. Include a description and,
if possible, a minimal reproduction. You will get an acknowledgement, and then either a fix or an
explanation of why the report is not exploitable. Public disclosure is welcome once a fixed version is
released.

This library performs pure in-memory geometry computation with no I/O, so the realistic risk surface
is malformed input causing an unbounded loop or excessive memory use — reports of that kind are still
worth sending privately first.

## Getting help

- [GitHub Discussions](https://github.com/soimy/maxrects-packer/discussions) — questions, ideas and
  usage help.
- [Issue tracker](https://github.com/soimy/maxrects-packer/issues) — bugs and feature requests only.
- [API documentation](https://soimy.github.io/maxrects-packer/) — generated reference.

Be respectful and assume good faith. Harassment, personal attacks and dismissive behavior are not
acceptable in any project space; maintainers may moderate or block accounts that behave that way.
