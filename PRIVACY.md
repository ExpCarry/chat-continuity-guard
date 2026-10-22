# Privacy Policy — Chat Continuity Guard

Last updated: October 22, 2026.

**Summary:** Chat Continuity Guard processes currently rendered ChatGPT conversation text locally in your browser to show approximate size warnings. We do not operate a server for this extension and do not collect, sell, or transmit your chat contents.

## Data processed

- Message text and roles that are currently rendered within your open `chatgpt.com` conversation, for displaying the indicator and supporting user-triggered exports.
- Estimated message count and approximate token count, derived locally from that visible text.
- Two user-configurable warning thresholds, stored in `chrome.storage.local` on your device.

## Data shared

**None by the extension.** No analytics, advertisements, third-party SDKs, remote code, accounts, or backend services are included. The browser itself still communicates with ChatGPT as usual, which is outside this extension's control.

## Export & clipboard

Clicking **Download visible chat** creates a Markdown file in your browser using a local Blob URL. The file contains visible message text and the conversation URL. Clicking **Copy context handoff prompt** copies a generic prompt to your clipboard; it does not copy your conversation. Neither action runs automatically.

## Permissions

- `storage`: saves user preferences.
- `https://chatgpt.com/*`: allows the script to read visible conversation DOM and display the controls on that site.

## Retention

Conversation text is held only in extension script memory on the current page and is not saved by the extension unless the user deliberately downloads an export. Threshold settings remain on your device until removed or until you uninstall the extension and its stored data are cleared.

## Contact

Open a GitHub issue for general questions. Please **never post real chat content** or personal information to a public issue. See [SECURITY.md](SECURITY.md) for security reports.

## Independence

This is a community project by [ExpCarry](https://expcarry.com/). It is not affiliated with OpenAI.
