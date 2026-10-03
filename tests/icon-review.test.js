import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

test('similarity audit detects the same RGB subject in three- and four-channel PNGs', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sangre-icon-review-'));
  const rgb = path.join(directory, 'rgb.png'), rgba = path.join(directory, 'rgba.png');
  const contact = path.join(directory, 'contact.png');
  try {
    const original = 'public/assets/pixel/skills/bloodlust.png';
    await sharp(original).removeAlpha().png().toFile(rgb);
    await sharp(original).removeAlpha().ensureAlpha().png().toFile(rgba);
    const result = spawnSync(process.execPath, ['scripts/check-icon-similarity.mjs', '--dir', directory,
      '--contact', contact, '--threshold', '0'], { encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 1, 'identical subjects must fail the uniqueness gate');
    assert.match(result.stderr, /SIMILAR \(0\/63\): rgb\.png <> rgba\.png/);
  } finally {
    // Only this test's three exact files, never a recursive delete.
    for (const file of [rgb, rgba, contact]) await fs.unlink(file).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await fs.rmdir(directory);
  }
});
