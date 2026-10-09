// Documentation boundary self-check: the site source under `docs/` is tracked, the three build
// products are not, and `docs:clean` may only delete those build products.
// Background: `docs/` used to be a single ignored directory holding the generated HTML, and cleaning
// it was `rimraf docs && mkdir docs`. Turning that tree into tracked source without moving both
// boundaries would hide handwritten specifications and plans from git and leave them one command away
// from deletion — neither failure is visible in a build that only looks at the site.
//
// Two rules make this safe to run:
//   * the checkout is never cleaned. The command under test runs in a throwaway fixture holding a copy
//     of the documentation source, so a `docs:clean` that regressed to wiping the tree cannot destroy a
//     contributor's work before the assertions report it — the earlier version ran it in the checkout
//     and deleted real files (an uncommitted draft among them) on the way to failing. The fixture also
//     gives the real tree something to be compared against: if anything in it changed, that is a
//     failure in itself.
//   * the assertions are about **every** source file, not about sentinels. An extensionless sentinel
//     survives a cleanup that deletes `docs/spec/*.md` by extension while the specifications are gone,
//     so the fixture's source files are inventoried with their contents and compared after the run.
// oxlint-disable no-console -- this file is a verification CLI; printing the result is its output
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
    cpSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    statSync,
    writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const failures = [];

// Build products: never source, and the only paths `docs:clean` may delete. Both the inventory and the
// sentinels use this one definition.
const GENERATED_DIRS = ["docs/api", "docs/.vitepress/cache", "docs/.vitepress/dist"];
const GENERATED = ["docs/api/index.md", "docs/.vitepress/cache/state", "docs/.vitepress/dist/index.html"];
// Paths whose ignore status is asserted through git. The ones under spec/ and plans/ do not have to
// exist: git matches patterns, and those are the files a new ignore rule would hide.
const TRACKED = ["docs/index.md", "docs/.vitepress/config.mts", "docs/spec/design.md", "docs/plans/plan.md"];
const SENTINELS = ["docs/api/.verify-docs", "docs/.vitepress/cache/.verify-docs", "docs/.vitepress/dist/.verify-docs"];

const isGenerated = (path) => GENERATED_DIRS.some((dir) => path === dir || path.startsWith(`${dir}/`));

const isIgnored = (path) => {
    try {
        // `--no-index` matters: without it git reports nothing for a path that is already tracked, so a
        // new rule covering `docs/spec/` would pass this check while silently excluding every file added
        // there later. The rule is what is asserted here, not the current index.
        execFileSync("git", ["check-ignore", "--no-index", "-q", path], {
            cwd: root,
            stdio: "pipe"
        });
        return true;
    } catch {
        return false;
    }
};

// Every documentation source file with the hash of its contents. Generated paths are skipped: they are
// allowed to change, and the sentinels inside them are asserted separately.
const inventory = (base) => {
    const files = new Map();
    const walk = (current) => {
        for (const entry of readdirSync(current, { withFileTypes: true })) {
            const full = join(current, entry.name);
            const path = relative(base, full);
            if (isGenerated(path)) continue;
            // `docs/public` is a symlink to `../assets`; isDirectory() is false for the link itself.
            if (entry.isDirectory() || (entry.isSymbolicLink() && statSync(full).isDirectory())) {
                walk(full);
            } else {
                files.set(path, createHash("sha256").update(readFileSync(full)).digest("hex"));
            }
        }
    };
    walk(join(base, "docs"));
    return files;
};

const compare = (before, after, label) => {
    for (const [path, hash] of before) {
        if (!after.has(path)) failures.push(`${label} deleted ${path} — the site source is not safe`);
        else if (after.get(path) !== hash) failures.push(`${label} rewrote ${path} — the site source is not read-only`);
    }
};

for (const path of TRACKED) {
    if (isIgnored(path)) failures.push(`${path} is ignored — the documentation source would not be committed`);
}
for (const path of GENERATED) {
    if (!isIgnored(path)) failures.push(`${path} is not ignored — a build product would be committed`);
}

const { scripts = {} } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const cleanCommand = scripts["docs:clean"];
if (!cleanCommand) failures.push("package.json has no docs:clean script to check");
// Fingerprinted before anything runs: this checkout must come out of the check unchanged.
const checkoutBefore = inventory(root);
const fixture = cleanCommand ? mkdtempSync(join(tmpdir(), "maxrects-packer-docs-clean-")) : undefined;

if (fixture) {
    try {
        cpSync(join(root, "docs"), join(fixture, "docs"), {
            recursive: true,
            filter: (from) => !isGenerated(relative(root, from))
        });
        for (const path of SENTINELS) {
            const file = join(fixture, path);
            // Refused rather than overwritten: the check deletes what it writes, so a file already at
            // one of these paths would be lost while the run still reported success.
            if (existsSync(file)) {
                failures.push(`${path} already exists in the fixture — the check will not overwrite and delete it`);
                continue;
            }
            mkdirSync(dirname(file), { recursive: true });
            writeFileSync(file, "verify-docs\n");
        }
        // The fixture runs the repository's own command, with the repository's binaries reachable
        // through PATH, so what is exercised is the script a contributor would run.
        writeFileSync(
            join(fixture, "package.json"),
            JSON.stringify({
                name: "docs-clean-fixture",
                private: true,
                scripts: { "docs:clean": cleanCommand }
            })
        );
        const fixtureBefore = inventory(fixture);
        execFileSync("npm", ["run", "docs:clean"], {
            cwd: fixture,
            stdio: "pipe",
            env: {
                ...process.env,
                PATH: `${join(root, "node_modules/.bin")}${delimiter}${process.env.PATH}`
            }
        });
        compare(fixtureBefore, inventory(fixture), "docs:clean");
        for (const path of SENTINELS) {
            if (existsSync(join(fixture, path))) {
                failures.push(`docs:clean left ${path} behind — a stale build product survives`);
            }
        }
    } catch (error) {
        failures.push(`docs:clean could not be run in a disposable fixture: ${error.message.split("\n")[0]}`);
    } finally {
        rmSync(fixture, { recursive: true, force: true });
    }
}

// The point of the fixture: whatever the command under test did, this checkout is untouched. If a
// future edit runs the cleanup here instead, this comparison is what reports it.
compare(checkoutBefore, inventory(root), "the check itself");

if (failures.length > 0) {
    console.error("Documentation boundary check failed:");
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    console.error("Tracked source: docs/*.md, docs/.vitepress/, docs/spec/, docs/plans/.");
    console.error("Generated, and the only paths docs:clean may delete: docs/api/, docs/.vitepress/{cache,dist}/.");
    process.exit(1);
}
console.log(`  ✓ documentation source tracked, build products ignored (${TRACKED.length} + ${GENERATED.length} paths)`);
console.log("  ✓ docs:clean ran in a throwaway fixture and left every source file byte-identical");
console.log("Documentation boundary check passed");
