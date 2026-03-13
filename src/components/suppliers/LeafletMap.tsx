/**
 * LeafletMap.tsx — Imperative Leaflet wrapper (NO react-leaflet)
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses plain Leaflet.js via useRef + useEffect to bypass the react-leaflet v5
 * context API crash (render2 is not a function) on React 18.3+.
 *
 * API:
 *  <LeafletMap center={[lat, lng]} zoom={12} style={{ height: 320 }}>
 *    {(map) => { map.addLayer(...); }}   ← render prop, called with the L.Map
 *  </LeafletMap>
 */

import { useEffect, useRef, CSSProperties } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ensureLeafletIcons } from "@/components/suppliers/leafletSetup";

ensureLeafletIcons();

interface LeafletMapProps {
    center: [number, number];
    zoom?: number;
    style?: CSSProperties;
    /** Called once when the map is ready, and again whenever center/zoom changes */
    onMapReady?: (map: L.Map) => void;
    className?: string;
}

export function LeafletMap({ center, zoom = 12, style, onMapReady, className }: LeafletMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);

    // Create map once
    useEffect(() => {
        if (!containerRef.current) return;
        if (mapRef.current) return; // already initialised

        const map = L.map(containerRef.current, {
            center,
            zoom,
            scrollWheelZoom: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        mapRef.current = map;
        onMapReady?.(map);

        return () => {
            map.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update center/zoom when they change
    useEffect(() => {
        if (!mapRef.current) return;
        mapRef.current.setView(center, zoom);
    }, [center, zoom]);

    // Re-call onMapReady when callback changes (for adding new markers)
    useEffect(() => {
        if (!mapRef.current || !onMapReady) return;
        onMapReady(mapRef.current);
    }, [onMapReady]);

    return (
        <div ref={containerRef} style={{ width: "100%", height: 320, ...style }} className={className} />
    );
}
