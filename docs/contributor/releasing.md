# Releasing

Maintainers only. Releases are cut from `master` and the version number is never edited by hand.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
type(scope): subject

Optional body explaining why, wrapped at 100 characters.

Refs #54
```

- `type` is required and lower-case; `scope` is optional (`maxrects-bin`, `packer`, `build`, `deps`).
- The subject is imperative, lower-case and has no trailing period: `fix: keep padding when a bin
  grows`, not `Fixed padding bug.`
- One logical change per commit; no formatting churn mixed into a behavioural fix.

| Type | Use for | In `CHANGELOG.md` |
| --- | --- | --- |
| `feat` | A new user-visible capability | Features |
| `fix` | A user-visible bug fix | Bug Fixes |
| `perf` | Performance only | Performance Improvements |
| `revert` | Reverting a previous commit | Reverts |
| `refactor` | Internal restructuring, no behaviour change | hidden |
| `docs` | Documentation only | hidden |
| `test` | Tests only | hidden |
| `build` | Build system, bundler or dependencies | hidden |
| `ci` | CI configuration | hidden |
| `chore` | Everything else not user-visible | hidden |

**A breaking change must be marked** with `!` (`feat!:`) or a `BREAKING CHANGE:` footer.
`commit-and-tag-version` reads that marker to choose between major, minor and patch, so an unmarked
breaking change ships as a patch and breaks downstream users.

## Pull requests

- **The PR title must itself be a valid conventional commit.** The repository sets
  `squash_merge_commit_title: PR_TITLE`, so whatever the title is at merge time becomes the commit
  subject on `master` — and that is what `commit-and-tag-version` parses. Retitling is how you fix a
  wrong type; a user-visible fix that merges as `chore:` never reaches the changelog.
- **A breaking change must be marked in a commit message**, not only in the PR description: the squash
  body is built from the branch's commit messages (`squash_merge_commit_message: COMMIT_MESSAGES`), and
  notes typed only into the description never reach a commit.
- Rebase on the latest `master`, run the same gates CI runs, and say in the description what you
  verified and how. Expect questions about edge cases and about the
  [behaviour contracts](./behavior-contracts.md).

## Cutting a release

```bash
npm run prepare-release   # npm test, then commit-and-tag-version (bumps version + CHANGELOG)
git push --follow-tags
```

Pushing a `v*` tag starts two workflows from the same commit:

- `.github/workflows/release.yml` builds the bundles and creates the GitHub release with `dist/` attached.
- `.github/workflows/publish.yml` re-runs the gates and publishes the package to npm. Its deployment to
  the `npm-publish` environment waits for an approval from the repository owner, so the release is not
  finished until that approval is granted in the Actions run.

Contributors never need to touch versions, tags or `CHANGELOG.md`; both `CHANGELOG.md` and the version
in `package.json` belong to `commit-and-tag-version`.

Because the tag is what triggers the npm publish, release tags are protected too: the repository ruleset
*Protect release tags* restricts the creation, update and deletion of `refs/tags/v*` to the
repository-admin role, so a maintainer without that role needs an admin to cut the tag.

That ruleset guards the normal release path; it is not what authorizes publishing. The
trusted-publisher record is bound to the repository and the workflow file, so a branch run of
`publish.yml` reaches the same OIDC path — the tag ruleset alone would not keep a writer out. The
boundary is the `npm-publish` environment described below: the record names it, and it requires a
deployment approval, so a writer who alters or copies the workflow either loses the environment claim
and is refused by npm, or lands in a run that waits for an approver. Branch write access therefore does
not have to include the ability to publish, but it does put the holder inside the workflow that
publishing runs.

## Publishing to npm

Publishing uses [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers), so this repository
holds **no `NPM_TOKEN`**: GitHub Actions presents an OIDC token, npm exchanges it for a short-lived
credential, and the tarball is published with a provenance attestation. The workflow is
`.github/workflows/publish.yml`, and its publish step strips any token context before running so npm
cannot fall back to a legacy `NODE_AUTH_TOKEN` path.

The trusted publisher is configured **on npmjs.com**, under the package's *Settings → Trusted Publisher*:

| Field | Value |
| --- | --- |
| Publisher | GitHub Actions |
| Organization/user | `soimy` |
| Repository | `maxrects-packer` |
| Workflow filename | `publish.yml` |
| Environment | `npm-publish` — must match the job's `environment:` |
| Allowed actions | **Allow npm publish** must be enabled |

Three npm rules decide whether that record works, and none of them is visible from the GitHub side:

- **`npm stage publish` is always allowed; a direct `npm publish` is not.** A record created without
  *Allow npm publish* still completes the OIDC token exchange — so a probe or a dry run looks healthy —
  and then rejects the publish itself. This repository publishes directly, so that box has to be
  checked. *Allow dist-tag management* is independent and is not needed here.
- **A new record must complete its first real publish within 2 days, or it expires** and can no longer
  be used or edited. A successful token exchange does not count; only the first published tarball
  validates the record. Create the record immediately before the first prerelease and publish inside
  that window — if it expires, delete it, create a new one, and publish within 2 days of that.
- The provider and the required fields are fixed once a record exists; changing them means deleting and
  re-adding it. The record also names the workflow file, so renaming `publish.yml` breaks publishing
  until the record is updated with it.

The environment field is what turns all of this into a gate rather than a label. `.github/workflows/publish.yml`
runs its job in `npm-publish`, which requires a deployment approval from the repository owner
(`prevent_self_review` is off, so the owner can approve their own tag-triggered run); the record only
accepts a run whose OIDC token carries that environment. A run that leaves the environment out is
refused, and one that keeps it waits for the approver.

`publish.yml` checks the tag against the version in `package.json` before it publishes anything, and it
publishes a prerelease (`3.0.0-rc.1`) under the `next` dist-tag so it never becomes what a plain
`npm install` resolves to. `release.yml` keeps working on its own; npm is the second workflow's only job.