/**
 * leafletSetup.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single shared Leaflet initialization module.
 * Import this ONCE at module level — it's safe to import multiple times because
 * of the `initialized` guard flag, ensuring icons are only patched once.
 *
 * Fixes the Vite issue where multiple ESM imports of leaflet cause
 * `render2 is not a function` errors by centralizing all side-effectful setup.
 */

import L from "leaflet";

let initialized = false;

export function ensureLeafletIcons() {
    if (initialized) return;
    initialized = true;

    // Fix broken default icons when bundled with Vite/Webpack
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
}

// Run immediately on first import
ensureLeafletIcons();

const SHADOW = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";
const MARKER_BASE = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-";

export function makeIcon(color: string): L.Icon {
    return new L.Icon({
        iconUrl: `${MARKER_BASE}${color}.png`,
        shadowUrl: SHADOW,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });
}

// Pre-built icon instances (reuse across map components)
export const ICONS = {
    user: makeIcon("blue"),
    ai: makeIcon("red"),
    osm: makeIcon("green"),
    orange: makeIcon("orange"),
};
