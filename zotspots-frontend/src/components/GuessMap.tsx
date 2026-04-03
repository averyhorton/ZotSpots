import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's broken default marker icons when bundled with Vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const UCI_CENTER: L.LatLngExpression = [33.64595343402615, -117.84267167612427];
const DEFAULT_ZOOM = 14;

const pinIcon = L.icon({
  iconUrl: "/PetrGuessr Logo.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40], // bottom-center of the image touches the clicked point
  popupAnchor: [0, -40],
});

interface GuessMapProps {
  guess: { lat: number; lng: number } | null;
  onGuess: (latlng: { lat: number; lng: number }) => void;
}

export default function GuessMap({ guess, onGuess }: GuessMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: UCI_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap Contributors",
      maxZoom: 19,
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      onGuess({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Keep onGuess fresh without reinitializing the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Re-bind click with the latest onGuess
    map.off("click");
    map.on("click", (e: L.LeafletMouseEvent) => {
      onGuess({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
  }, [onGuess]);

  // Sync marker with guess prop
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!guess) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([guess.lat, guess.lng]);
    } else {
      markerRef.current = L.marker([guess.lat, guess.lng], { icon: pinIcon }).addTo(map);
    }
  }, [guess]);

  return (
    <div className="fixed bottom-21 right-3 z-50 rounded-xl overflow-hidden shadow-2xl border border-white/20"
      style={{ width: 400, height: 300 }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}