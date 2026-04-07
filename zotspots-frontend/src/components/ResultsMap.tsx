import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface PlayerResult {
  guess: { lat: number; lng: number } | null;
  distance: number | null;
  score: number;
  is_perfect?: boolean;
}

interface PlayerInfo {
  id: string;
  name: string;
  score: number;
}

interface ResultsMapProps {
  actualLocation: { lat: number; lng: number };
  results: Record<string, PlayerResult>;
  left: PlayerInfo;
  right: PlayerInfo;
  singleplayer: boolean;
}

function guessIcon(color: string, textColor: string, initial: string, greyscale: boolean) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 32px;
      height: 32px;
      background: ${greyscale ? "#9ca3af" : color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: monospace;
      font-weight: bold;
      font-size: 14px;
      color: ${greyscale ? "white" : textColor};
    ">${initial}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export default function ResultsMap({
  actualLocation,
  results,
  left,
  right,
  singleplayer,
}: ResultsMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const leftResult = results[left.id];
    const rightResult = singleplayer ? null : results[right.id];

    const leftDist = leftResult?.distance ?? Infinity;
    const rightDist = rightResult?.distance ?? Infinity;
    const leftGreyscale = leftDist > rightDist;
    const rightGreyscale = rightDist > leftDist;

    const actual = L.latLng(actualLocation.lat, actualLocation.lng);

    const points: L.LatLngExpression[] = [[actualLocation.lat, actualLocation.lng]];
    if (leftResult?.guess) points.push([leftResult.guess.lat, leftResult.guess.lng]);
    if (!singleplayer && rightResult?.guess) points.push([rightResult.guess.lat, rightResult.guess.lng]);

    setTimeout(() => {
        if (points.length > 1) {
            map.fitBounds(L.latLngBounds(points), { padding: [80, 80] });
        } else {
            map.setView([actualLocation.lat, actualLocation.lng], 16);
        }
    }, 100);

    map.once("moveend", () => {
      // Force Leaflet to recalculate its size in case the container wasn't fully laid out
      map.invalidateSize();

      // Actual location marker — pops in via a wrapper div with CSS transition
      const actualDivIcon = L.divIcon({
        className: "",
        html: `
            <style>
                @keyframes actualGlow {
                    0%   { filter: drop-shadow(0 0 6px rgba(99,179,237,0.8)); }
                    50%  { filter: drop-shadow(0 0 20px rgba(99,179,237,1)) drop-shadow(0 0 40px rgba(99,179,237,0.9)) drop-shadow(0 0 60px rgba(255,255,255,0.6)); }
                    100% { filter: drop-shadow(0 0 6px rgba(99,179,237,0.8)); }
                }
            </style>
            <div id="actual-marker-inner" style="
                width: 56px;
                height: 56px;
                transform: scale(0);
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                animation: actualGlow 2s ease-in-out infinite;
            ">
                <img src="/PetrGuessr Logo.png" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>`,
        iconSize: [56, 56],
        iconAnchor: [28, 56],
      });

      L.marker(actual, { icon: actualDivIcon })
        .addTo(map)
        .bindTooltip("Actual location", { permanent: false });

      // Trigger the pop after a frame so the element is in the DOM
      requestAnimationFrame(() => {
        const el = document.getElementById("actual-marker-inner");
        if (el) el.style.transform = "scale(1)";
      });

      // Use rAF to ensure markers are in the DOM before animating
      requestAnimationFrame(() => {
        // Left player marker
        if (leftResult?.guess) {
          const from = L.latLng(leftResult.guess.lat, leftResult.guess.lng);

          const markerEl = document.createElement("div");
          markerEl.style.cssText = `
            width: 32px;
            height: 32px;
            background: ${leftGreyscale ? "#9ca3af" : "#3b82f6"};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: monospace;
            font-weight: bold;
            font-size: 14px;
            color: ${leftGreyscale ? "white" : "white"};
            transform: scale(0);
            transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          `;
          markerEl.textContent = left.name.charAt(0).toUpperCase();

          const isPerf = leftResult.is_perfect;

          if (isPerf) {
             L.marker(from, {
              icon: L.divIcon({
                className: "",
                html: `<div class="perfect-ripple-ring" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-family: monospace; font-weight: bold; font-size: 14px; background: #FFD200; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px rgba(255,210,0,0.8); color: black;">${left.name.charAt(0).toUpperCase()}</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
              })
             }).addTo(map).bindTooltip(left.name + " (Perfect!)", { permanent: false });
          } else {
             L.marker(from, {
              icon: guessIcon("#3b82f6", "white", left.name.charAt(0).toUpperCase(), leftGreyscale),
             }).addTo(map).bindTooltip(left.name, { permanent: false });
          }

          // Line appears after markers
          setTimeout(() => {
            L.polyline(
              [[from.lat, from.lng], [actual.lat, actual.lng]],
              { color: isPerf ? "#FFD200" : (leftGreyscale ? "#9ca3af" : "#3b82f6"), weight: 2, dashArray: "6 6" }
            ).addTo(map);
          }, 400);
        }

        // Right player marker
        if (!singleplayer && rightResult?.guess) {
          const from = L.latLng(rightResult.guess.lat, rightResult.guess.lng);

          const rightIsPerf = rightResult.is_perfect;

          if (rightIsPerf) {
             L.marker(from, {
              icon: L.divIcon({
                className: "",
                html: `<div class="perfect-ripple-ring" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-family: monospace; font-weight: bold; font-size: 14px; background: #FFD200; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px rgba(255,210,0,0.8); color: black;">${right.name.charAt(0).toUpperCase()}</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
              })
             }).addTo(map).bindTooltip(right.name + " (Perfect!)", { permanent: false });
          } else {
             L.marker(from, {
              icon: guessIcon("#facc15", "black", right.name.charAt(0).toUpperCase(), rightGreyscale),
             }).addTo(map).bindTooltip(right.name, { permanent: false });
          }

          setTimeout(() => {
            L.polyline(
              [[from.lat, from.lng], [actual.lat, actual.lng]],
              { color: rightIsPerf ? "#FFD200" : (rightGreyscale ? "#9ca3af" : "#facc15"), weight: 2, dashArray: "6 6" }
            ).addTo(map);
          }, 500);
        }
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0" />
  );
}