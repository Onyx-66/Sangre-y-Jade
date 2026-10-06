// CSS custom-property URLs can resolve relative to the consuming stylesheet.
// Resolve against the document first so packaged /assets/*.css cannot turn
// ./assets/ui/... into the nonexistent /assets/assets/ui/....
export function assetUrl(path, { base = import.meta.env?.BASE_URL || '/', documentBase = globalThis.document?.baseURI } = {}) {
  const relative = `${base}${path}`;
  return documentBase ? new URL(relative, documentBase).href : relative;
}
