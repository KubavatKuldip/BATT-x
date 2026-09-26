"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon, LatLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in react-leaflet
// Leaflet's default icon paths don't work with Next.js bundling
if (typeof window !== "undefined") {
  delete (Icon.Default.prototype as any)._getIconUrl;
  Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

interface LocationMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  type: "current" | "alert" | "charge";
  info?: string;
  timestamp?: Date;
  hasAlert?: boolean;
}

interface LocationMapProps {
  markers: LocationMarker[];
  selectedId?: string | null;
  onMarkerClick?: (id: string) => void;
}

// Component to fit bounds when markers change
function MapBounds({ markers }: { markers: LocationMarker[] }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length > 0) {
      const bounds = new LatLngBounds(markers.map(m => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [markers, map]);

  return null;
}

export function LocationMap({ markers, selectedId, onMarkerClick }: LocationMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Avoid SSR rendering of Leaflet
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  // Default center (will be overridden by MapBounds if markers exist)
  const defaultCenter: [number, number] = markers.length > 0
    ? [markers[0].lat, markers[0].lng]
    : [40.7128, -74.0060]; // New York as fallback

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.lat, marker.lng]}
          eventHandlers={{
            click: () => onMarkerClick?.(marker.id),
          }}
        >
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold">{marker.name}</p>
              {marker.info && (
                <p className="text-sm text-muted-foreground">{marker.info}</p>
              )}
              {marker.timestamp && (
                <p className="text-xs text-muted-foreground">
                  {marker.timestamp.toLocaleString()}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      <MapBounds markers={markers} />
    </MapContainer>
  );
}
