<!--
Thanks for contributing! Please read CONTRIBUTING.md first. This layout is a suggestion, not a form
to fill in — cut the sections that do not apply and add your own if they help. What matters:

  1. Everything here is written in English.
  2. The PR title is a valid conventional commit. The repo sets squash_merge_commit_title to
     PR_TITLE, so the PR title becomes the commit subject on master and generates CHANGELOG.md —
     retitling the PR is how you fix a wrong type.
  3. A bug fix comes with a test that fails before the change and passes after it.
-->

## Summary

<!-- What does this change, and why? -->

## Related issue

<!-- "Closes #54" to auto-close, or "Refs #51" for context. Remove if there is no issue. -->

## Type of change

- [ ] `feat` — new user-visible capability
- [ ] `fix` — bug fix
- [ ] `perf` — performance improvement only
- [ ] `refactor` / `chore` / `build` / `ci` — internal, no user-visible behavior change
- [ ] `docs` — documentation only
- [ ] **Breaking change** — marked with `!` in the title and/or a `BREAKING CHANGE:` footer, **in a
      commit message** (the squash commit body is built from commit messages, so a footer typed only
      into this description never reaches `master`)

## How it was verified

<!-- Paste the commands you ran and their results, not just "tests pass". -->

```text
npm run lint
npm run format:check
npm run typecheck
npm run cover
npm run verify:package   # same gates CI runs, in the same order
```

## Checklist

- [ ] Written in English
- [ ] PR title is a valid conventional commit (`type(scope): subject`)
- [ ] One logical change; no unrelated formatting churn mixed in
- [ ] Tests added or updated — a bug fix has a test that fails without the fix
- [ ] `npm test`, `npm run lint`, `npm run format:check` and `npm run typecheck` pass locally
- [ ] **No new runtime dependencies** (`dependencies` in `package.json` stays empty)
- [ ] Public API and packing behavior stay 2.x-compatible — or the change is opt-in, or it is marked
      as a breaking change above
- [ ] New or changed public API is documented with JSDoc
- [ ] `README.md` / `AGENTS.md` updated if behavior, commands or conventions changed
- [ ] `CHANGELOG.md` and the version in `package.json` left untouched
- [ ] No build output committed (`dist/`, `docs/`, `test/coverage/`)

## Notes for reviewers

<!-- Trade-offs, follow-up work, anything you are unsure about. Remove if empty. -->
