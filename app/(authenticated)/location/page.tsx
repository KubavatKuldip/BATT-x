"use client";

import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, AlertTriangle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { formatDateTime, formatDateOnly } from "@/lib/utils/date-format";
import { LocationMap } from "@/components/location/location-map";
import dynamic from "next/dynamic";
import { useTranslations } from 'next-intl';

// Dynamically import LocationMap to avoid SSR issues with Leaflet
const DynamicLocationMap = dynamic(
  () => import("@/components/location/location-map").then(mod => mod.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center rounded-lg" style={{ background: 'hsl(var(--paper))' }}>
        <p className="font-mono text-[12px]" style={{ color: 'hsl(var(--ink-3))' }}>Loading map...</p>
      </div>
    ),
  }
);

interface LocationData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  isCurrent?: boolean;
  hasAlert?: boolean;
  alertType?: string;
  timestamp?: Date;
  deviceId?: string;
  deviceName?: string;
}

// Mock location data for fallback
const mockLocations: LocationData[] = [
  {
    id: "mock-1",
    name: "Current Location",
    lat: 40.7128,
    lng: -74.0060,
    address: "Downtown Charging Station, New York, NY",
    isCurrent: true,
    hasAlert: false,
  },
  {
    id: "mock-2",
    name: "Recent Alert",
    lat: 40.7580,
    lng: -73.9855,
    address: "Times Square Parking, New York, NY",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    hasAlert: true,
    alertType: "Temperature exceeded threshold",
  },
  {
    id: "mock-3",
    name: "Last Charge",
    lat: 40.7489,
    lng: -73.9680,
    address: "Grand Central Terminal, New York, NY",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    hasAlert: false,
  },
];

