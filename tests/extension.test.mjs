import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const project = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(readFileSync(join(project, 'manifest.json'), 'utf8'));
const source = readFileSync(join(project, 'content.js'), 'utf8');

test('valid Manifest V3 for chatgpt.com only', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.deepEqual(manifest.host_permissions, ['https://chatgpt.com/*']);
  assert.deepEqual(manifest.content_scripts[0].matches, ['https://chatgpt.com/*']);
  assert.equal(manifest.version, '0.2.0');
});
test('no network APIs or remote runtime scripts in extension source', () => {
  for (const pattern of [/\bfetch\s*\(/, /XMLHttpRequest/, /sendBeacon\s*\(/, /WebSocket\s*\(/, /chrome\.webRequest/, /document\.cookie/, /chrome\.cookies/]) {
    assert.doesNotMatch(source, pattern);
  }
  assert.ok(!manifest.background);
  assert.ok(!manifest.externally_connectable);
});
test('manual exports, visible-text based estimates, English interface', () => {
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /new Blob\(/);
  assert.match(source, /MutationObserver/);
  assert.match(source, /estimateTokens/);
  assert.match(source, /const strings = \{/);
  assert.match(source, /en: \{/);
  assert.match(source, /handoffPrompt/);
  assert.doesNotMatch(source, /[А-Яа-яЁё]/);
  assert.match(source, /const storageKey = ['\"]ccgSettings['\"]/);
});
test('referenced icons exist', () => {
  for (const size of [16, 48, 128]) {
    assert.ok(readdirSync(join(project, 'icons')).includes(`${size}.png`));
  }
});
