# Contributing

Thank you for helping make Chat Continuity Guard better.

## Pull requests

1. Fork and create a descriptive branch.
2. Keep changes small, dependency-light, and privacy-preserving.
3. Run `npm test` (requires Node.js 20+).
4. Where UI changes are involved, manually verify on a *non-private test conversation* in Chrome or Opera.
5. Explain what changed, what you tested, and what remains unverified.

## Design constraints

- Do not add any remote network tracking or third-party telemetry.
- Do not add broad host permissions or access to cookies without explicit discussion.
- Keep the warning truthful: visible-DOM estimates are not model token-budget measurements.
- Do not paste private chats into issues or PRs.

## Reporting bugs

Include browser version, extension version, expected behavior, observed behavior, and synthetic reproduction steps. Redact all chat content, IDs, and personal information.
