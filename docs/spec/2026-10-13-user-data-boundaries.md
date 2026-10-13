# User data and bin ownership

## Decision

Rectangles and the caller's input array belong to the caller. Packing writes the documented geometry
fields in place, while preserving input-array order, rect identity, tags, payload values and custom
state. Non-exclusive packing never derives a bin label from a rect tag, as established by PR #124.

Bins belong to the library. Full repacking rebuilds them and may merge or split their contents;
bin-level metadata is not migrated. User data that must survive a rebuild belongs on the rects or
their payloads. No migration callback, automatic attribution or extra user-data structure is added.
An oversized bin remains a one-rect carrier whose data references its rect's data. Custom rect
cloning keeps the existing state/behaviour rules and shallow payload sharing.

## Changes

- `addArray()` accepts a readonly array and sorts copies in both modes. Rect objects still receive
  geometry updates; no metadata fields are added to them or their payloads.
- Explicit `null` payloads are preserved by `Rectangle.data` and both numeric `add()` overloads.
  Omitting data retains `{}`. Two-argument `OversizedElementBin` retains bin data `null` and rect
  data `{}`; explicitly passing a third `null` gives both fields `null`.
- `save()` and `load()` distinguish an absent/undefined tag from an explicitly supplied value,
  including an empty string. This does not change the tag reader's historical grouping rules.
- `save()` copies the options object instead of exposing the active bin's object. This is shallow;
  nested objects are shared. Snapshot fields and the empty `rects` array stay unchanged.
- Guides identify bin ownership, full-repack metadata lifetime and reserved rect fields. Business
  metadata should use custom rect fields or a caller-chosen namespace inside `rect.data`, avoiding
  the packing protocol's names. The library does not introduce that namespace itself.

## Compatibility and verification

Target 3.0.0 and mark the commit breaking: callers must no longer rely on grouped input reordering,
`null` being ignored, or saved options mutating live state. No dependency, runtime export, version or
snapshot-schema change is needed. Fixed regressions must fail on the pre-change implementation,
then pass with the change. Verify full tests/coverage, lint, formatting, both TypeScript compiler
paths, docs and the installed tarball. Compare CJS/ESM behaviour and fixed-input placements with the
baseline; make no claim about a globally minimum bin count.
