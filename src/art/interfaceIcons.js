// Small UI symbols stay vector-native so they remain sharp at any UI scale.
const paths={
 pause:'<path d="M5 4h5v16H5zM14 4h5v16h-5z" fill="currentColor" stroke-width="1"/>',
 kills:'<path d="M8 3h8l4 4v7l-4 3v4H8v-4l-4-3V7Z" fill="#eadbb9"/><path d="M7 8h4v4H7zm6 0h4v4h-4zM10 15l2-2 2 2Z" fill="#211823" stroke="none"/><path d="M10 17v4m4-4v4" stroke="#725947"/>',
 cacao:'<path d="M7 3h10l-2 4 4 4 2 6-3 4H6l-3-4 2-6 4-4Z" fill="#a7703f"/><path d="M8 7h8m-8 2h8"/><path d="M9 12c-3 1-3 5 0 6 3-1 3-5 0-6Zm6 0c-3 1-3 5 0 6 3-1 3-5 0-6Z" fill="#4b291f" stroke-width="1"/>',
 lock:'<path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5Z"/><path d="M12 14v3" stroke-width="3"/>',
 auto:'<path d="M5 7a8 8 0 0 1 13-1m1 11a8 8 0 0 1-13 1M18 2v5h-5M6 22v-5h5"/><path d="m13 8-5 5h4l-1 4 5-6h-4Z" fill="currentColor" stroke-width="1"/>',
 manual:'<path d="m9 3 10 10-5 1-2 6Z" fill="currentColor"/><path d="M4 4 2 2m3 7H1m8-5V1"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z"/>',
 settings:'<path d="m9 3-1 3-3 1-2 4 2 2v4l4 2 3-1 3 1 4-2v-4l2-2-2-4-3-1-1-3Z"/><circle cx="12" cy="11" r="3"/>',
 heart:'<path d="M12 21 3 12V6l3-3h4l2 3 2-3h4l3 3v6Z"/>',
 stamina:'<path d="M13 2 4 14h7l-1 8 10-13h-7Z"/>',
 magic:'<path d="m12 2 8 10-8 10-8-10Z"/><path d="M12 2v20M4 12h16"/>',
 xp:'<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z"/>',
};
export const interfaceIcon=(name)=>`<svg class="interface-icon" data-icon="${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" aria-hidden="true">${paths[name]||paths.globe}</svg>`;
