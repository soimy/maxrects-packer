# VitePress documentation migration — Phase A integration spike

Result of [issue #81](https://github.com/soimy/maxrects-packer/issues/81) phase A. The point of the
spike is evidence: does the candidate toolchain build, what exactly does it emit, and which published
URLs and anchors survive.

Everything below was measured in a throwaway worktree (`docs/vitepress-spike`, from `202a9f6`) on
2026-09-30, not inferred from the proposal.

## Verdict

The combination works, on the first attempt and without configuration workarounds:

| Package | Version installed | Note |
| --- | --- | --- |
| `vitepress` | 1.6.4 | stable line, not the 2.x alpha |
| `typedoc` | 0.28.20 | unchanged, reads the TypeScript 6 JS API as today |
| `typedoc-plugin-markdown` | 4.13.1 | produces the API markdown |
| `typedoc-vitepress-theme` | 1.1.4 | `docsRoot` + `typedoc-sidebar.json` |

Installed with `npm install --no-save` inside the worktree: `package.json` and `package-lock.json`
stayed byte-identical (`git status` clean) and `grep -c mirrors.cloud.tencent.com package-lock.json`
is 0, so the mirror trap recorded in `AGENTS.md` was not triggered.

## What was built

```bash
npx typedoc --options typedoc.spike.json     # -> docs/api/*.md + typedoc-sidebar.json
npx vitepress build docs                     # -> docs/.vitepress/dist/**
```

Spike configuration (`typedoc.spike.json`, throwaway):

```json
{
    "entryPoints": ["src/index.ts"],
    "entryPointStrategy": "expand",
    "out": "docs/api",
    "docsRoot": "docs",
    "readme": "none",
    "plugin": ["typedoc-plugin-markdown", "typedoc-vitepress-theme"],
    "theme": "default",
    "excludePrivate": true,
    "skipErrorChecking": true,
    "tsconfig": "tsconfig.json"
}
```

Emitted:

- `docs/api/` — 10 markdown files: `index.md` plus `classes/` (Bin, MaxRectsBin, MaxRectsPacker,
  OversizedElementBin, Rectangle), `interfaces/` (IBin, IOption, IRectangle), `enumerations/`
  (PACKING_LOGIC) — all six runtime and three type exports, plus `typedoc-sidebar.json`.
- `docs/.vitepress/dist/` — 13 HTML pages at base `/maxrects-packer/`, with the local search index
  (`assets/chunks/@localSearchIndexroot.*.js`).

## Acceptance checks run

| Check (from #81) | Method | Result |
| --- | --- | --- |
| Clean checkout builds without preexisting API markdown | `rm -rf docs/api docs/.vitepress/{dist,cache}` then generate + build | 10 md, 13 pages, exit 0 |
| Repeated generation leaves no stale API pages | wrote `docs/api/classes/Ghost.md`, regenerated | removed — TypeDoc's `cleanOutputDir` default is enough |
| All nine exports present, with generics and overloads | file inventory; `MaxRectsPacker\<T\>`, `## Type Parameters`, two `#### Call Signature` blocks under `### add()` | present |
| Cross-page links resolve | VitePress dead-link check (default on) + built HTML | `./../interfaces/IRectangle.html` |
| `spec/**` and `plans/**` excluded from pages and search | stub pages carrying `SPIKE_SPEC_MARKER` / `SPIKE_PLAN_MARKER` | absent from `dist/` and from the search index |
| Local search works | `themeConfig.search = { provider: "local" }` | index chunk emitted |
| Published package unaffected | `npm pack --dry-run --json` | 0 `docs/` entries; only `typedoc.json` from the docs tooling |

## URL and anchor inventory

Page mapping (`legacy live URL` → `new page`, member anchors preserved / total checked):

| Legacy page | New page | Member anchors |
| --- | --- | --- |
| `classes/Bin.html` | `api/classes/Bin.html` | 21/23 |
| `classes/MaxRectsBin.html` | `api/classes/MaxRectsBin.html` | 22/33 |
| `classes/MaxRectsPacker.html` | `api/classes/MaxRectsPacker.html` | 21/24 |
| `classes/OversizedElementBin.html` | `api/classes/OversizedElementBin.html` | 21/24 |
| `classes/Rectangle.html` | `api/classes/Rectangle.html` | 18/28 |
| `interfaces/IBin.html` | `api/interfaces/IBin.html` | 8/8 |
| `interfaces/IOption.html` | `api/interfaces/IOption.html` | 9/9 |
| `interfaces/IRectangle.html` | `api/interfaces/IRectangle.html` | 5/5 |
| `enums/PACKING_LOGIC.html` | `api/enumerations/PACKING_LOGIC.html` | 1/4 |
| `modules.html` | `api/index.html` | 3/12 |
| `index.html` (README as home) | `index.html` (VitePress home) | 0/21 |
| `hierarchy.html` | none | — |

Every missing anchor falls into one of four buckets, and only the first is a real compatibility loss:

1. **Private members the new build hides.** `_dirty`, `_currentBinIndex`, `_width`, `_height`, `_x`,
   `_y`, `_rot`, `_data`, `_allowRotation`, `stage`, `border`, `verticalExpand`, `findNode`, `place`,
   `splitNode`, `updateBinSize`, `pruneFreeList`, `expandFreeRects`, `sort`. They are anchors today
   only because the current `typedoc.json` sets `excludePrivate: false`; #81 asks for them to be
   hidden, and the algorithm story moves to `contributor/architecture.md`.
2. **Unhoax-theme composite anchors.** `constructorMaxRectsPackerT`, `constructorOversizedElementBinT-1`,
   `collide-2`, `contain-2` — an artifact of the current theme, with no equivalent heading.
3. **Case and separator changes.** Enum members: `#max_area` → `#max-area`, `#fill_width` →
   `#fill-width`. Object enum members behave the same way.
4. **Pages that change shape.** `modules.html`'s member list becomes `api/index.html`'s list;
   `index.html`'s README headings (`#usage`, `#installing`, …) become `docs/user/` pages;
   `hierarchy.html` has no successor and can redirect to `api/index.html`.

### Redirect plan for phase D

Static pages under the legacy paths (`classes/*.html`, `interfaces/*.html`, `enums/*.html`,
`modules.html`, `hierarchy.html`) that point at their new location, plus an anchor map for the
separator renames (`#max_area` → `#max-area`). The private-member and composite anchors cannot be
preserved without republishing private API, which is the wrong trade; they should 404 into the class
page and be listed in the migration notes.

## Configuration deltas from the current `typedoc.json`

| Option | Today | Proposed | Effect |
| --- | --- | --- | --- |
| `out` | `docs` | `docs/api` | generated markdown leaves the site root to the handwritten pages |
| `docsRoot` | — | `docs` | lets the theme build `typedoc-sidebar.json` against the site root |
| `plugin` | `typedoc-unhoax-theme` | `typedoc-plugin-markdown`, `typedoc-vitepress-theme` | HTML theme out, markdown in |
| `theme` | `unhoax` | `default` | markdown plugin's own theme |
| `excludePrivate` | `false` | `true` | private members stop being published (bucket 1 above) |
| `readme` | — | `none` | the API landing page is a module index, not a second README |
| `customCss` / `customJs` | `assets/custom.css`, `assets/custom.js` | — | those assets exist only for the old theme |
| `skipErrorChecking` | `true` | `true` for now | #81 keeps it initially; the separate `npm run typecheck` gate stays mandatory |

## Phase B — suggested scope for the first PR

1. `.gitignore`: replace the single `docs` line with `docs/api/`, `docs/.vitepress/cache/`,
   `docs/.vitepress/dist/` (the site root itself becomes tracked source).
2. Remove the old generated HTML from the working tree before adding tracked markdown (`docs/` is
   untracked today, so this is a local cleanup, not a deletion commit).
3. Split `typedoc.json`: the shared entry point/tsconfig options plus the markdown/vitepress output
   options, `out: "docs/api"`, `docsRoot: "docs"`.
4. `package.json` scripts: `docs:api`, `docs:dev`, `docs:build`, `docs:preview`, `docs:clean`, with
   `doc` / `doc:clean` kept as compatibility aliases; `doc:json` output moves to a generated
   location; `doc:publish` publishes `docs/.vitepress/dist/` only.
5. Move `DEFERRED_WORK.md` to `docs/plans/deferred-work.md` and update its three references
   (`AGENTS.md` twice, `vitest.config.js` once).
6. `docs:clean` must never touch the source root — assert it in a check that fails when the command
   is changed back to a whole-tree delete.
7. Add `docs/.vitepress/config.mts` (base `/maxrects-packer/`, local search, `srcExclude` for
   `spec/**` and `plans/**`) and `docs/index.md`; the migrated user pages arrive in phase C.

## Open decisions

1. **Hosting** — #81 proposes keeping GitHub Pages at `https://soimy.github.io/maxrects-packer/`
   with base `/maxrects-packer/`; Vercel is the alternative only if online PR previews are required.
   The spike built successfully at the Pages base path.
2. **Private-member anchors** — dropping them is what hiding private API costs; confirm that
   `excludePrivate: true` is wanted, since it is the largest bucket in the inventory above.
3. **TypeDoc warnings** — the build printed none for this source, so nothing has to be decided yet
   about turning warnings into errors.