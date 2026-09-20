# AGENTS.md

## 项目

`maxrects-packer`（v2.7.4，MIT，零运行时依赖）：TypeScript 实现的 **MaxRects 二维装箱**库，把任意 `{width, height}`
矩形装进**尽量少**的、不超过 `maxWidth × maxHeight` 的 bin（sprite sheet / 纹理图集）。

- 只做几何计算：不读写图片、不读写文件、不依赖 DOM/Node API（可在浏览器跑）。
- 目标场景是 WebGL/图集：宁可多开几个 bin，也不生成一张巨型图。
- 上游是 Multi-Bin-Packer 的重写版，公开 API 保持兼容，别随意改签名。

## 结构

| 文件 | 职责 |
| --- | --- |
| `src/index.ts` | 唯一 barrel 出口（`Rectangle / MaxRectsPacker / Bin / MaxRectsBin / OversizedElementBin` + 类型） |
| `src/types.ts` | `IOption`、`PACKING_LOGIC`（MAX_AREA/MAX_EDGE/FILL_WIDTH）、`EDGE_MAX_VALUE=4096`、`EDGE_MIN_VALUE=128`（仅导出，未被引用） |
| `src/geom/Rectangle.ts` | `IRectangle` 接口 + `Rectangle`：`width/height/x/y/rot/data/allowRotation` 全走 getter/setter，每次变更 `_dirty++`；`rot` setter 会交换宽高，`data` setter 会同步 `data.allowRotation` |
| `src/abstract-bin.ts` | `IBin` / 抽象 `Bin<T>`：`dirty` 语义与 `setDirty()`，`add/reset/repack/clone` 由子类实现 |
| `src/maxrects-bin.ts` | 单 bin 算法核心：`place → findNode(打分) → splitNode(切分) → pruneFreeList → updateBinSize/expandFreeRects` |
| `src/oversized-element-bin.ts` | 单个超大元素的占位 bin（`rect.oversized = true`，`add()` 永远返回 `undefined`） |
| `src/maxrects-packer.ts` | 多 bin 调度：`add / addArray / next / repack / save / load / sort / rects` |

数据流：

```
调用方 rects
  → addArray: 排序(MAX_EDGE|MAX_AREA，等值再看 hash；tag 非独占时先按 tag 分组)
  → add: 尺寸越界？→ OversizedElementBin；否则从 bins[_currentBinIndex..] 里找第一个接得下的 bin
  → MaxRectsBin.place: findNode 按 logic 打分选空闲矩形 → splitNode 切分 → pruneFreeList → updateBinSize 扩容(pot/square)
  → 就地把 x/y/rot 写回该 rect 并 push 进 bin.rects
```

## 必须保持的契约

1. **就地改写**：`add()/addArray()` 直接在传入对象上写 `x/y/rot/oversized` 并返回同一对象（多参数重载才内部 `new Rectangle`）。
2. **tag 分组**：`exclusiveTag: true`（默认）时，带 tag 的 rect 只能进 tag 相同的 bin，无 tag 的 bin 拒收 tagged rect——`MaxRectsBin.add()` 与 `place()` 里各有一道检查，两边都要动。`exclusiveTag: false` 走 `addArray()` 里的分组 + 递归路径。
3. **`next()` 只作用于之后**：`_currentBinIndex = bins.length`，此前的 bin 不再接收新元素；查找永远从该下标开始。
4. **dirty 传播**：`Rectangle` 属性变更自增 `_dirty`，`Bin.dirty` = 自身 `_dirty > 0` 或任一 rect dirty；`repack(quick=true)` 只重排 dirty bin。改动 setter 语义会破坏增量 repack。
5. **save/load 只存空闲区**：`save()` 导出的 bin 里 `rects` 恒为空数组，只有尺寸/options/tag/freeRects；`load()` 也只恢复空闲矩形。已放置的 rect 需调用方自己重新 `add`（测试已锁定该行为，别"顺手补齐"）。
6. **尺寸账目**：初始 freeRect 为 `maxWidth + padding - border*2`；放置时用 `rect.width + padding` 探测；`updateBinSize` 里 pot/square 先取整再校验 `maxWidth/maxHeight`，不通过则放弃扩容。
7. **泛型**：`MaxRectsPacker<T extends IRectangle>` / `MaxRectsBin<T>`，允许传入自定义类实例并原样保留其附加属性；`Rectangle.data.allowRotation` 可逐元素覆盖 packer 的 `options.allowRotation`。

## 命令

> ⚠️ 下面描述的是 `chore/update-deps` 分支（modernization）的工具链。该分支未合并前，master 上还没有 lint / format / typecheck 这三个脚本。

```bash
npm ci                       # 本机 NODE_ENV=production 会让 npm 省略 devDeps，必须加 --include=dev
npm test                     # = rimraf dist + rollup 构建 + jest
npm run typecheck            # 原生 TypeScript 7：tsc --noEmit -p tsconfig.json
npm run lint                 # oxlint（基线是 0 warning / 0 error）
npm run lint:fix             # oxlint --fix
npm run format               # oxfmt 写回；CI 用 npm run format:check 只检查
npm run cover                # 构建 + jest --coverage
npm run doc                  # typedoc → docs/（未纳入 git）
npx jest test/maxrects-packer.spec.js   # 单跑某个 spec（不必重新构建）
```

