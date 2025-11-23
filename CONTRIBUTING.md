# Contributing to @cereon/recharts

Thanks for wanting to contribute! This document explains how to set up the project locally, run tests, follow the code style, and submit changes.

**TL;DR**
- Fork or branch from `main` (or `refactor/cards` if coordinating with an open branch)
- Open a small, focused PR with a clear description and tests/examples
- Use `pnpm` to install and run commands

## Getting started

Clone the repo and install dependencies (this package is usually developed inside the Cereon monorepo):

```bash
pnpm install
```

Run the build and tests locally:

```bash
pnpm build
pnpm test
```

If you're working within the monorepo, run `pnpm -w` commands from the repo root as needed.

## Code style

- Follow existing TypeScript/React coding patterns in `src/`.
- Use Prettier/ESLint rules configured in the repository. Run linting before committing:

```bash
pnpm lint
```

If you change formatting rules, include a rationale in the PR.

## Tests

Add unit tests for new features or bug fixes. Tests should be runnable via the package test command.

```bash
pnpm test
```

If adding visual components, prefer snapshot tests or small rendering tests for behavior.

## Development workflow

- Create a branch titled `feat/<short-desc>` or `fix/<short-desc>`.
- Keep commits focused and use conventional commit messages where possible.
- Open a PR against the `main` branch (or the target long-lived branch). Include a clear summary, motivation, and screenshots/examples for UI changes.

## Releasing

Publishing is done via the npm registry. Use `pnpm` to bump versions and publish from a CI or a maintainer machine.

Example:

```bash
pnpm version patch
pnpm publish --access public
```

Make sure to update `CHANGELOG.md` or release notes if your project uses them.

## Reporting issues

- Open issues in the repository with a minimal repro and expected behavior.
- For security issues, please contact maintainers directly rather than opening a public issue.

## Code of Conduct

Please follow the project's `CODE_OF_CONDUCT.md` (if present) and be respectful in comments, PRs and issues.

Thank you for improving @cereon/recharts!
