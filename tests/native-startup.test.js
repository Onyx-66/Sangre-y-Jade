import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeStartupOptions } from '../src/systems/NativeStartup.js';

const native = { protocol: 'https:', hostname: 'appassets.androidplatform.net', search: '' };
test('ordinary Android launches keep accelerated rendering and the first-run intro', () => {
  assert.deepEqual(nativeStartupOptions(native), { canvas: false, recovering: false });
});
test('a native renderer failure selects canvas and returns to the menu without changing the save', () => {
  assert.deepEqual(nativeStartupOptions({ ...native, search: '?nativeRenderer=canvas&nativeRecovery=1' }), { canvas: true, recovering: true });
});
test('later safe-mode launches retain the normal intro policy', () => {
  assert.deepEqual(nativeStartupOptions({ ...native, search: '?nativeRenderer=canvas' }), { canvas: true, recovering: false });
  assert.deepEqual(nativeStartupOptions({ ...native, search: '?nativeRecovery=1' }), { canvas: false, recovering: false });
});
test('web query parameters cannot activate the Android crash recovery path', () => {
  for (const location of [
    { protocol: 'https:', hostname: 'example.com' },
    { protocol: 'http:', hostname: native.hostname },
  ]) assert.deepEqual(nativeStartupOptions({ ...location, search: '?nativeRenderer=canvas&nativeRecovery=1' }), { canvas: false, recovering: false });
});
