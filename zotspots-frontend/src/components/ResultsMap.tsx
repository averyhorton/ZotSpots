import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface PlayerResult {
  guess: { lat: number; lng: number } | null;
  distance: number | null;
  score: number;
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

const actualIcon = L.icon({
  iconUrl: "/PetrGuessr Logo.png",
  iconSize: [56, 56],
  iconAnchor: [28, 56],
});

function guessIcon(color: string, textColor: string, initial: string, greyscale: boolean, delayMs: number = 0) {
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
      opacity: 0;
      animation: markerPop 0.2s ease-out ${delayMs}ms forwards;
    ">${initial}</div>
    <style>
      @keyframes markerPop {
        0%   { opacity: 0; transform: scale(0.3); }
        70%  { opacity: 1; transform: scale(1.2); }
        100% { opacity: 1; transform: scale(1); }
      }
    </style>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function addAnimatedLine(
  map: L.Map,
  from: L.LatLng,
  to: L.LatLng,
  color: string,
  delayMs: number
): () => void {
  function toPoint(latlng: L.LatLng) {
    return map.latLngToLayerPoint(latlng);
  }

  const svgOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgOverlay.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    z-index: 400;
  `;

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", "2");
  path.setAttribute("fill", "none");

  svgOverlay.appendChild(path);

  const pane = map.getPane("overlayPane")!;
  pane.appendChild(svgOverlay);

  function getLength() {
    const p1 = toPoint(from);
    const p2 = toPoint(to);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function updatePath() {
    const p1 = toPoint(from);
    const p2 = toPoint(to);
    path.setAttribute("d", `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`);
  }

  // Set initial path position
  updatePath();

  // Set up dashes — hidden initially via dashoffset
  const length = getLength();
  path.setAttribute("stroke-dasharray", "6 6");
  path.setAttribute("stroke-dashoffset", `${length}`);

  // Force reflow so the browser registers the initial dashoffset before animating
  void path.getBoundingClientRect();

  setTimeout(() => {
    updatePath();
    const currentLength = getLength();
    path.setAttribute("stroke-dashoffset", `${currentLength}`);
    // Another reflow to lock in the starting state
    void path.getBoundingClientRect();
    path.style.transition = "stroke-dashoffset 0.3s ease-out";
    path.setAttribute("stroke-dashoffset", "0");
  }, delayMs);

  function onMapMove() {
    updatePath();
  }

  map.on("moveend zoomend", onMapMove);

  return () => {
    map.off("moveend zoomend", onMapMove);
    if (pane.contains(svgOverlay)) pane.removeChild(svgOverlay);
  };
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

    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [80, 80] });
    } else {
      map.setView([actualLocation.lat, actualLocation.lng], 16);
    }

    // Cleanups declared in outer scope so the effect cleanup can reach them
    const cleanups: (() => void)[] = [];

    map.once("moveend", () => {
      // Actual location marker — no delay
      L.marker(actual, { icon: actualIcon })
        .addTo(map)
        .bindTooltip("Actual location", { permanent: false });

      // Left player — pops immediately, line draws after 150ms
      if (leftResult?.guess) {
        const from = L.latLng(leftResult.guess.lat, leftResult.guess.lng);

        L.marker(from, {
          icon: guessIcon("#3b82f6", "white", left.name.charAt(0).toUpperCase(), leftGreyscale, 0),
        }).addTo(map).bindTooltip(left.name, { permanent: false });

        cleanups.push(addAnimatedLine(
          map, from, actual,
          leftGreyscale ? "#9ca3af" : "#3b82f6",
          150
        ));
      }

      // Right player — pops after 100ms, line draws after 250ms
      if (!singleplayer && rightResult?.guess) {
        const from = L.latLng(rightResult.guess.lat, rightResult.guess.lng);

        L.marker(from, {
          icon: guessIcon("#facc15", "black", right.name.charAt(0).toUpperCase(), rightGreyscale, 100),
        }).addTo(map).bindTooltip(right.name, { permanent: false });

        cleanups.push(addAnimatedLine(
          map, from, actual,
          rightGreyscale ? "#9ca3af" : "#facc15",
          250
        ));
      }
    });

    mapRef.current = map;

    return () => {
      cleanups.forEach((fn) => fn());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0" />
  );
}