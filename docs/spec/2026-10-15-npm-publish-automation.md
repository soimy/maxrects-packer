# Automated npm publishing

## Decision

Releases are published to the public npm registry by GitHub Actions from a `v*` tag, through
[npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC). No `NPM_TOKEN` secret is
stored: npm exchanges the workflow's OIDC token for a short-lived credential and attaches a provenance
attestation to the tarball. The package name stays `maxrects-packer`.

GitHub Packages' npm registry was rejected as the channel: it only accepts scoped names, so the package
would have to be renamed to `@soimy/maxrects-packer` — a breaking rename for every existing consumer and
for the package-name fixtures in `scripts/verify-package.mjs` — and it authenticates installs even for
public packages, which a public library cannot ask of its users.

`release.yml` keeps owning the GitHub release; the new `publish.yml` owns npm. The two run from the same
tag and neither depends on the other.

## Changes

- `.github/workflows/publish.yml` triggers on `v*` tags with `id-token: write` and `contents: read` as
  its only permissions. It upgrades npm to 11.5.1 or newer (trusted publishing's minimum, which the
  runner's bundled version is not pinned to), refuses a tag whose version disagrees with
  `package.json`, routes a prerelease to the `next` dist-tag, runs the CI gates (`lint`,
  `format:check`, `typecheck`, `cover`, `verify:package`), and publishes last with any token context
  stripped so npm cannot fall back to the legacy `NODE_AUTH_TOKEN` path.
- `package.json` gains a `publishConfig` that pins `registry.npmjs.org` (this machine has a mirror
  configured at the user level) and `access: public`. It is not part of the tarball's file list, so
  `PUBLISHED_FILES` in `scripts/verify-package.mjs` is unchanged.
- `docs/contributor/releasing.md` and `CONTRIBUTING.md` describe the automated flow and the one-time
  npmjs.com record it depends on: publisher GitHub Actions, user `soimy`, repository
  `maxrects-packer`, workflow filename `publish.yml`.

## Rejected alternatives

- **GitHub Packages npm registry** — scoped rename plus authenticated installs; the wrong channel for a
  public library.
- **A long-lived `NPM_TOKEN` secret** — OIDC replaces it, leaving nothing to rotate or leak.
- **Publishing from `release.yml`** — the trusted-publisher record names one workflow file, so keeping
  npm in a file with that single purpose is easier to audit than a shared release job.

## Verification

- `publish.yml` parses as YAML and its step list matches the design above.
- The tag/version guard was exercised locally: a matching tag passes with `latest`, a mismatched tag
  fails, and a prerelease version selects `next`.
- `npm ci --include=dev --dry-run` still reports the lockfile in sync after `publishConfig` was added.
- The npmjs.com record was probed live, before any release, from a throwaway branch whose workflow was
  named `publish.yml`: GitHub Actions exchanged an id_token (audience `npm:registry.npmjs.org`) for a
  registry token and npm answered **HTTP 201** with a token in the body. That is the same exchange
  `npm publish` performs, so the record matches this repository, this workflow filename and an empty
  environment; the branch was deleted afterwards and npm's dist-tags were unchanged (`latest` still
  `2.7.3`, no version beyond `2.7.4`). The exchange endpoint is npm's, not a documented public API, so
  the probe is evidence rather than a shipped gate.
- What the probe does not cover is the publish command itself — packing, the `--tag` mapping and the
  provenance attestation. That is what the first prerelease verifies, publishing under `next` so
  `latest` stays untouched until it has passed.
