"use client";

import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { SensorData } from "@/lib/types";

let socket: Socket | null = null;

// Get NextAuth session token from cookies
function getSessionToken(): string | null {
  if (typeof document === 'undefined') return null;

  // NextAuth v5 stores JWT in cookies with names like:
  // - authjs.session-token (production)
  // - __Secure-authjs.session-token (production with secure)
  // - next-auth.session-token (legacy)
  const cookies = document.cookie.split(';');

  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'authjs.session-token' ||
        name === '__Secure-authjs.session-token' ||
        name === 'next-auth.session-token') {
      return decodeURIComponent(value);
    }
  }

  return null;
}

export function useSocket(deviceId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize socket connection with authentication
    if (!socket) {
      const token = getSessionToken();

      if (!token) {
        console.warn('No session token found, socket connection will not be established');
        setError('Authentication required');
        return;
      }

      socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
        transports: ["websocket", "polling"],
        auth: {
          token,
        },
      });

      socket.on("connect", () => {
        console.log("Socket connected");
        setIsConnected(true);
        setError(null);
      });

      socket.on("disconnect", () => {
        console.log("Socket disconnected");
        setIsConnected(false);
      });

      socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err.message);
        setIsConnected(false);
        setError(err.message);
      });

      socket.on("error", (err) => {
        console.error("Socket error:", err.message);
        setError(err.message);
      });
    }

    // Subscribe to device updates
    if (deviceId && socket) {
      socket.emit("subscribe-device", deviceId);

      const handleSensorData = (data: SensorData) => {
        setSensorData({
          ...data,
          timestamp: new Date(data.timestamp),
        });
      };

      const handleSubscribed = ({ deviceId: subscribedDeviceId }: { deviceId: string }) => {
        console.log(`Successfully subscribed to device: ${subscribedDeviceId}`);
      };

      socket.on("sensor-data", handleSensorData);
      socket.on("subscribed", handleSubscribed);

      return () => {
        socket?.emit("unsubscribe-device", deviceId);
        socket?.off("sensor-data", handleSensorData);
        socket?.off("subscribed", handleSubscribed);
      };
    }
  }, [deviceId]);

  return { isConnected, sensorData, error };
}
