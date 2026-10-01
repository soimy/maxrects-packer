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
| `docs/.vitepress/dist/` | Built site, plus the legacy-URL redirect pages | ignored |

`srcExclude` in `docs/.vitepress/config.mts` keeps `spec/**` and `plans/**` out of the site *and* out
of the search index; the navigation does not mention them either, which on its own would not be enough.

## Commands

| Command | Effect |
| --- | --- |
| `npm run docs:api` | Clean and regenerate `docs/api/` only. |
| `npm run docs:dev` | Generate the API, then start the VitePress dev server. |
| `npm run docs:build` | Generate the API, build the site into `docs/.vitepress/dist/`, write the legacy-URL redirects, then check the output. |
| `npm run docs:preview` | Serve the production build locally. |
| `npm run docs:clean` | Delete `docs/api/`, `docs/.vitepress/cache/` and `docs/.vitepress/dist/` — nothing else. |
| `npm run verify:docs` | Assert the whole boundary described above. |

`doc`, `doc:clean`, `doc:json` and `doc:serve` remain as aliases so older notes keep working.

`docs:preview` serves what the last build wrote, but it still loads the site config, and that config
imports the generated sidebar — so on a tree that was just cleaned it stops at
`Could not resolve "../api/typedoc-sidebar.json"` instead of reporting that there is no build. Run
`docs:build` first, or use `docs:dev`, which generates the API itself.

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
says the site still builds from them, and `scripts/verify-docs-output.mjs` asserts in the output what the
boundary check asserted in the tree:

- no page tree for `spec/` or `plans/` — which is also what keeps them out of the search index, since
  VitePress only indexes the pages it built;
- a built page for every handwritten page, and a nav or sidebar entry reaching each one: VitePress fails
  on a link that points nowhere, never on a page nothing links to;
- every internal link, **anchors included**: a missing `#anchor` is not a VitePress error, and TypeDoc's
  cross-references are full of them;
- a search index that carries site text rather than nothing;
- every absolute `href`/`src` under the configured base **and present in the build**, because a raw-html
  link that missed it works while serving locally and 404s once deployed — and a page still pointing at
  a file that was deleted (a retired theme's stylesheet, say) would otherwise stay green.

Each assertion was measured against a broken state before it was trusted: dropping `srcExclude`, deleting
a sidebar entry, renaming one anchor, appending a base-less link, deleting a referenced asset.

## Deployment

`.github/workflows/docs.yml` builds the site on every change that can affect it (`docs/**`, `src/**`,
`scripts/**`, `package.json`, `package-lock.json`, `typedoc.json`, `tsconfig.json`, the root markdown
files, this workflow) and uploads `docs/.vitepress/dist` as a Pages artifact. A `build` job does the
work — Node 24, `npm ci --include=dev`, `npm run typecheck` before `npm run docs:build` — and a
`deploy` job publishes that artifact to GitHub Pages.

`deploy` is gated on a push to `master`, so a pull request stops after the upload: the built site is
attached to the run as a downloadable artifact, but it is **not** published and the workflow offers no
preview URL. Reviewing a rendered page before the merge therefore means downloading that artifact and
serving it locally — `npm run docs:preview` does the same from a local build.

Deploying needs the repository's Pages source set to **GitHub Actions** (Settings → Pages → Build and
deployment); it is, and `master` has deployed through this workflow since the first successful run.
There is no second publishing path: the manual `gh-pages` push is gone with the script and the branch.

### Legacy URLs

The old site was TypeDoc's HTML at the Pages root, so `classes/*.html`, `interfaces/*.html`,
`enums/PACKING_LOGIC.html`, `modules.html` and `hierarchy.html` were published URLs. The build writes a
small redirect page at each of them (`scripts/build-legacy-redirects.mjs`) that points at the page which
replaced it, and it **fails the build** when a target is missing rather than shipping a redirect into a
404.

Deep links are their own story, measured against the published 2.7.4 site: of the 170 member anchors on
those 11 pages, **105 resolve** on the page that replaced them — the browser rewrites underscores to
hyphens first (`#max_area` → `#max-area`). The other 65 land on the page itself: 22 belonged to private
members, which `excludePrivate: true` keeps out of the site (`#_dirty`, `#findnode`, `#sort`); 28 are the
old theme's own anchors for signatures the new pages have no heading for (`#dirtydirty`, `#constructorbint`,
`#widthwidth-1`, `#collide-2`); and 15 are sections of the two legacy index pages, which redirect to
`api/index.html` — that page lists classes, interfaces and enumerations without a per-entry anchor for
`#maxrectspacker` or `#Bin`. The full inventory is in the
[spike report](https://github.com/soimy/maxrects-packer/blob/master/docs/spec/2026-09-30-docs-migration-spike.md),
whose Phase A counts are marked superseded there and whose re-measurement gives the numbers above.

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