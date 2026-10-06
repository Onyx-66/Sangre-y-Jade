import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const activity = readFileSync(new URL('../android/app/src/main/java/com/sangreyjade/game/MainActivity.java', import.meta.url), 'utf8');

// Source regression guard for the failure reproduced on a Galaxy A56 / API 36.
// The Android device smoke test remains the functional integration check.
test('fullscreen startup obtains the inset controller from an initialized decor view', () => {
  const immersive = activity.slice(activity.indexOf('private void applyImmersiveMode()'), activity.indexOf('private void publishSafeInsets()'));
  assert.doesNotMatch(immersive, /getWindow\(\)\.getInsetsController\(\)/,
    'Samsung PhoneWindow dereferences a null decor view before setContentView');
  const decor = immersive.indexOf('View decor=getWindow().getDecorView();');
  const controller = immersive.indexOf('decor.getWindowInsetsController()');
  assert.ok(decor >= 0 && controller > decor, 'Create the decor before requesting its controller');
  assert.match(immersive, /if\(controller!=null\)/, 'An unattached decor may not have a controller yet');
  assert.match(immersive, /decor\.setSystemUiVisibility\(/, 'Keep the legacy fullscreen path during attachment');
});
