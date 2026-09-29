// Small UI symbols stay vector-native so they remain sharp at any UI scale.
const paths={
 pause:'<path d="M5 4h5v16H5zM14 4h5v16h-5z" fill="currentColor" stroke-width="1"/>',
 kills:'<path d="M5 4h14l3 4v7l-5 2v4H7v-4l-5-2V8Z"/><path d="M7 9v3h2V9zm8 0v3h2V9zM10 17v4m4-4v4"/>',
 cacao:'<path d="M5 18C0 8 9 1 19 4c5 10-3 18-14 14Z"/><path d="M5 18 19 4M7 13l4 4m0-9 5 4"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z"/>',
 settings:'<path d="m9 3-1 3-3 1-2 4 2 2v4l4 2 3-1 3 1 4-2v-4l2-2-2-4-3-1-1-3Z"/><circle cx="12" cy="11" r="3"/>',
 heart:'<path d="M12 21 3 12V6l3-3h4l2 3 2-3h4l3 3v6Z"/>',
 stamina:'<path d="M13 2 4 14h7l-1 8 10-13h-7Z"/>',
 magic:'<path d="m12 2 8 10-8 10-8-10Z"/><path d="M12 2v20M4 12h16"/>',
 xp:'<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z"/>',
};
export const interfaceIcon=(name)=>`<svg class="interface-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" aria-hidden="true">${paths[name]||paths.globe}</svg>`;
