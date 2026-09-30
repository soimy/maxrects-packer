// Post-build gate: what the site publishes is exactly what it is meant to publish.
//
// `srcExclude` in the VitePress config keeps `docs/spec/` and `docs/plans/` out of the page tree, and
// the config comment says so — but a comment is not a check. Both directions of the mistake are quiet:
// drop the option and the repository's design records and deferred-work ledger are published and
// indexed like any other page; widen it and a guide page silently stops being built.
//
// The first version of this check scanned every built page for the records' file names and failed on
// `docs/contributor/documentation.html`, which legitimately links to them. Names are not the signal —
// the built page tree is, in both directions.
// oxlint-disable no-console -- this file is a build step; its output is the result
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "docs/.vitepress/dist");
const INTERNAL = ["docs/spec", "docs/plans"];
const PUBLISHED = ["docs/user", "docs/contributor", "docs/releases"];
const failures = [];

if (!existsSync(dist)) {
    console.error("The documentation output check needs a built site — run `npm run docs:build`.");
    process.exit(1);
}

// 1) Internal records are tracked, never published: a built `dist/spec/…` is the direct symptom, and
// VitePress only indexes pages it built, so this is also what keeps them out of the search index.
for (const dir of INTERNAL) {
    const built = join(dist, relative("docs", dir));
    if (existsSync(built)) failures.push(`${relative(root, built)} exists — the built site publishes ${dir}/`);
}

// 2) Every page that should be published has a page: the same option that keeps the records out must
// not swallow a guide.
const markdownPages = (dir) => {
    const found = [];
    const walk = (current) => {
        for (const entry of readdirSync(current, { withFileTypes: true })) {
            const full = join(current, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith(".md")) found.push(full);
        }
    };
    walk(join(root, dir));
    return found;
};
const expected = [join(root, "docs/index.md"), ...PUBLISHED.flatMap(markdownPages)];
if (expected.length < 10) failures.push(`only ${expected.length} pages are expected — the page list looks wrong`);
const routeOfPage = (page) => relative(join(root, "docs"), page).replace(/\.md$/, ".html");
for (const page of expected) {
    const route = routeOfPage(page);
    if (!existsSync(join(dist, route))) {
        failures.push(`${route} was not built — a page that should be published is missing`);
    }
}

// 2b) …and it is reachable. VitePress fails on a link that points nowhere, not on a page nothing links
// to, so a new page can be built and still be invisible outside search.
const navLinks = [
    ...readFileSync(join(root, "docs/.vitepress/config.mts"), "utf8").matchAll(/link:\s*"(\/[^"]*)"/g)
].map((match) => match[1]);
if (navLinks.length < 10) failures.push(`the site config lists only ${navLinks.length} links — the nav looks empty`);
const routeOfLink = (link) =>
    (link.endsWith("/") ? `${link}index.html` : link.endsWith(".html") ? link : `${link}.html`).slice(1);
const reachable = new Set(navLinks.map(routeOfLink));
for (const link of navLinks) {
    const route = routeOfLink(link);
    if (!existsSync(join(dist, route))) failures.push(`the config links to ${link} but ${route} was not built`);
}
for (const page of expected) {
    const route = routeOfPage(page);
    if (page !== join(root, "docs/index.md") && !reachable.has(route)) {
        failures.push(`${route} is built but no nav or sidebar entry reaches it`);
    }
}

// 3) Search has to exist, and to have indexed site content rather than nothing.
const chunks = readdirSync(join(dist, "assets/chunks")).filter((name) => name.startsWith("@localSearchIndex"));
if (chunks.length === 0) {
    failures.push("no local search index was built — the site would ship without search");
} else {
    const index = chunks.map((name) => readFileSync(join(dist, "assets/chunks", name), "utf8")).join("");
    for (const term of ["oversized", "exclusiveTag", "vitest"]) {
        if (!index.includes(term))
            failures.push(`the search index does not contain "${term}" — search indexed no site text`);
    }
}

// 4) Every internal link resolves, and every anchor with it. VitePress fails the build on a dead page
// link but says nothing about a missing anchor, so a `#section` that was renamed rots unnoticed —
// including the anchors TypeDoc writes into its own cross-references, which are the bulk of them.
const pageHtml = new Map();
const collectHtml = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
        const full = join(current, entry.name);
        if (entry.isDirectory()) collectHtml(full);
        else if (entry.name.endsWith(".html"))
            pageHtml.set(relative(dist, full).replaceAll("\\", "/"), readFileSync(full, "utf8"));
    }
};
collectHtml(dist);

const linkSources = [...PUBLISHED.flatMap(markdownPages), join(root, "docs/index.md"), ...markdownPages("docs/api")];
let checkedLinks = 0;
for (const file of linkSources) {
    const from = relative(root, file).replaceAll("\\", "/");
    // Fenced blocks carry example markup, not links.
    const text = readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, "");
    for (const [, link] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
        if (/^(https?:|mailto:|#!)/.test(link)) continue;
        const [path, anchor] = link.split("#");
        // Only pages are resolved: an image or another asset next to a page is not a route.
        if (path && !path.endsWith(".md") && !path.endsWith(".html") && !path.endsWith("/")) continue;
        let route;
        if (!path) route = from.replace(/^docs\//, "").replace(/\.md$/, ".html");
        else if (path.startsWith("/")) route = path.slice(1);
        else route = posix.normalize(posix.join(posix.dirname(from), path)).replace(/\.md$/, ".html");
        route = route.replace(/^docs\//, "");
        if (route.endsWith("/")) route += "index.html";
        if (!route.endsWith(".html")) route += ".html";
        checkedLinks += 1;
        if (!pageHtml.has(route)) {
            failures.push(`${from} links to ${link} but ${route} was not built`);
        } else if (anchor && !pageHtml.get(route).includes(`id="${anchor}"`)) {
            failures.push(`${from} links to ${link} but ${route} has no anchor #${anchor}`);
        }
    }
}

if (failures.length > 0) {
    console.error("Documentation output check failed:");
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    console.error("Tracked and published: docs/*.md, docs/user/, docs/contributor/, docs/releases/.");
    console.error("Tracked and never published: docs/spec/, docs/plans/.");
    process.exit(1);
}
console.log(
    `  ✓ ${expected.length} pages built, no page tree for ${INTERNAL.join(" or ")}, search index carries site text`
);
console.log(`  ✓ ${checkedLinks} internal links resolve, anchors included`);
console.log("Documentation output check passed");
