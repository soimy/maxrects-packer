// Documentation boundary self-check: the site source under `docs/` is tracked, the three build
// products are not, and `docs:clean` may only delete those build products.
// Background: `docs/` used to be a single ignored directory holding the generated HTML, and cleaning
// it was `rimraf docs && mkdir docs`. Turning that tree into tracked source without moving both
// boundaries would hide handwritten specifications and plans from git and leave them one command away
// from deletion — neither failure is visible in a build that only looks at the site.
// oxlint-disable no-console -- this file is a verification CLI; printing the result is its output
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const failures = [];

// Paths are checked through git itself, so the assertions describe the repository and not a copy of
// its ignore rules. None of them has to exist: `git check-ignore` matches patterns only.
const TRACKED = ["docs/index.md", "docs/.vitepress/config.mts", "docs/spec/design.md", "docs/plans/plan.md"];
const GENERATED = ["docs/api/index.md", "docs/.vitepress/cache/state", "docs/.vitepress/dist/index.html"];
// One sentinel per tracked directory, so the clean check covers every category rather than the one
// that happens to be written first. They are created and removed by this check; a real source file is
// never written to, only watched (the first version of this script wrote a sentinel *into*
// `docs/index.md` and deleted it afterwards, which is the very failure it exists to catch).
const SOURCE_SENTINELS = ["docs/spec/.verify-docs", "docs/plans/.verify-docs"];
const SOURCE_FILES = ["docs/index.md", "docs/.vitepress/config.mts"];
const GENERATED_SENTINELS = [
    "docs/api/.verify-docs",
    "docs/.vitepress/cache/.verify-docs",
    "docs/.vitepress/dist/.verify-docs"
];

const isIgnored = (path) => {
    try {
        // `--no-index` matters: without it git reports nothing for a path that is already tracked, so a
        // new rule covering `docs/spec/` would pass this check while silently excluding every file added
        // there later. The rule is what is asserted here, not the current index.
        execFileSync("git", ["check-ignore", "--no-index", "-q", path], { cwd: root, stdio: "pipe" });
        return true;
    } catch {
        return false;
    }
};

for (const path of TRACKED) {
    if (isIgnored(path)) failures.push(`${path} is ignored — the documentation source would not be committed`);
}
for (const path of GENERATED) {
    if (!isIgnored(path)) failures.push(`${path} is not ignored — a build product would be committed`);
}

const written = [];
try {
    for (const path of SOURCE_FILES) {
        if (!existsSync(join(root, path)))
            failures.push(`${path} is missing before the check — the site source is incomplete`);
    }
    for (const path of [...SOURCE_SENTINELS, ...GENERATED_SENTINELS]) {
        // Refused rather than overwritten: the check deletes what it writes, so a real file sitting at
        // one of these paths would be lost while the run still reported success.
        if (existsSync(join(root, path))) {
            failures.push(`${path} already exists — the check will not overwrite and delete it`);
            continue;
        }
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), "verify-docs\n");
        written.push(path);
    }
    execFileSync("npm", ["run", "docs:clean"], { cwd: root, stdio: "pipe" });
    for (const path of [...SOURCE_SENTINELS, ...SOURCE_FILES]) {
        if (!existsSync(join(root, path))) failures.push(`docs:clean deleted ${path} — the site source is not safe`);
    }
    for (const path of GENERATED_SENTINELS) {
        if (existsSync(join(root, path)))
            failures.push(`docs:clean left ${path} behind — a stale build product survives`);
    }
} catch (error) {
    failures.push(`docs:clean could not be run: ${error.message}`);
} finally {
    // Never leave a sentinel behind, least of all in the tracked source directories: the generated
    // ones are already gone, the source ones are removed here.
    for (const path of written) rmSync(join(root, path), { force: true });
}

if (failures.length > 0) {
    console.error("Documentation boundary check failed:");
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    console.error("Tracked source: docs/*.md, docs/.vitepress/, docs/spec/, docs/plans/.");
    console.error("Generated, and the only paths docs:clean may delete: docs/api/, docs/.vitepress/{cache,dist}/.");
    process.exit(1);
}
console.log(`  ✓ documentation source tracked, build products ignored (${TRACKED.length} + ${GENERATED.length} paths)`);
console.log("  ✓ docs:clean removed the build products and kept the source");
console.log("Documentation boundary check passed");
