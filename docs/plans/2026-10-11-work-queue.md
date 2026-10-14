# Work queue — the open ledger, ordered into one PR each

Updated: 2026-10-13. Completed items are removed in the PR that implements them.

**Target: clear this queue, then cut `3.0.0` once.** The next release is a major, not a patch, so the
`exports` map ([#98](https://github.com/soimy/maxrects-packer/issues/98)) has landed rather than being
deferred, and no intermediate `2.7.5` is planned.

The **findings** live in [`deferred-work.md`](./deferred-work.md) — measurements, reproducers and the
options for each decision. This file only decides **order, PR boundaries and what has to be decided
before a PR can start**, so that an item can be picked up and cleared without re-reading the ledger.
Every row is one PR: one logical change, an English conventional-commit title, no version or
`CHANGELOG.md` edit by hand.

## Order

| # | Item | Type | Issue | Ready to start? |
| --- | --- | --- | --- | --- |
| 1 | Four Dependabot alerts in the nested vitepress tree | `build(deps)` | — | needs the upgrade-or-dismiss decision |
| 2 | Release `3.0.0` | release | [#61](https://github.com/soimy/maxrects-packer/issues/61), [#62](https://github.com/soimy/maxrects-packer/issues/62) | after 1 |

Ordering is severity × readiness, not a schedule. Keep independent checks and tooling work separate
from behaviour fixes, and settle the package entry points before releasing. Re-order whenever a decision lands.

Earlier completed work is off the list. The `padding` fix
([#43](https://github.com/soimy/maxrects-packer/issues/43)): numeric `NaN`/`Infinity`/`-Infinity` padding is
rejected by the constructor that received it; other JavaScript values keep their original coercion.
`updateBinSize()` refuses a non-finite result, so the `NaN` retry that hung `place()` cannot come back —
the hang, the numeric error, coercion compatibility and the bin-left-usable case are each pinned by a spec.
The clone-rotation fix
([#117](https://github.com/soimy/maxrects-packer/issues/117)): the replay hands each copy the orientation
its source was handed. The `2.7.4` deprecation: live on npm
since 2026-10-12 — `npm warn deprecated maxrects-packer@2.7.4: Broken entry points: use 2.7.3 until 3.0.0 is
published.` — verified by installing the published tarball, with `latest` left on `2.7.3` so a plain
install is unaffected and a range that resolves to `2.7.4` says so at install time. And the tag `master`
that used to shadow `refs/heads/master` is gone, so the ambiguity warning is gone with it.
The workflow action-major upgrade landed in [PR #87](https://github.com/soimy/maxrects-packer/pull/87).
Re-verified on 2026-10-13 at `master` commit `1c889cf`:
[Node.js CI](https://github.com/soimy/maxrects-packer/actions/runs/38365767187) passed on Node 20/22/24,
and [Documentation](https://github.com/soimy/maxrects-packer/actions/runs/38365767185) passed its build
and actual Pages deployment. The release workflow was inspected only; publishing was not exercised.

## 1. Dependabot alerts in the vitepress tree

GitHub reports four open alerts on the default branch (1 high, 3 moderate). All four sit in the
**docs-site** tree, on the copies vitepress nests: `node_modules/vitepress/node_modules/vite` is 5.4.21
and `…/esbuild` is 0.21.5, both inside the vulnerable ranges (fixed in vite 6.4.3 and esbuild 0.25.0),
while the top-level `vite` (6.4.4) and `esbuild` (0.25.12) are already past the fixes. They are dev-only
and never published — the package has zero runtime dependencies — so this is hygiene rather than a
consumer-facing risk, but the repository has no Dependabot version-update configuration, so nothing
raises it on its own.

**Decide first:** vitepress 1.6.4 pins `vite: ^5.4.14`, so the nested copy cannot move within 1.x.
Options: bump to `vitepress@2.0.0-alpha` (it depends on `vite: ^8.2.1`, and the docs build is all it
affects), force the nested copies with an `overrides` entry (vitepress 1.6.4 is not tested against
vite 6+), or dismiss the alerts as dev-only and wait for vitepress 2.0.0 stable.
**Verification:** `npm run docs:build` and the `Build documentation` job, plus the lockfile rules —
`resolved` URLs must point at `registry.npmjs.org`, and `npm install` on npm 10.9.8 needs
`--legacy-peer-deps`.


## 2. Release `3.0.0`

The release includes the fixes accumulated since `v2.7.4`. Everything in this queue lands first, then:

```bash
npm run prepare-release    # npm test, then commit-and-tag-version
git push --follow-tags     # release.yml builds the GitHub release
npm publish                # manual — release.yml does not publish to npm
```

The non-exclusive tag metadata fix and the `exports` map both carry breaking markers, so
`commit-and-tag-version` selects `3.0.0`. Use
`npm run version -- --release-as major` if the derived version is ever wrong.

**Exit criteria:** `latest` on npm points at a build whose `main`/`types` match this repository;
[#61](https://github.com/soimy/maxrects-packer/issues/61) and
[#62](https://github.com/soimy/maxrects-packer/issues/62) are answered and closed;
`npm run verify:package` green across the release, since the tarball's file list is pinned by
`PUBLISHED_FILES` in `scripts/verify-package.mjs`.

## Taking an item

1. Branch from the latest `master` (`feat/…`, `fix/…`, `docs/…`, `ci/…`); use `.worktrees/<branch>` when
   isolation is genuinely needed.
2. Make the change, and add the test that fails before it and passes after it.
3. Run the gates CI runs: `npm test`, `npm run lint`, `npm run format:check`, `npm run typecheck`,
   `npm run verify:docs`, and `npm run cover` whenever `src/` changed.
4. Open the PR with a title that is itself a valid conventional commit — it becomes the squash subject
   on `master` and is what `commit-and-tag-version` parses. State what was verified and how.
5. Before merging, remove the completed item from this queue and from
   [`deferred-work.md`](./deferred-work.md) in the same PR, so implementation and planning cleanup land
   together. Use a closing issue reference in the PR description.
