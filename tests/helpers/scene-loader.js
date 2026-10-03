export function resolveSync(specifier, context, nextResolve) {
  if (specifier === 'phaser') return { url: new URL('./phaser-shim.js', import.meta.url).href, shortCircuit: true };
  const result = nextResolve(specifier, context);
  if (result.url.endsWith('/src/art/TextureFactory.js')) return { url: new URL('./texture-shim.js', import.meta.url).href, shortCircuit: true };
  return result;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'phaser') return { url: new URL('./phaser-shim.js', import.meta.url).href, shortCircuit: true };
  const result = await nextResolve(specifier, context);
  if (result.url.endsWith('/src/art/TextureFactory.js')) return { url: new URL('./texture-shim.js', import.meta.url).href, shortCircuit: true };
  return result;
}
