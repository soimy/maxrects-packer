# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
