# Documentation

The site is VitePress, and the API reference inside it is generated from the source and its JSDoc by
TypeDoc. The design comes from
[issue #81](https://github.com/soimy/maxrects-packer/issues/81), and its integration spike report is
tracked at [`docs/spec/2026-09-30-docs-migration-spike.md`](https://github.com/soimy/maxrects-packer/blob/master/docs/spec/2026-09-30-docs-migration-spike.md).

## Source and output

| Path | Holds | Git |
| --- | --- | --- |
| `docs/index.md`, `docs/user/`, `docs/contributor/`, `docs/releases/` | Handwritten site pages | tracked |
| `docs/spec/`, `docs/plans/` | Designs, specifications and the deferred-work ledger | tracked, excluded from the site |
| `docs/.vitepress/` | Site configuration | tracked, except `cache/` and `dist/` |
| `docs/api/` | API markdown generated from JSDoc | ignored, never edited by hand |
| `docs/.vitepress/dist/` | Built site | ignored |

`srcExclude` in `docs/.vitepress/config.mts` keeps `spec/**` and `plans/**` out of the site *and* out
of the search index; the navigation does not mention them either, which on its own would not be enough.

## Commands

| Command | Effect |
| --- | --- |
| `npm run docs:api` | Clean and regenerate `docs/api/` only. |
| `npm run docs:dev` | Generate the API, then start the VitePress dev server. |
| `npm run docs:build` | Generate the API, then build the complete site into `docs/.vitepress/dist/`. |
| `npm run docs:preview` | Serve the production build locally. |
| `npm run docs:clean` | Delete `docs/api/`, `docs/.vitepress/cache/` and `docs/.vitepress/dist/` — nothing else. |
| `npm run verify:docs` | Assert the whole boundary described above. |

`doc`, `doc:clean`, `doc:json`, `doc:publish` and `doc:serve` remain as aliases so older notes keep
working; `doc:publish` publishes the built site only.

## The boundary is enforced

`scripts/verify-docs.mjs` runs in CI before the tests and asserts, through git itself:

- `docs/index.md`, `docs/.vitepress/config.mts`, `docs/spec/**` and `docs/plans/**` are **not** ignored
  (checked with `--no-index`, so a rule covering tracked source is caught too);
- `docs/api/**`, `docs/.vitepress/cache/**` and `docs/.vitepress/dist/**` **are** ignored;
- `docs:clean` leaves every source file byte-identical and removes the generated ones. The command
  under test runs in a throwaway fixture holding a copy of the documentation source, **never in the
  checkout**: a `docs:clean` that regressed to wiping the tree would otherwise destroy a contributor's
  uncommitted work before the assertions reported it. The fixture's source files are inventoried with a
  hash of their contents before and after — a handful of sentinels would not notice a cleanup that
  deletes `docs/spec/*.md` by extension — and the checkout itself is fingerprinted too, so the promise
  that running this check cannot touch the working tree is verified rather than assumed.

`docs:build` is a CI step of its own: the boundary check says the files are in the right place, the build
says the site still builds from them.

## Writing a page

- **API documentation is JSDoc's job.** Nothing under the API reference is written by hand; a missing
  signature is a missing comment in `src/`, and `excludePrivate: true` keeps implementation members out
  of the site (the algorithm story belongs in [architecture](./architecture.md)).
- **New pages go where the routing rules in
  [`AGENTS.md`](https://github.com/soimy/maxrects-packer/blob/master/AGENTS.md) say**: user-facing
  details in `docs/user/`, contributor and process details in `docs/contributor/`, designs in
  `docs/spec/YYYY-MM-DD-<topic>.md`, execution plans in `docs/plans/YYYY-MM-DD-<topic>.md`.
- Add the page to the sidebar in `docs/.vitepress/config.mts`; the API sidebar is generated and must not
  be hand-edited.
- Links between pages are ordinary relative markdown links, and the build fails on a dead one. Link
  targets under `docs/api/` exist only after `npm run docs:api`, which every site command runs first.
- A documentation-visible behaviour change updates the guide, the JSDoc and the tests in the same pull
  request — the same rule as any other change.