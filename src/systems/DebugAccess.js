// Production diagnostics require an explicit opt-in; no always-on game handle.
export const debugEnabled = ({ dev = false, search = '' } = {}) =>
  dev || new URLSearchParams(search).get('fxdebug') === '1';
export const runtimeDebugEnabled = () => debugEnabled({
  dev: Boolean(import.meta.env?.DEV), search: globalThis.location?.search || '',
});
