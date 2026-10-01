// Post-build step: write the legacy-URL redirects into the built site.
//
// The old documentation site was TypeDoc's HTML output, published at the repository root of the Pages
// site (`classes/MaxRectsPacker.html`, `interfaces/IOption.html`, `enums/PACKING_LOGIC.html`,
// `modules.html`, `hierarchy.html`). The VitePress site serves the generated API under `api/`, so every
// one of those URLs is dead without a redirect — and the inventory in
// `docs/spec/2026-09-30-docs-migration-spike.md` is what the table below encodes.
//
// Two things are checked rather than assumed: the redirect target has to exist in the build (a page
// that was renamed or dropped fails the build instead of shipping a redirect into a 404), and the base
// path comes from `docs/site.json`, the same file the VitePress config reads.
// oxlint-disable no-console -- this file is a build step; its output is the result
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "docs/.vitepress/dist");
const { base } = JSON.parse(readFileSync(join(root, "docs/site.json"), "utf8"));

// Legacy path -> page that replaced it, relative to the site root (no base, no leading slash).
const REDIRECTS = {
    "classes/Bin.html": "api/classes/Bin.html",
    "classes/MaxRectsBin.html": "api/classes/MaxRectsBin.html",
    "classes/MaxRectsPacker.html": "api/classes/MaxRectsPacker.html",
    "classes/OversizedElementBin.html": "api/classes/OversizedElementBin.html",
    "classes/Rectangle.html": "api/classes/Rectangle.html",
    "interfaces/IBin.html": "api/interfaces/IBin.html",
    "interfaces/IOption.html": "api/interfaces/IOption.html",
    "interfaces/IRectangle.html": "api/interfaces/IRectangle.html",
    "enums/PACKING_LOGIC.html": "api/enumerations/PACKING_LOGIC.html",
    "modules.html": "api/index.html",
    "hierarchy.html": "api/index.html"
};

if (!existsSync(dist)) {
    console.error("Legacy redirects need a built site — run `npm run docs:build`.");
    process.exit(1);
}

const page = (target) => `<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <title>Moved to ${base}${target}</title>
        <link rel="canonical" href="${base}${target}" />
        <meta http-equiv="refresh" content="0; url=${base}${target}" />
        <meta name="robots" content="noindex" />
    </head>
    <body>
        <p>
            This page moved to <a href="${base}${target}">${base}${target}</a>.
        </p>
        <script>
            // Legacy TypeDoc anchors separated words with underscores where the new site uses hyphens
            // (#max_area -> #max-area), so the fragment is rewritten before navigating. Anchors that
            // belonged to private members no longer exist and land on the page itself.
            const target = ${JSON.stringify(base + target)};
            location.replace(target + location.hash.replace(/_/g, "-"));
        </script>
    </body>
</html>
`;

const missing = Object.values(REDIRECTS).filter((target) => !existsSync(join(dist, target)));
if (missing.length > 0) {
    console.error("Legacy redirect targets are missing from the build:");
    for (const target of missing) console.error(`  ✗ ${target}`);
    process.exit(1);
}

for (const [legacy, target] of Object.entries(REDIRECTS)) {
    const file = join(dist, legacy);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, page(target));
}

console.log(`  ✓ wrote ${Object.keys(REDIRECTS).length} legacy redirects (base ${base})`);
console.log("Legacy redirects written");
