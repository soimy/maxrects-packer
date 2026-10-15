# Work queue — the open ledger, ordered into one PR each

Updated: 2026-10-15. Completed items are removed in the PR that implements them.

**The queue is empty: `3.0.0` shipped on 2026-10-15 and it was the last item in it.** The release is a
major rather than a patch because the `exports` map
([#98](https://github.com/soimy/maxrects-packer/issues/98)) and the non-exclusive tag change carried
breaking markers, and no intermediate `2.7.5` was ever planned. What is still open lives in
[`deferred-work.md`](./deferred-work.md) as a decision to take, not as queued work.

The **findings** live in [`deferred-work.md`](./deferred-work.md) — measurements, reproducers and the
options for each decision. This file only decides **order, PR boundaries and what has to be decided
before a PR can start**, so that an item can be picked up and cleared without re-reading the ledger.
Every row is one PR: one logical change, an English conventional-commit title, no version or
`CHANGELOG.md` edit by hand.

## Order

Nothing is queued. Ordering is severity × readiness, not a schedule: keep independent checks and
tooling work separate from behaviour fixes, and settle the package entry points before a release.
Re-order whenever a decision lands.

Earlier completed work is off the list. The `3.0.0` release shipped on 2026-10-15 (commit `88b5d74`,
tag `v3.0.0`): `commit-and-tag-version` derived the major from the breaking markers, `publish.yml`
published through the approval-gated OIDC flow with a provenance attestation, and `latest` resolves to
a build whose `main` (`dist/maxrects-packer.cjs`), `module` and `types` (`dist/index.d.ts`) match this
repository. [#61](https://github.com/soimy/maxrects-packer/issues/61) and
[#62](https://github.com/soimy/maxrects-packer/issues/62) are answered and closed. The `padding` fix
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
The four Dependabot alerts in the docs-site tree: resolved by moving to `vitepress@2.0.0-alpha.20`,
whose `vite: ^8.2.1` leaves a single `vite@8.3.4` and no `esbuild` at all. The nested `vite@5.4.21`
and `esbuild@0.21.5` the `1.6.4` pin dragged in could not have been patched in place: 5.4.21 and
0.21.5 are the newest releases those lines ever got, and no advisory backported a fix below
`vite@6.4.2`. The workflow action-major upgrade landed in [PR #87](https://github.com/soimy/maxrects-packer/pull/87).
Re-verified on 2026-10-13 at `master` commit `1c889cf`:
[Node.js CI](https://github.com/soimy/maxrects-packer/actions/runs/38365767187) passed on Node 20/22/24,
and [Documentation](https://github.com/soimy/maxrects-packer/actions/runs/38365767185) passed its build
and actual Pages deployment. The release workflow was inspected only; publishing was not exercised.

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