- 工具链：rollup + `@rollup/plugin-typescript` 打包，jest + ts-jest 测试，oxlint/oxfmt 负责 lint 与格式化，`commit-and-tag-version` 发版。
- **双 TypeScript（官方 6/7 并存方案）**：`typescript` 别名到 `@typescript/typescript6`，提供 JS 编译器 API——typedoc / ts-jest / rollup 插件都吃它；`@typescript/native` 是原生 TS 7，`node_modules/.bin/tsc` 指向它。因此：`npm run typecheck` 跑的是 TS 7，而构建/文档/测试跑的是 TS 6 API。改 tsconfig 时两边都要照顾：TS 7 已移除 `baseUrl` / `moduleResolution: node10` / `target: es5`，所以 `tsconfig.json`（类型检查用）保持干净；`tsconfig.build.json` 里的 `target: es5` 靠 `ignoreDeprecations: "6.0"` 让 TS 6 闭嘴。
- 测试 specs 是 CommonJS 风格 JS，`require("../src/xxx")` 直接吃 TS 源码（ts-jest ESM preset），**不测 dist**。构建失败/产物问题测试发现不了，改构建请手工比对 `dist`。
- 基线：`6 suites / 66 passed / 2 skipped`，语句覆盖率 ≈95%；`collectCoverage: true` 使**每次跑测试都会重写 `test/coverage/`**（已 gitignore）。
- `test/efficiency.spec.js` 里两个 `test.skip` 是 `scenarios.json` + `ascii-table` 的批量对照表，需要手工放开才跑。
- CI：`.github/workflows/node.js.yml`（Node 20/22/24：lint → format:check → typecheck → cover）；`release.yml` 由 `v*` tag 触发。

## 工作树

本仓库的**默认工作树路径是 `.worktrees/`**：需要并行/隔离改动时，在仓库根目录下按分支建链表工作树，不要建到仓库外面。

```bash
git worktree add .worktrees/<branch> <branch>      # 已有分支
git worktree add .worktrees/<branch> -b <branch>   # 新建分支
git worktree remove .worktrees/<branch>            # 用完清理
```

- `.worktrees/` 已写进 `.gitignore`，不要提交它，也不要往里放需要版本控制的文件。
- 每个工作树是独立工作目录：`node_modules/`、`dist/`、`lib/`、`test/coverage/` 都不会共享，第一次进去先 `npm ci`，否则 `npm test` 会因为缺依赖或拿到过期产物而失败。
- 主工作树（仓库根目录）仍是默认工作位置；只有明确要隔离时才用 `.worktrees/`。

## 约定

- 改动前先读完对应的 src 模块（算法改动通常牵扯 `place/findNode/updateBinSize` 三处联动）。
- 格式一律交给 `oxfmt`（4 空格、双引号、分号、printWidth 120、无 trailing comma、函数名与括号之间不留空格），别手工对齐；`public/private` 显式修饰符保留，新公开 API 要写 JSDoc（`@param` 带 `- `，`@property` 要带类型）。
- 行尾统一 LF（`.gitattributes` 里 `* text=auto eol=lf`），别在编辑器里改回 CRLF。
- 改动算法后必须 `npm test`，`maxrects-bin.spec.js` 里的随机 monkey 测试（重叠 + 越界断言）是主要回归网；能固定输入的边界情形请补显式断言而不是依赖随机。
- 提交信息走 conventional commits（`feat/fix/chore/docs`），版本由 `commit-and-tag-version` 生成 `CHANGELOG.md`，别手改版本号。

## 已知坑（先当现状，不要顺手"修"成别的行为）

- **ES5 产物是 esbuild/rolldown 路线的唯一拦路虎**：`tsconfig.build.json` 的 `target: es5` 使 tsc 系列成为唯一能出 ES5 的编译路径（实测 esbuild 直接报 `Transforming const to the configured target environment ("es5") is not supported yet`）。哪天决定放弃 ES5 兼容，构建就能整体换成 esbuild/rolldown，同时也能摆脱对 TS 6 JS API 的依赖。
- `typedoc` 目前只支持到 TS 6 的 JS API（peer `… || 6.0.x`），这就是 `typescript` 必须保持 6.x 别名的原因；等 typedoc 支持 TS 7 才能把别名换成真正的 `typescript@7`。
- `MaxRectsBin.reset(true, true)` 会把 `options` 整体换成残缺对象：缺 `exclusiveTag`/`logic`，且 `square` 变成 `true`（与类默认值不同）。
- `packer.add(w, h, undefined)` 且 `options.tag === true` 时抛 `TypeError`（`rect.data.tag`；单参数分支有 `&&` 守卫，这条没有）。
- 打包/入口：`package.json` 是 `"type": "module"`，包内 `.js` 会被 Node 当 ESM 解析，所以 `main` 必须指向 `.cjs`（`dist/maxrects-packer.cjs`）——历史上 `main` 指过 UMD 的 `.js`，导致 `require()` 拿到空对象整整 3 年半。`npm run build` 后会自动跑 `scripts/verify-entry.mjs` 自检入口导出，别删这个 postbuild。目前仍没有 `exports` 字段，所以深路径导入（`maxrects-packer/dist/...`）可用；加 `exports` 会封闭深路径，属 breaking，留给 3.0.0。
- 构建 `min.js` 那条 rollup 配置（`sourcemap: false`）会打一条 `Rollup 'sourcemap' option must be set to generate source maps` 的提示，属已知无害噪声。
- `cz-conventional-changelog` 是唯一还没换掉的陈旧依赖（只服务于 commitizen 交互式提交），可换 commitlint 或直接删。
