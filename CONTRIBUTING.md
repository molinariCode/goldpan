# Contributing to Goldpan

Thank you for helping! Issues, ideas and pull requests are welcome.

## Setup

Node.js 22.18 or newer (the current LTS is recommended).

```bash
npm install
npm run dev    # opens the demo on http://localhost:5173 and reloads it on every change
npm test
```

`demo/index.html` is the template of the demo page: `npm run dev` builds it into `site/` together with the library.

## Pull requests

- Keep the library free of runtime dependencies.
- Add or update tests in `test/` for every change of behaviour.
- Run `npm run typecheck && npm test && npm run build && npm run lint:package` before pushing.
- Every text the user sees goes through the locale files, never hard-coded.
- Never put user data into `innerHTML`.

## Adding a language

1. Copy `src/locales/en.ts` to `src/locales/<code>.ts`, set `lang: '<code>'` and translate every message.
   Keep the `{placeholders}` exactly as they are (a test checks this). `counter` can have one text per plural
   category of your language (`zero`, `one`, `two`, `few`, `many`, `other`).
2. Add it to `src/locales/all.ts`.
3. Create `src/locales/<code>.global.ts` like the existing ones.
4. Add it to the language list of the playground in `demo/index.html`.

## Adding a provider to the typo check

Add its domain to `DEFAULT_KNOWN_DOMAINS` in `src/domains.ts`, with a test in `test/core.test.ts`: one misspelling
that must be caught, and if possible one real domain nearby that must be left alone.

## Releasing (maintainers)

1. In `CHANGELOG.md`, put the changes under the new version with today's date, and commit.
2. `npm version patch` (or `minor`, `major`): it updates `package.json` and `package-lock.json`, commits and tags `vX.Y.Z`.
3. `git push --follow-tags`, then on GitHub: Releases → Draft a new release → pick that tag → Publish.
   The `release.yml` workflow checks that the tag matches `package.json` and publishes the package to npm.
