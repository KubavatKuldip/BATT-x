"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, AlertTriangle } from "lucide-react";
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
      <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
        <p className="text-muted-foreground">Loading map...</p>
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-heading-1">{t('title')}</h1>
          <p className="text-body text-muted-foreground mt-1">
            {t('description')}
            {!useRealData && !isLoading && (
              <span className="ml-2 text-xs text-warning">(Demo data - no real locations available)</span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <Card level={2} className="lg:col-span-2 p-6">
            <CardHeader className="p-0 mb-6">
              <CardTitle>Map View</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative w-full h-[400px] lg:h-[500px] rounded-lg overflow-hidden">
                {isLoading ? (
                  <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
                    <p className="text-muted-foreground">Loading locations...</p>
                  </div>
                ) : (
                  <DynamicLocationMap
                    markers={mapMarkers}
                    selectedId={selectedLocation}
                    onMarkerClick={setSelectedLocation}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location List */}
          <Card level={2} className="p-6">
            <CardHeader className="p-0 mb-6">
              <CardTitle>Recent Locations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8">
                  Loading...
                </div>
              ) : (
                <div className="space-y-3">
                  {locations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => setSelectedLocation(location.id)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        selectedLocation === location.id
                          ? "border-primary bg-primary/5 shadow-clay-sm"
                          : "border-border hover:border-primary/50 hover:bg-accent"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <MapPin className={`w-4 h-4 shrink-0 ${
                              location.isCurrent ? "text-success" : "text-muted-foreground"
                            }`} />
                            <span className="text-body-sm font-semibold">{location.name}</span>
                          </div>
                          {location.hasAlert && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3" />
                              Alert
                            </Badge>
                          )}
                          {location.isCurrent && (
                            <Badge variant="success" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>

                        <p className="text-caption text-muted-foreground">
                          {location.address}
                        </p>

                        {location.timestamp && (
                          <p className="text-caption text-muted-foreground">
                            {isClient ? location.timestamp.toLocaleString() : formatDateTime(location.timestamp)}
                          </p>
                        )}

                        {location.hasAlert && location.alertType && (
                          <p className="text-caption text-danger">
                            {location.alertType}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Location Details */}
        {selectedLocation && !isLoading && (
          <Card level={2} className="p-6">
            <CardHeader className="p-0 mb-6">
              <CardTitle>Location Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(() => {
                const location = locations.find((l) => l.id === selectedLocation);
                if (!location) return null;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="clay-inset p-4 rounded-lg space-y-1">
                      <p className="text-caption text-muted-foreground">Latitude</p>
                      <p className="text-body font-semibold tabular-nums">{location.lat.toFixed(4)}</p>
                    </div>
                    <div className="clay-inset p-4 rounded-lg space-y-1">
                      <p className="text-caption text-muted-foreground">Longitude</p>
                      <p className="text-body font-semibold tabular-nums">{location.lng.toFixed(4)}</p>
                    </div>
                    <div className="clay-inset p-4 rounded-lg space-y-1">
                      <p className="text-caption text-muted-foreground">Status</p>
                      <p className={`text-body font-semibold ${
                        location.hasAlert ? "text-danger" : "text-success"
                      }`}>
                        {location.hasAlert ? "Alert Triggered" : "Normal"}
                      </p>
                    </div>
                    <div className="clay-inset p-4 rounded-lg space-y-1">
                      <p className="text-caption text-muted-foreground">Recorded</p>
                      <p className="text-body font-semibold">
                        {location.timestamp
                          ? (isClient ? location.timestamp.toLocaleDateString() : formatDateOnly(location.timestamp))
                          : "Live"}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
