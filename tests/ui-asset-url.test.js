import test from 'node:test';
import assert from 'node:assert/strict';
import { assetUrl } from '../src/ui/assetUrl.js';

test('packaged UI image URLs resolve correctly even when consumed by a stylesheet in /assets', () => {
  const url = assetUrl('assets/ui/kit/panel-large.png', { base: './', documentBase: 'https://appassets.androidplatform.net/index.html?nativeRenderer=canvas' });
  assert.equal(new URL(url, 'https://appassets.androidplatform.net/assets/index.css').href,
    'https://appassets.androidplatform.net/assets/ui/kit/panel-large.png');
});
test('subdirectory web installs retain their base path for UI textures', () => {
  assert.equal(assetUrl('assets/ui/kit/loading-bar-frame.png', { base: './', documentBase: 'https://example.com/game/index.html' }),
    'https://example.com/game/assets/ui/kit/loading-bar-frame.png');
});