export default function LocationPage() {
  const t = useTranslations('location');
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [useRealData, setUseRealData] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch real location data from API
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch("/api/devices/locations");
        if (response.ok) {
          const data = await response.json();

          // Transform API data to location format
          const transformedLocations: LocationData[] = [];

          data.locations?.forEach((deviceData: any) => {
            const device = deviceData.device;
            const deviceName = device.nickname || device.serialNumber;

            // Add current location from latest sensor reading
            if (deviceData.latestReading?.locationLat && deviceData.latestReading?.locationLng) {
              transformedLocations.push({
                id: `device-${device.id}`,
                name: `${deviceName} - Current`,
                lat: deviceData.latestReading.locationLat,
                lng: deviceData.latestReading.locationLng,
                address: `Lat: ${deviceData.latestReading.locationLat.toFixed(4)}, Lng: ${deviceData.latestReading.locationLng.toFixed(4)}`,
                isCurrent: true,
                hasAlert: false,
                timestamp: new Date(deviceData.latestReading.timestamp),
                deviceId: device.id,
                deviceName,
              });
            }

            // Add alert locations
            deviceData.recentAlerts?.forEach((alert: any, idx: number) => {
              if (alert.locationLat && alert.locationLng) {
                transformedLocations.push({
                  id: `alert-${alert.id}`,
                  name: `${deviceName} - Alert`,
                  lat: alert.locationLat,
                  lng: alert.locationLng,
                  address: `Lat: ${alert.locationLat.toFixed(4)}, Lng: ${alert.locationLng.toFixed(4)}`,
                  hasAlert: true,
                  alertType: alert.reason,
                  timestamp: new Date(alert.createdAt),
                  deviceId: device.id,
                  deviceName,
                });
              }
            });

            // Add charge session locations
            deviceData.recentChargeSessions?.forEach((session: any, idx: number) => {
              if (session.locationLat && session.locationLng) {
                transformedLocations.push({
                  id: `charge-${session.id}`,
                  name: `${deviceName} - Charge`,
                  lat: session.locationLat,
                  lng: session.locationLng,
                  address: `Lat: ${session.locationLat.toFixed(4)}, Lng: ${session.locationLng.toFixed(4)}`,
                  timestamp: new Date(session.startTime),
                  deviceId: device.id,
                  deviceName,
                });
              }
            });
          });

          if (transformedLocations.length > 0) {
            setLocations(transformedLocations);
            setSelectedLocation(transformedLocations[0].id);
            setUseRealData(true);
          } else {
            // No real location data, use mock
            setLocations(mockLocations);
            setSelectedLocation(mockLocations[0].id);
            setUseRealData(false);
          }
        } else {
          // API error, use mock data
          setLocations(mockLocations);
          setSelectedLocation(mockLocations[0].id);
          setUseRealData(false);
        }
      } catch (error) {
        console.error("Failed to fetch locations:", error);
        // Fallback to mock data
        setLocations(mockLocations);
        setSelectedLocation(mockLocations[0].id);
        setUseRealData(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocations();
  }, []);

  // Transform locations to map markers
  const mapMarkers = locations.map(loc => ({
    id: loc.id,
    lat: loc.lat,
    lng: loc.lng,
    name: loc.name,
    type: loc.isCurrent ? "current" : loc.hasAlert ? "alert" : "charge",
    info: loc.address,
    timestamp: loc.timestamp,
    hasAlert: loc.hasAlert,
  })) as any[];

  const selectedLocationData = locations.find((l) => l.id === selectedLocation);

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--bg))' }}>
      <div className="max-w-[1240px] mx-auto px-8 py-12 space-y-16">
        {/* Editorial Header */}
        <div className="space-y-10">
          <div className="eyebrow">06 — Device location</div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10 items-end pb-7 border-b border-rule">
            <div className="space-y-3.5">
              <div className="font-mono text-[11px] text-ink-4 tracking-wide uppercase">
                {locations.length} TRACKED LOCATIONS{!useRealData && !isLoading && " · DEMO DATA"}
              </div>
            </div>
            <div>
              <h2 className="h-section">
                Every location, <em className="font-serif italic font-normal" style={{ color: 'hsl(var(--accent))' }}>mapped.</em>
              </h2>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'hsl(var(--accent))' }} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Map */}
              <section className="lg:col-span-2">
                <div className="mb-6">
                  <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Map View</h3>
                  <p className="text-[13px]" style={{ color: 'hsl(var(--ink-3))' }}>
                    Real-time and historical device positions
                  </p>
                </div>

                <div className="paper-surface-hover rounded-lg border border-rule overflow-hidden">
                  <div className="relative w-full h-[400px] lg:h-[500px]">
                    <DynamicLocationMap
                      markers={mapMarkers}
                      selectedId={selectedLocation}
                      onMarkerClick={setSelectedLocation}
                    />
                  </div>
                </div>
              </section>

              {/* Location List */}
              <section>
                <div className="mb-6">
                  <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Recent Locations</h3>
                  <p className="text-[13px]" style={{ color: 'hsl(var(--ink-3))' }}>
                    Click to view details
                  </p>
                </div>

                <div className="space-y-3">
                  {locations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => setSelectedLocation(location.id)}
                      className={`w-full text-left p-5 rounded-lg border transition-all ${
                        selectedLocation === location.id
                          ? "border-accent"
                          : "border-rule hover:border-ink-4"
                      }`}
                      style={{
                        background: selectedLocation === location.id
                          ? 'color-mix(in srgb, hsl(var(--accent)) 5%, hsl(var(--paper)))'
                          : 'hsl(var(--paper))',
                      }}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 shrink-0" style={{
                              color: location.isCurrent ? 'hsl(var(--ok))' : 'hsl(var(--ink-3))'
                            }} />
                            <span className="text-[14px] font-medium">{location.name}</span>
                          </div>
                          {location.hasAlert && (
                            <span className="inline-flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wide" style={{
                              background: 'color-mix(in srgb, hsl(var(--danger)) 10%, hsl(var(--paper)))',
                              color: 'hsl(var(--danger))',
                            }}>
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Alert
                            </span>
                          )}
                          {location.isCurrent && (
                            <span className="inline-flex font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wide" style={{
                              background: 'color-mix(in srgb, hsl(var(--ok)) 10%, hsl(var(--paper)))',
                              color: 'hsl(var(--ok))',
                            }}>
                              Current
                            </span>
                          )}
                        </div>

                        <p className="font-mono text-[11px]" style={{ color: 'hsl(var(--ink-3))' }}>
                          {location.address}
                        </p>

                        {location.timestamp && (
                          <p className="font-mono text-[10px]" style={{ color: 'hsl(var(--ink-4))' }}>
                            {isClient ? location.timestamp.toLocaleString() : formatDateTime(location.timestamp)}
                          </p>
                        )}

                        {location.hasAlert && location.alertType && (
                          <p className="text-[12px]" style={{ color: 'hsl(var(--danger))' }}>
                            {location.alertType}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Location Details */}
            {selectedLocationData && (
              <section>
                <div className="mb-6">
                  <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Location Details</h3>
                  <p className="text-[13px]" style={{ color: 'hsl(var(--ink-3))' }}>
                    Coordinates and status for selected location
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="paper-surface-hover rounded-lg border border-rule p-6">
                    <div className="smallcaps mb-3" style={{ color: 'hsl(var(--ink-3))' }}>Latitude</div>
                    <div className="font-mono text-[20px] font-light tabular-nums">{selectedLocationData.lat.toFixed(4)}</div>
                  </div>
                  <div className="paper-surface-hover rounded-lg border border-rule p-6">
                    <div className="smallcaps mb-3" style={{ color: 'hsl(var(--ink-3))' }}>Longitude</div>
                    <div className="font-mono text-[20px] font-light tabular-nums">{selectedLocationData.lng.toFixed(4)}</div>
                  </div>
                  <div className="paper-surface-hover rounded-lg border border-rule p-6">
                    <div className="smallcaps mb-3" style={{ color: 'hsl(var(--ink-3))' }}>Status</div>
                    <div className={`text-[16px] font-medium`} style={{
                      color: selectedLocationData.hasAlert ? 'hsl(var(--danger))' : 'hsl(var(--ok))'
                    }}>
                      {selectedLocationData.hasAlert ? "Alert Triggered" : "Normal"}
                    </div>
                  </div>
                  <div className="paper-surface-hover rounded-lg border border-rule p-6">
                    <div className="smallcaps mb-3" style={{ color: 'hsl(var(--ink-3))' }}>Recorded</div>
                    <div className="font-mono text-[16px] font-light">
                      {selectedLocationData.timestamp
                        ? (isClient ? selectedLocationData.timestamp.toLocaleDateString() : formatDateOnly(selectedLocationData.timestamp))
                        : "Live"}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {/* Footer */}
        <footer className="pt-11 border-t border-rule">
          <div className="flex items-center justify-between flex-wrap gap-8">
            <div className="flex gap-5 flex-wrap font-mono text-[10.5px] tracking-wide" style={{ color: 'hsl(var(--ink-4))' }}>
              <span>BATT-x · Location Tracking</span>
              <span className="opacity-40">·</span>
              <span>GPS coordinates signed with HMAC-SHA256</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
