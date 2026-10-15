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

The npmjs.com record is part of the design, not just setup. It must have **Allow npm publish** enabled:
`npm stage publish` is allowed by default but a direct `npm publish` is not, so a record created without
that box completes the OIDC exchange and then rejects the publish itself. And a newly created record must
complete its first real publish within 2 days, after which it expires and can no longer be used or edited
— a successful token exchange does not validate it. Both rules are npm's, so the safe sequence is to
create the record immediately before the first prerelease and publish within that window.

*Who* may publish is a separate question from *how*. OIDC binds the credential to the repository, the
workflow file and — when the record names one — a GitHub Environment, so the design answers it with a
protected environment rather than with a tag ruleset: the job runs in `npm-publish`, which requires a
deployment approval, and the record names that environment. A run that omits it is refused; one that
keeps it waits for an approver. The tag ruleset described below stays, as protection for the normal
release path rather than as the boundary.

`release.yml` keeps owning the GitHub release; the new `publish.yml` owns npm. The two run from the same
tag and neither depends on the other.

## Changes

- `.github/workflows/publish.yml` triggers on `v*` tags with `id-token: write` and `contents: read` as
  its only permissions. It upgrades npm to 11.5.1 or newer (trusted publishing's minimum, which the
  runner's bundled version is not pinned to), refuses a tag whose version disagrees with
  `package.json`, routes a prerelease to the `next` dist-tag, runs the CI gates (`lint`,
  `format:check`, `typecheck`, `cover`, `verify:package`), and publishes last with any token context
  stripped so npm cannot fall back to the legacy `NODE_AUTH_TOKEN` path. The job declares
  `environment: npm-publish`, the approval gate the trusted-publisher record matches on.
- `package.json` gains a `publishConfig` that pins `registry.npmjs.org` (this machine has a mirror
  configured at the user level) and `access: public`. It is not part of the tarball's file list, so
  `PUBLISHED_FILES` in `scripts/verify-package.mjs` is unchanged. Its `repository.url` also drops the
  embedded `soimy@` user, leaving `git+https://github.com/soimy/maxrects-packer.git` as the one form
  provenance's repository-identity check has to normalize.
- `docs/contributor/releasing.md` and `CONTRIBUTING.md` describe the automated flow and the npmjs.com
  record it depends on: publisher GitHub Actions, user `soimy`, repository `maxrects-packer`, workflow
  filename `publish.yml`, environment `npm-publish`, and **Allow npm publish** enabled. The guide also
  records the 2-day validation window, which no local check can observe.
- Two layers answer who may publish, and the guide names which one is the boundary. The repository
  ruleset *Protect release tags* (id 25144033) restricts creation, update and deletion of
  `refs/tags/v*` to the repository-admin role, which keeps the bypass the owner needs to cut a release.
  It guards the normal release path but does not by itself keep a branch writer out, because the record
  is bound to the repository and workflow file and a branch run of `publish.yml` reaches the same OIDC
  path — the probe below demonstrated exactly that. The boundary is the `npm-publish` GitHub
  Environment (id 24364389647): it requires a deployment approval from the owner, and the record names
  it, so a run without the environment claim is refused and a run with it waits for the approver.

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
  `npm publish` performs, so the record matches this repository and this workflow filename; the branch
  was deleted afterwards and npm's dist-tags were unchanged (`latest` still `2.7.3`, no version beyond
  `2.7.4`). The exchange endpoint is npm's, not a documented public API, so the probe is evidence rather
  than a shipped gate.
- The probe is also what exposed the boundary problem: it obtained a credential from a branch run with
  no tag and **no environment**, because the record did not name one. That is why the job now declares
  `environment: npm-publish` and the record is required to name it.
- The environment was created through the API and read back: `npm-publish` (id 24364389647) carries a
  `required_reviewers` rule for user `soimy` with `prevent_self_review: false` and no branch or tag
  deployment policy, so a tag-triggered run waits for the owner's approval — which the owner can give on
  their own run — while a run that drops the environment no longer satisfies the record.
- What the probe deliberately does not prove: the exchange is allowed whether or not *Allow npm publish*
  is set, and it does not count as the record's validating publish, so it says nothing about the 2-day
  window. Those two are confirmed by the maintainer on npmjs.com and then by the first real publish.
- What the first prerelease verifies is everything downstream of the token: the publish command itself
  (packing, the `--tag` mapping, the provenance attestation), the record's Allowed actions and the
  environment gate. It publishes under `next`, so `latest` stays untouched until it has passed.
