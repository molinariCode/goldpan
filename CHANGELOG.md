# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] - unreleased

First public release.

- Every address sorted into valid, to check or rejected and shown on its own card, with one-click filters and a counter with correct plurals
- Paste parsing: separators (full-width ones too), Excel columns, `Name <address>`, `mailto:` links
- Typo check for about 100 popular providers with a one-click fix, tuned against false alarms on regional and company domains
- `maxEmails` with `onLimit: 'reject' | 'drop'`; the first address waiting moves in when a place frees up
- `duplicates: 'drop' | 'warn' | 'reject'` (a dropped copy highlights the original) and `existing: 'warn' | 'reject'`
- Exclusion list (`Goldpan.blockedDomains`: certain misspellings + throw-away services), extendable or replaceable, `*.domain` wildcards, custom `validate` hook
- Inline editing; keyboard, screen reader and input method support; high-contrast mode; colours that pass WCAG AA in light and dark
- `confirm()` for the button that uses the list, with `rejected: 'ask' | 'block' | 'skip'`: the first press shows the rejected addresses and the next one goes on without them (default), or it stops until they are fixed, or goes on at once; form submits work the same way. The `confirm` event carries the message and a label for your button (`inlineMessage: false` to show it there)
- Original input kept in sync, `required`, `disabled` and form reset support
- `setValue()`, events (`on()` and DOM `goldpan:*` events), `setOptions()`, `destroy()`
- Works in shadow DOM and iframes; safe to import during server-side rendering
- Built without `innerHTML`; long lists stay fast (rows out of view are not laid out)
- Languages: en, it, es, fr, de, pt, zh, ja
- ESM, CommonJS and `<script>` builds with TypeScript types
