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

Pushing a `v*` tag triggers `.github/workflows/release.yml`, which builds the bundles and creates a
GitHub release with `dist/` attached. **`release.yml` does not publish to npm** — there is no
`npm publish` step and no `NPM_TOKEN` in the repository, so publishing is a separate manual
`npm publish` from the tagged commit.

Contributors never need to touch versions, tags or `CHANGELOG.md`; both `CHANGELOG.md` and the version
in `package.json` belong to `commit-and-tag-version`.