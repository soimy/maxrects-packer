---
layout: home

hero:
  name: maxrects-packer
  text: MaxRects 2D bin packing
  tagline: Pack rectangles into as few bins as possible, each staying inside maxWidth × maxHeight.
  actions:
    - theme: brand
      text: Get started
      link: /user/getting-started
    - theme: alt
      text: API reference
      link: /api/

features:
  - title: Few bins, not one huge image
    details: Instead of producing a single output image of minimum size, the packer opens as few bins as it can under a maximum size — which is what keeps sprite sheets browser-friendly and close to power-of-two.
  - title: Any object with a width and a height
    details: Your own classes stay your own classes. Placement is written onto the objects you pass in, and extra fields, tags and per-item data survive untouched.
  - title: Zero dependencies, ES5 bundle
    details: Geometry only — no DOM, no Node API, no runtime dependency — so the same bundle runs in the browser and in Node.
---

## Where to go next

- **[User guide](/user/)** — options, packing, rotation and tags, repacking, persistence, and the
  [troubleshooting](/user/troubleshooting) page with the sharp edges.
- **[API reference](/api/)** — every exported class, interface and enumeration, generated from the
  source and its JSDoc.
- **[Contributing](/contributor/)** — development setup, testing, architecture, behaviour contracts and
  compatibility.
- **[Releases](/releases/)** — the release history and how a release is cut.
