# Work queue — the open ledger, ordered into one PR each

Snapshot: `master` at `8584fe3` (2026-10-12, the clone-rotation fix merged), working tree clean, CI green
on Node 20/22/24 plus the documentation build and the Pages deployment.

**Target: clear this queue, then cut `3.0.0` once.** The next release is a major, not a patch, so the
`exports` map ([#98](https://github.com/soimy/maxrects-packer/issues/98)) is in scope rather than
deferred, and no intermediate `2.7.5` is planned.

The **findings** live in [`deferred-work.md`](./deferred-work.md) — measurements, reproducers and the
options for each decision. This file only decides **order, PR boundaries and what has to be decided
before a PR can start**, so that an item can be picked up and cleared without re-reading the ledger.
Every row is one PR: one logical change, an English conventional-commit title, no version or
`CHANGELOG.md` edit by hand.

## Order

| # | Item | Type | Issue | Ready to start? |
| --- | --- | --- | --- | --- |
| 1 | `clone()` on an oversized placeholder drops the restored state | `fix` | [#118](https://github.com/soimy/maxrects-packer/issues/118) | needs the contract decision |
| 2 | `bin.tag` in non-exclusive mode names only the first tag group | `fix` | [#93](https://github.com/soimy/maxrects-packer/issues/93) | needs the semantics decision |
| 3 | The documented return values of `add()`/`addArray()` are unasserted | `test` | [#97](https://github.com/soimy/maxrects-packer/issues/97) | yes — three assertions |
| 4 | Four Dependabot alerts in the nested vitepress tree | `build(deps)` | — | needs the upgrade-or-dismiss decision |
| 5 | Custom heading anchors read out with their braces | `docs` | [#101](https://github.com/soimy/maxrects-packer/issues/101) | yes — cosmetic |
| 6 | An `exports` map for `require`/`import` under `node16`/`nodenext` | `feat!` | [#98](https://github.com/soimy/maxrects-packer/issues/98) | in scope for 3.0.0 |
| 7 | Release `3.0.0` | release | [#61](https://github.com/soimy/maxrects-packer/issues/61), [#62](https://github.com/soimy/maxrects-packer/issues/62) | after 1–6 |

Ordering is severity × readiness, not a schedule: 1–2 are the open holes in the behaviour contracts, 3–5
are cheap and independent, 6 is the breaking change that makes this release a major, and 7 is the milestone
the rest feeds. Re-order whenever a decision lands.

Five entries are done and off the list. The `padding` fix
([#43](https://github.com/soimy/maxrects-packer/issues/43)): numeric `NaN`/`Infinity`/`-Infinity` padding is
rejected by the constructor that received it; other JavaScript values keep their original coercion.
`updateBinSize()` refuses a non-finite result, so the `NaN` retry that hung `place()` cannot come back —
the hang, the numeric error, coercion compatibility and the bin-left-usable case are each pinned by a spec.
The clone-rotation fix
([#117](https://github.com/soimy/maxrects-packer/issues/117)): the replay hands each copy the orientation
its source was handed, so the queue starts at the other clone hole. The `2.7.4` deprecation: live on npm
since 2026-10-12 — `npm warn deprecated maxrects-packer@2.7.4: Broken entry points: use 2.7.3 until 3.0.0 is
published.` — verified by installing the published tarball, with `latest` left on `2.7.3` so a plain
install is unaffected and a range that resolves to `2.7.4` says so at install time. And the tag `master`
that used to shadow `refs/heads/master` is gone, so the ambiguity warning is gone with it.
The workflow action-major upgrade landed in [PR #87](https://github.com/soimy/maxrects-packer/pull/87).
Re-verified on 2026-10-13 at `master` commit `1c889cf`:
[Node.js CI](https://github.com/soimy/maxrects-packer/actions/runs/38365767187) passed on Node 20/22/24,
and [Documentation](https://github.com/soimy/maxrects-packer/actions/runs/38365767185) passed its build
and actual Pages deployment. The release workflow was inspected only; publishing was not exercised.

## 1. `clone()` on an oversized placeholder (#118)

**Decide first:** whether `clone()` carries the restored free rects, the maxima and the `options`, or
whether the current behaviour is the contract. Invariant 8 says state travels and behaviour does not;
today most of the state does not travel. Nothing internal depends on the difference — the only caller is
the non-exclusive tag probe, where a placeholder fails either way — but `clone()` is public API.
**Files:** `src/oversized-element-bin.ts`, `test/oversized-element-bin.spec.js`.
**Exit criteria:** the chosen contract is asserted, and the JSDoc states it.

## 2. `bin.tag` in non-exclusive mode (#93)

**Decide first:** tag in both paths (a user-visible metadata change) or in neither (drops a field from
`save()` output). Neither direction changes a packing decision, because a bin copies its `options` at
construction.
**Files:** `src/maxrects-packer.ts:78` and the `addArray()` grouping path; `save()`/`load()` round-trip
coverage in `test/maxrects-packer.spec.js`.

## 3. Return-value assertions (#97)

Three assertions, no source change: `add()` returns the very object it was handed, `addArray()` returns
nothing, and the `add(width, height, data)` overload returns an internal `Rectangle`.
**Files:** `test/maxrects-packer.spec.js`, `test/maxrects-bin.spec.js`.

## 4. Dependabot alerts in the vitepress tree

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

## 5. Heading anchors in the permalink label (#101)

Either drop the eight unreferenced `{#custom-id}` attributes and accept VitePress's `_N-` slugs, or keep
the ids and treat the `aria-label` as an upstream quirk. Nothing links to the eight today.
**Files:** `docs/contributor/behavior-contracts.md`, `docs/.vitepress/config.mts` if the slug source
moves.

## 6. `exports` map (#98)

Per-format conditions and declarations fix the `node16`/`nodenext` CommonJS import, and the map seals off
the deep `maxrects-packer/dist/...` paths — which is why this is the breaking change that makes the
release a major. Sequence it after the behaviour fixes so the entry-point surface is settled once.
**Files:** `package.json`, the entry-point gates (`scripts/verify-entry.mjs`,
`scripts/verify-package.mjs`, whose `PUBLISHED_FILES` list is pinned), the type fixture, and
`docs/user/troubleshooting.md`.
**Mark it in the commit message**, not only in the PR description: `feat!:` or a `BREAKING CHANGE:`
footer, because the squash body is what `commit-and-tag-version` parses.
**Exit criteria:** the CommonJS `.cts` fixture compiles under `node16` and `nodenext` — the gap measured
in the ledger — and the deep-import change is documented as breaking.

## 7. Release `3.0.0`

`master` is 39 commits past `v2.7.4` (12 of them `fix`) and 52 past the version npm actually serves.
Everything in this queue lands first, then:

```bash
npm run prepare-release    # npm test, then commit-and-tag-version
git push --follow-tags     # release.yml builds the GitHub release
npm publish                # manual — release.yml does not publish to npm
```

The commits so far carry no `feat` and no breaking marker, so `commit-and-tag-version` would cut
`2.7.5`; item 6's marker is what makes it a major, and `npm run version -- --release-as major` is the
explicit fallback if the derived number is ever wrong.

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
5. When the item is done, remove it from this queue and from
   [`deferred-work.md`](./deferred-work.md), and close its issue.
