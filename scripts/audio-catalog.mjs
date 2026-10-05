import fs from 'node:fs';
import path from 'node:path';

export const manifestPath = 'docs/v0.6/audio/audio_manifest.json';
export function compileAudio(root = process.cwd()) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestPath), 'utf8'));
  const catalog = {};
  for (const item of manifest.items) {
    const id = item.file.replace(/\.mp3$/, '');
    if (catalog[id] || !/^(sfx|music|voice)\/[\w/-]+\.mp3$/.test(item.file)) throw Error(`Invalid or duplicate audio: ${item.file}`);
    catalog[id] = { file: item.file, category: item.type === 'voice' ? 'voice' : item.group === 'music' ? 'music' : item.group === 'ui' ? 'ui' : item.group === 'ambience' ? 'ambience' : 'sfx', group: item.group, priority: item.priority, loop: Boolean(item.loop || (item.group === 'music' && !['music/victory', 'music/defeat'].includes(id))), seconds: item.duration || item.length_ms / 1000 || 0 };
  }
  return { catalog, available: Object.values(catalog).filter(item => fs.existsSync(path.join(root, 'public/assets/audio-v06', item.file))).map(item => item.file) };
}

// Vite strips generation prompts and injects only the compact runtime lookup.
export function audioCatalogPlugin() {
  return { name: 'v06-audio-catalog', transform(source, id) {
    if (!id.replaceAll('\\', '/').endsWith('/src/audio/catalog.js')) return;
    const data = compileAudio();
    return `export const AUDIO_CATALOG=${JSON.stringify(data.catalog)};export const AUDIO_AVAILABLE=${JSON.stringify(data.available)};`;
  } };
}
