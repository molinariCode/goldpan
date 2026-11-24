# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [2.0.0] - 2026-11-24

A new look. Every feature works as before: statuses, messages, Fix, editing, removing, filters, limits, confirmation.

### Changed

- Redesigned widget: each address on a white card with a status icon (a tick, a triangle, a "no entry" sign), the address and, below it, its message in the colour of the status. The Fix, edit and remove buttons are where they were; Fix shows its word only
- The filters are one segmented bar that starts with "All" and appears with the first address; the counter sits after them
- The text box has rounded corners instead of a pill, the list has a thin scrollbar and scrolls past `--goldpan-list-max-height` as before
- New default colours, light and dark, still passing WCAG AA, and new icons
- Package description, keywords and README introduction lead with the main use: adding people to a list you already have

### Added

- Message `all`, the name of the "All" filter, in every bundled language. A messages object of your own typed as `GoldpanMessages` needs it (objects passed as `Partial` fall back to English)
- CSS variables `--goldpan-address-font`, `--goldpan-accent`, `--goldpan-accent-fg` and `--goldpan-accent-soft`

## [1.0.0] - 2026-10-25

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
