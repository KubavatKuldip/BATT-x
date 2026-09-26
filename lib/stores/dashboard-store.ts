"use client";

import { create } from 'zustand';
import type { SensorData, DeviceStatus, ConnectionStatus } from '@/lib/types';

interface DashboardState {
  currentDevice: string | null;
  sensorData: SensorData | null;
  deviceStatus: DeviceStatus;
  connectionStatus: ConnectionStatus;
  gracePeriodSeconds: number | null;
  lastSyncAt: Date | null;

  setCurrentDevice: (deviceId: string) => void;
  setSensorData: (data: SensorData) => void;
  setDeviceStatus: (status: DeviceStatus) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setGracePeriod: (seconds: number | null) => void;
  setLastSync: (date: Date) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  currentDevice: null,
  sensorData: null,
  deviceStatus: 'normal',
  connectionStatus: 'offline',
  gracePeriodSeconds: null,
  lastSyncAt: null,

  setCurrentDevice: (deviceId) => set({ currentDevice: deviceId }),
  setSensorData: (data) => set({ sensorData: data, lastSyncAt: new Date() }),
  setDeviceStatus: (status) => set({ deviceStatus: status }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setGracePeriod: (seconds) => set({ gracePeriodSeconds: seconds }),
  setLastSync: (date) => set({ lastSyncAt: date }),
}));
