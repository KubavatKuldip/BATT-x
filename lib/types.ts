export type SensorData = {
  temperature: number;
  gasLevel: number;
  voltage: number;
  current: number;
  batteryPercent: number;
  timestamp: Date;
};

export type DeviceStatus = 'normal' | 'warning' | 'cutoff';

export type ConnectionStatus = 'connected' | 'disconnected' | 'pairing' | 'offline';

export type AlertType = 'warning' | 'cutoff' | 'resolved' | 'reset' | 'info';

export interface Alert {
  id: string;
  type: AlertType;
  reason: string;
  timestamp: Date;
  sensorValues: SensorData;
  location?: {
    lat: number;
    lng: number;
  };
  resolvedAt?: Date;
}

export interface Device {
  id: string;
  serialNumber: string;
  nickname?: string;
  vehicleType: 'TWO_WHEELER' | 'THREE_WHEELER' | 'FOUR_WHEELER';
  firmwareVersion: string;
  connectionStatus: ConnectionStatus;
  lastSyncAt?: Date;
}

export interface Thresholds {
  tempMax: number;
  tempMin: number;
  gasMax: number;
  voltageMax: number;
  voltageMin: number;
  currentMax: number;
}
