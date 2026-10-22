# Security policy

This is an early-stage, locally running browser extension.

Please do not include personal conversations, authentication cookies, API keys, access tokens, or private URLs in public issues or screenshots.

For a potentially sensitive vulnerability, do not disclose exploitation details publicly. Contact the repository maintainer through a private channel or use GitHub's **Report a vulnerability** feature if it is enabled for this repository.

## Security properties

- No external services, network fetches, or analytics in the extension.
- Only `storage` extension permission.
- Content script is restricted to `https://chatgpt.com/*`.
- The tool does **not** bypass, reveal, or change any ChatGPT server limits.

If in doubt, audit `manifest.json` and `content.js` yourself before installing.
