# Work queue — the open ledger, ordered into one PR each

Snapshot: `master` at `45cb7ce` (2026-10-11), working tree clean, CI green on Node 20/22/24 plus the
documentation build and the Pages deployment.

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
| 1 | Deprecate the broken `2.7.4` on npm | registry | [#61](https://github.com/soimy/maxrects-packer/issues/61), [#62](https://github.com/soimy/maxrects-packer/issues/62) | yes — one command, reversible |
| 2 | `place()` recurses without bound on a non-numeric `padding` | `fix` | [#43](https://github.com/soimy/maxrects-packer/issues/43) | needs the fix-shape decision |
| 3 | `clone()` re-decides rotation | `fix` | [#117](https://github.com/soimy/maxrects-packer/issues/117) | yes — fix direction measured |
| 4 | `clone()` on an oversized placeholder drops the restored state | `fix` | [#118](https://github.com/soimy/maxrects-packer/issues/118) | needs the contract decision |
| 5 | `bin.tag` in non-exclusive mode names only the first tag group | `fix` | [#93](https://github.com/soimy/maxrects-packer/issues/93) | needs the semantics decision |
| 6 | The documented return values of `add()`/`addArray()` are unasserted | `test` | [#97](https://github.com/soimy/maxrects-packer/issues/97) | yes — three assertions |
| 7 | The workflows pin action majors several releases behind | `ci` | [#119](https://github.com/soimy/maxrects-packer/issues/119) | yes — one PR, three files |
| 8 | Custom heading anchors read out with their braces | `docs` | [#101](https://github.com/soimy/maxrects-packer/issues/101) | yes — cosmetic |
| 9 | An `exports` map for `require`/`import` under `node16`/`nodenext` | `feat!` | [#98](https://github.com/soimy/maxrects-packer/issues/98) | in scope for 3.0.0 |
| 10 | Release `3.0.0` | release | [#61](https://github.com/soimy/maxrects-packer/issues/61), [#62](https://github.com/soimy/maxrects-packer/issues/62) | after 1–9 |
| H | The tag `master` shadows the branch of the same name | `chore` | — | needs a remote tag deletion |

Ordering is severity × readiness, not a schedule: 2 is the only item that can take an application down,
3–5 are the three open holes in the behaviour contracts, 6–8 are cheap and independent, 9 is the
breaking change that makes this release a major, and 10 is the milestone the rest feeds. Re-order
whenever a decision lands.

## 1. Deprecate `2.7.4` on npm

`2.7.4` is the build that broke the entry points (`main: dist/maxrects-packer.js`, `types:
dist/maxrects-packer.d.ts` — the declaration of one module, three of the nine documented exports), and
it is what [#61](https://github.com/soimy/maxrects-packer/issues/61) and
[#62](https://github.com/soimy/maxrects-packer/issues/62) report. `latest` was moved back to `2.7.3` on
2025-08-30, but `2.7.4` itself was never deprecated, so a `^2.7.4` range still installs it — and with
the next release now a major, that stays true for longer than a patch release would have taken.

```bash
npm deprecate maxrects-packer@2.7.4 "Broken entry points: use 2.7.3 until 3.0.0 is published."
```

Reversible with an empty message. Needs the maintainer's go-ahead because it writes to the public
registry.

## 2. `place()` recursion on a non-numeric `padding` (#43)

Reproducer and measurements: [ledger](./deferred-work.md#place-recurses-without-bound-when-padding-is-not-a-number).
The comment with the full root cause is on the issue.

**Decide first:** reject a non-finite `padding` at construction (clear error, but a new throw for
JavaScript callers) or bound the growth retry in `place()` (a guard against any other `NaN` source) —
or both.

**Files:** `src/maxrects-packer.ts:57` for validation, `src/maxrects-bin.ts:225`/`:246` for the retry.
**Test:** a fixed-input spec that asserts the chosen behaviour and fails before the change — a hang
cannot be asserted directly, so the test has to pin the throw, or a bounded return.
**Exit criteria:** `npm test` and `npm run cover` green; the ledger entry keeps its measurements but
loses the open decision.

## 3. `clone()` re-decides rotation (#117)

The fix direction is already measured through the public API: restore each copy to the orientation its
source was handed over in — set `rot` to false, and swap `width`/`height` yourself when that did not do
it — before replaying it. About five lines plus the seeded sweep that currently reaches neither
reproducer.

**Files:** `src/maxrects-bin.ts` (`clone()`), `test/clone.spec.js`.
**Also update:** `AGENTS.md` invariant 8 and
[behaviour contracts](../contributor/behavior-contracts.md#clone-isolates-the-two-bins), which currently
call the identical-placement result a measurement rather than a guarantee.
**Exit criteria:** both reproducers in the ledger reproduce their source exactly, the existing 80-bin
sweep still passes, and the seeded sweep over tight rotated bins is in the suite.

## 4. `clone()` on an oversized placeholder (#118)

**Decide first:** whether `clone()` carries the restored free rects, the maxima and the `options`, or
whether the current behaviour is the contract. Invariant 8 says state travels and behaviour does not;
today most of the state does not travel. Nothing internal depends on the difference — the only caller is
the non-exclusive tag probe, where a placeholder fails either way — but `clone()` is public API.
**Files:** `src/oversized-element-bin.ts`, `test/oversized-element-bin.spec.js`.
**Exit criteria:** the chosen contract is asserted, and the JSDoc states it.

## 5. `bin.tag` in non-exclusive mode (#93)

**Decide first:** tag in both paths (a user-visible metadata change) or in neither (drops a field from
`save()` output). Neither direction changes a packing decision, because a bin copies its `options` at
construction.
**Files:** `src/maxrects-packer.ts:78` and the `addArray()` grouping path; `save()`/`load()` round-trip
coverage in `test/maxrects-packer.spec.js`.

## 6. Return-value assertions (#97)

Three assertions, no source change: `add()` returns the very object it was handed, `addArray()` returns
nothing, and the `add(width, height, data)` overload returns an internal `Rectangle`.
**Files:** `test/maxrects-packer.spec.js`, `test/maxrects-bin.spec.js`.

## 7. Workflow action majors (#119)

One `ci:` PR moving `.github/workflows/docs.yml`, `node.js.yml` and `release.yml` together. Re-check the
inputs of `actions/deploy-pages` against its current `action.yml`: the deploy job is gated on a push to
`master`, so it is the one step that has never run here.
**Exit criteria:** all three workflows green, including one deployment from `master`.

## 8. Heading anchors in the permalink label (#101)

Either drop the eight unreferenced `{#custom-id}` attributes and accept VitePress's `_N-` slugs, or keep
the ids and treat the `aria-label` as an upstream quirk. Nothing links to the eight today.
**Files:** `docs/contributor/behavior-contracts.md`, `docs/.vitepress/config.mts` if the slug source
moves.

## 9. `exports` map (#98)

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

## 10. Release `3.0.0`

`master` is 35 commits past `v2.7.4` (12 of them `fix`) and 48 past the version npm actually serves.
Everything in this queue lands first, then:

```bash
npm run prepare-release    # npm test, then commit-and-tag-version
git push --follow-tags     # release.yml builds the GitHub release
npm publish                # manual — release.yml does not publish to npm
```

The commits so far carry no `feat` and no breaking marker, so `commit-and-tag-version` would cut
`2.7.5`; item 9's marker is what makes it a major, and `npm run version -- --release-as major` is the
explicit fallback if the derived number is ever wrong.

**Exit criteria:** `latest` on npm points at a build whose `main`/`types` match this repository;
[#61](https://github.com/soimy/maxrects-packer/issues/61) and
[#62](https://github.com/soimy/maxrects-packer/issues/62) are answered and closed;
`npm run verify:package` green across the release, since the tarball's file list is pinned by
`PUBLISHED_FILES` in `scripts/verify-package.mjs`.

## H. The tag `master`

`refs/tags/master` (`8d2c45e`, "ci: add manually trigger on Release CI") shadows `refs/heads/master`, so
every `git diff master origin/master` prints `warning: refname 'master' is ambiguous`. Removing it is a
remote-visible operation: `git push origin :refs/tags/master` after `git tag -d master`, and it needs the
maintainer's confirmation.

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
