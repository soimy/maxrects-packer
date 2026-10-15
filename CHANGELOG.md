# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [3.0.0-rc.1](https://github.com/soimy/maxrects-packer/compare/v2.7.4...v3.0.0-rc.1) (2026-10-15)

### ⚠ BREAKING CHANGES

* `MaxRectsPacker`, `MaxRectsBin` and `OversizedElementBin` default
  `T` to `IRectangleInput` rather than `Rectangle`, so `bins[i].rects[i]` is no longer
  the `Rectangle` class unless the caller names it. `IRectangleInput` joins the public
  type exports, and `IBin.rects` is `IRectangleInput[]`.

  * test: pin every widened input, not just the packer's

  The fixture passed a coordinate-free rect through `MaxRectsPacker` alone, so the
  other three places this change widens — `MaxRectsBin.add`, the `OversizedElementBin`
  constructor and `Rectangle.Clone` — were not covered by any package-level check.

  Each of the four is now asserted, and each was measured to bite: narrowing any one of
  them back (`Rectangle.Clone` to `IRectangle`, either bin to its former constraint and
  default, or the packer's default to `Rectangle`) makes `verify:package` fail under
  `bundler`, and restoring it passes. The packer's default reports 3 errors, the other
  three 1 each.

  * test: pin the generic on the results, not just on the inputs

  The previous fixture checked the widened input contract but not the
  outgoing one: `sheets.rects[0].label` reads through `IRectangleInput`'s
  index signature, which types any field as `any`, so it kept compiling
  when `get rects()` was widened to `IRectangleInput[]`. Measured by
  widening the getter and `Bin.rects` in turn: the field read stayed
  silent both times.

  Only an explicit array annotation pins the generic. `packedSheets`,
  `binRects` and `sprites` cover the packer's getter, `Bin.rects` and a
  coordinate-free custom type in one line each, and each of the three
  fails verify:package on its own mutant (2, 1 and 3 errors) while the
  restored build passes.
* **tags:** non-exclusive add() no longer assigns the first rect tag to bin.tag or emits that automatic label from save(). Read rect tags or assign bin metadata explicitly; loaded and explicit labels remain preserved.

  docs(plan): record the non-exclusive tag fix pull request

  docs(plan): retire the tag task as its implementation lands
* **data:** preserve caller data and isolate packing snapshots (#127)
* the exports map is exhaustive, so deep imports into the
  package (maxrects-packer/dist/..., maxrects-packer/src/...) no longer resolve
  and fail with ERR_PACKAGE_PATH_NOT_EXPORTED. Import the package by name,
  which now resolves per format.

  * docs: describe both verify:package type fixtures

  verify:package compiles two fixtures now: the ESM one under bundler,
  node16 and nodenext, and the CommonJS .cts one under node16 and
  nodenext. compatibility.md and the development.md command table read as
  if both fixtures ran under all three modes.

  * docs: correct the deep-import and dual-package claims

  The troubleshooting page said deep imports "now fail with
  ERR_PACKAGE_PATH_NOT_EXPORTED in Node and TypeScript alike". That is a Node

### Features

* add an exports map with per-format declarations ([#129](https://github.com/soimy/maxrects-packer/issues/129)) ([7ae06f9](https://github.com/soimy/maxrects-packer/commit/7ae06f953ba5ef829626e4960fe27dcea2544c3d))

### Bug Fixes

* accept the rects the guides actually pass ([#131](https://github.com/soimy/maxrects-packer/issues/131)) ([907b008](https://github.com/soimy/maxrects-packer/commit/907b0081e6ab64acff4f0c3d7bbecb4b29acae02)), references [#46](https://github.com/soimy/maxrects-packer/issues/46)
* accept the two-argument oversized bin construction in the types ([#77](https://github.com/soimy/maxrects-packer/issues/77)) ([d082270](https://github.com/soimy/maxrects-packer/commit/d082270f310cb68d14ef37a895b95aa9ac2abb99))
* **clone:** preserve oversized placeholder state ([#126](https://github.com/soimy/maxrects-packer/issues/126)) ([6c34d9e](https://github.com/soimy/maxrects-packer/commit/6c34d9e9f8b25d48d8fed695c668c1910c09ec16))
* **data:** preserve caller data and isolate packing snapshots ([#127](https://github.com/soimy/maxrects-packer/issues/127)) ([155757f](https://github.com/soimy/maxrects-packer/commit/155757f35d3d237e9e6fe24c4208d6bb7635742f))
* **geom:** serialize a rect to its public shape ([#132](https://github.com/soimy/maxrects-packer/issues/132)) ([fd89826](https://github.com/soimy/maxrects-packer/commit/fd89826ad1cfd3d8aeba93fa4b8bbcce3834148f)), references [#53](https://github.com/soimy/maxrects-packer/issues/53)
* give the published declarations explicit .js extensions ([#78](https://github.com/soimy/maxrects-packer/issues/78)) ([203bb96](https://github.com/soimy/maxrects-packer/commit/203bb96c5e5d1c9535fc099c5639839ca4a4c31d))
* guard rect.data before accessing .tag to prevent TypeError ([#105](https://github.com/soimy/maxrects-packer/issues/105)) ([e9359d9](https://github.com/soimy/maxrects-packer/commit/e9359d949358a86b3fa977713a2c294edeb8e104)), references [#91](https://github.com/soimy/maxrects-packer/issues/91) [#91](https://github.com/soimy/maxrects-packer/issues/91)
* keep rotated rects and their bins consistent ([#76](https://github.com/soimy/maxrects-packer/issues/76)) ([adcf88b](https://github.com/soimy/maxrects-packer/commit/adcf88b18318d0f12d5ba6b552f99b3a59fac8a7))
* keep the saved free space of an oversized loaded bin ([#114](https://github.com/soimy/maxrects-packer/issues/114)) ([ba456a5](https://github.com/soimy/maxrects-packer/commit/ba456a5aeef449b8ec4c546faf7c6b2eeb622646)), closes [#113](https://github.com/soimy/maxrects-packer/issues/113)
* let a custom clone() keep the properties it defines ([#80](https://github.com/soimy/maxrects-packer/issues/80)) ([202a9f6](https://github.com/soimy/maxrects-packer/commit/202a9f60ecde785cceb7adff19dee65b4e5774f5))
* make clone() copy its rects instead of sharing them ([#79](https://github.com/soimy/maxrects-packer/issues/79)) ([e884d35](https://github.com/soimy/maxrects-packer/commit/e884d35be72612db4fb2e867296cf1c56b45f18e)), references [#width](https://github.com/soimy/maxrects-packer/issues/width) [#x](https://github.com/soimy/maxrects-packer/issues/x)
* point the README icon at an absolute URL ([#120](https://github.com/soimy/maxrects-packer/issues/120)) ([45cb7ce](https://github.com/soimy/maxrects-packer/commit/45cb7ced97c89867e2355314963c6cece0ba9cbe)), closes [#102](https://github.com/soimy/maxrects-packer/issues/102)
* replay rotated rects in the orientation the caller handed them over in ([#121](https://github.com/soimy/maxrects-packer/issues/121)) ([8584fe3](https://github.com/soimy/maxrects-packer/commit/8584fe331328ab928675f83be857b3229ea22dc5))
* restore an oversized loaded bin at its own index ([#112](https://github.com/soimy/maxrects-packer/issues/112)) ([51d6cae](https://github.com/soimy/maxrects-packer/commit/51d6caebc3e0ad5d1636abac572b17b925f436f8)), closes [#89](https://github.com/soimy/maxrects-packer/issues/89), references [#89](https://github.com/soimy/maxrects-packer/issues/89) [#89](https://github.com/soimy/maxrects-packer/issues/89)
* restore Node CJS/ESM entry points and modernize the dev toolchain ([#68](https://github.com/soimy/maxrects-packer/issues/68)) ([c228385](https://github.com/soimy/maxrects-packer/commit/c2283857bf1fa6373ff94075016d6c8c9e537b66))
* restore the documented TypeScript exports and gate the suite's measurements ([#75](https://github.com/soimy/maxrects-packer/issues/75)) ([12a4a36](https://github.com/soimy/maxrects-packer/commit/12a4a36acfa3fdc9009c5a45eadf2c7c8a61871f)), references [#68](https://github.com/soimy/maxrects-packer/issues/68)
* stop calling post-ES5 runtime APIs in the published bundles ([#110](https://github.com/soimy/maxrects-packer/issues/110)) ([c18fd9c](https://github.com/soimy/maxrects-packer/commit/c18fd9c58800b51baf387cbf6f0240051a1ea3c7)), closes [#107](https://github.com/soimy/maxrects-packer/issues/107), references [#107](https://github.com/soimy/maxrects-packer/issues/107)
* stop invalid padding arithmetic from retrying place() forever ([#122](https://github.com/soimy/maxrects-packer/issues/122)) ([1c889cf](https://github.com/soimy/maxrects-packer/commit/1c889cfc0b6822ec135638d495a8837bffb96930)), references [#43](https://github.com/soimy/maxrects-packer/issues/43)
* **tags:** stop labelling non-exclusive bins automatically ([#124](https://github.com/soimy/maxrects-packer/issues/124)) ([3f0afa9](https://github.com/soimy/maxrects-packer/commit/3f0afa996122652d34f0d1bb64ff18a351b1a00f))

### [2.7.4](https://github.com/soimy/maxrects-packer/compare/v2.7.3...v2.7.4) (2025-08-28)


### Bug Fixes

* circular dependencies on maxracts-packer.ts ([1172feb](https://github.com/soimy/maxrects-packer/commit/1172feb0c702a6d8e7416aab3f0ef92d359d4066))
* Bugs in edgy rect placement in updateBinSize() (#56)
* 51 expanding one dimension (#54)

### [2.7.3](https://github.com/soimy/maxrects-packer/compare/v2.7.2...v2.7.3) (2022-02-02)


### Bug Fixes

* Recursion with non-exclusive tags addArray ([#34](https://github.com/soimy/maxrects-packer/issues/34)) ([d107163](https://github.com/soimy/maxrects-packer/commit/d107163dc214e1f4f45d1bf4241efe8e5b1b34b3))

### [2.7.2](https://github.com/soimy/maxrects-packer/compare/v2.7.1...v2.7.2) (2021-01-15)


### Bug Fixes

* addArray empty array throw error [#23](https://github.com/soimy/maxrects-packer/issues/23) ([9ba6605](https://github.com/soimy/maxrects-packer/commit/9ba6605))



### [2.7.1](https://github.com/soimy/maxrects-packer/compare/v2.7.0...v2.7.1) (2020-09-18)


### Bug Fixes

* Non-exclusive tag logic: Restart test iteration on next tag group ([8b59925](https://github.com/soimy/maxrects-packer/commit/8b59925)), closes [#20](https://github.com/soimy/maxrects-packer/issues/20) [#20](https://github.com/soimy/maxrects-packer/issues/20)



## [2.7.0](https://github.com/soimy/maxrects-packer/compare/v2.6.0...v2.7.0) (2020-09-16)


### Features

* Non exclusive tag grouping ([#21](https://github.com/soimy/maxrects-packer/issues/21)) ([cf28fc5](https://github.com/soimy/maxrects-packer/commit/cf28fc5)), closes [#20](https://github.com/soimy/maxrects-packer/issues/20)



## [2.6.0](https://github.com/soimy/maxrects-packer/compare/v2.5.0...v2.6.0) (2020-02-13)


### Bug Fixes

* fixes to default packing logic usage and documentation ([#12](https://github.com/soimy/maxrects-packer/issues/12)) ([caa1532](https://github.com/soimy/maxrects-packer/commit/caa1532))


### Build System

* Update rollup config & dts plugin ([1d1b80e](https://github.com/soimy/maxrects-packer/commit/1d1b80e))


### Features

* Per rectangle allowRotation ([ab68e1c](https://github.com/soimy/maxrects-packer/commit/ab68e1c))



## [2.5.0](https://github.com/soimy/maxrects-packer/compare/v2.4.5...v2.5.0) (2019-09-03)


### Features

* area or edge logic selection option ([c4dff4b](https://github.com/soimy/maxrects-packer/commit/c4dff4b))


### Tests

* efficiency tests refactoring ([0afa958](https://github.com/soimy/maxrects-packer/commit/0afa958))



### [2.4.5](https://github.com/soimy/maxrects-packer/compare/v2.4.4...v2.4.5) (2019-08-26)



### [2.4.4](https://github.com/soimy/maxrects-packer/compare/v2.4.3...v2.4.4) (2019-07-10)


### Bug Fixes

* save/load bins with tag correctly ([ac95c4a](https://github.com/soimy/maxrects-packer/commit/ac95c4a))



### [2.4.3](https://github.com/soimy/maxrects-packer/compare/v2.4.2...v2.4.3) (2019-07-09)


### Bug Fixes

* process() vertical expand not take border into account ([7382912](https://github.com/soimy/maxrects-packer/commit/7382912))
* updateBinSize() not consider rotated node ([aee9a4b](https://github.com/soimy/maxrects-packer/commit/aee9a4b))


### Tests

* add set rotation test ([0f1d301](https://github.com/soimy/maxrects-packer/commit/0f1d301))



### [2.4.2](https://github.com/soimy/maxrects-packer/compare/v2.4.1...v2.4.2) (2019-07-08)


### Bug Fixes

* handle rotated rectangle feeded to packer correctly ([81c80e0](https://github.com/soimy/maxrects-packer/commit/81c80e0))



### [2.4.1](https://github.com/soimy/maxrects-packer/compare/v2.4.0...v2.4.1) (2019-07-04)



## [2.4.0](https://github.com/soimy/maxrects-packer/compare/v2.4.0-alpha.0...v2.4.0) (2019-06-30)


### Bug Fixes

* Export IBin interface ([aaa40a4](https://github.com/soimy/maxrects-packer/commit/aaa40a4))



## [2.4.0-alpha.0](https://github.com/soimy/maxrects-packer/compare/v2.3.0...v2.4.0-alpha.0) (2019-06-19)


### Bug Fixes

* **maxrects-bin.ts:** split freerect not use rotated node ([5f06524](https://github.com/soimy/maxrects-packer/commit/5f06524))


### Features

* Add `Bin.border` to control space to edge ([62bc66b](https://github.com/soimy/maxrects-packer/commit/62bc66b)), closes [#5](https://github.com/soimy/maxrects-packer/issues/5)
* Implement `dirty` status get/set of `Rectangle`&`MaxRectsBin` ([ca932ba](https://github.com/soimy/maxrects-packer/commit/ca932ba))
* Report bin dirty status ([a7527b6](https://github.com/soimy/maxrects-packer/commit/a7527b6))
* reset/repack (beta) ([eb93239](https://github.com/soimy/maxrects-packer/commit/eb93239))



## [2.3.0](https://github.com/soimy/maxrects-packer/compare/v2.2.0...v2.3.0) (2019-06-06)


### Features

* tag based group packing ([#7](https://github.com/soimy/maxrects-packer/issues/7)) ([0fa7a8c](https://github.com/soimy/maxrects-packer/commit/0fa7a8c))



## [2.2.0](https://github.com/soimy/maxrects-packer/compare/v2.1.2...v2.2.0) (2019-06-04)


### Features

* Add `.next()` method to enclose and start a new bin ([9dbe754](https://github.com/soimy/maxrects-packer/commit/9dbe754))



### [2.1.2](https://github.com/soimy/maxrects-packer/compare/v2.1.1...v2.1.2) (2019-06-03)



### [2.1.1](https://github.com/soimy/maxrects-packer/compare/v2.1.0...v2.1.1) (2019-06-03)


### Build System

* Update package config & toolchain ([b117652](https://github.com/soimy/maxrects-packer/commit/b117652))


### Features

* Add hash as 2nd sort for stable pack queue ([499b82e](https://github.com/soimy/maxrects-packer/commit/499b82e))
* Retangle class rot&data getter setter ([438014e](https://github.com/soimy/maxrects-packer/commit/438014e))
