import { defineConfig } from "vitepress";

// The site source is tracked under `docs/`; `docs/api/`, `docs/.vitepress/cache/` and
// `docs/.vitepress/dist/` are build products (see .gitignore). Guides and contributor pages arrive
// with the content migration, which is also where the navigation gets its entries.
export default defineConfig({
    title: "maxrects-packer",
    description: "MaxRects 2D bin packing for sprite sheets and texture atlases",
    base: "/maxrects-packer/",
    // Tracked designs and plans are repository records, not site pages.
    srcExclude: ["spec/**", "plans/**"],
    themeConfig: {
        search: { provider: "local" },
        nav: [
            { text: "API", link: "/api/" },
            { text: "GitHub", link: "https://github.com/soimy/maxrects-packer" }
        ],
        socialLinks: [{ icon: "github", link: "https://github.com/soimy/maxrects-packer" }]
    }
});
