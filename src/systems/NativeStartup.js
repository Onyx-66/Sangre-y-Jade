// The native host enables this only after its WebView renderer has failed.
export function nativeStartupOptions(location) {
  const native = location.protocol === 'https:' && location.hostname === 'appassets.androidplatform.net';
  const query = new URLSearchParams(location.search);
  const canvas = native && query.get('nativeRenderer') === 'canvas';
  return { canvas, recovering: canvas && query.get('nativeRecovery') === '1' };
}
