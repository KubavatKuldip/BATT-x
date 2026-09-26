import { useDashboardStore } from "@/lib/stores/dashboard-store";
import type { SensorData } from "@/lib/types";

const sampleData: SensorData = {
  temperature: 45,
  gasLevel: 20,
  voltage: 48.5,
  current: 5.0,
  batteryPercent: 80,
  timestamp: new Date(),
};

describe("useDashboardStore", () => {
  beforeEach(() => {
    // Reset to initial state
    useDashboardStore.setState({
      currentDevice: null,
      sensorData: null,
      deviceStatus: "normal",
      connectionStatus: "offline",
      gracePeriodSeconds: null,
      lastSyncAt: null,
    });
  });

  it("initializes with defaults", () => {
    const state = useDashboardStore.getState();
    expect(state.sensorData).toBeNull();
    expect(state.deviceStatus).toBe("normal");
    expect(state.connectionStatus).toBe("offline");
    expect(state.gracePeriodSeconds).toBeNull();
  });

  it("setSensorData updates sensor data and bumps lastSyncAt", () => {
    useDashboardStore.getState().setSensorData(sampleData);
    const state = useDashboardStore.getState();
    expect(state.sensorData).toEqual(sampleData);
    expect(state.lastSyncAt).toBeInstanceOf(Date);
  });

  it("setDeviceStatus updates the device status", () => {
    useDashboardStore.getState().setDeviceStatus("warning");
    expect(useDashboardStore.getState().deviceStatus).toBe("warning");
  });

  it("setConnectionStatus updates the connection status", () => {
    useDashboardStore.getState().setConnectionStatus("connected");
    expect(useDashboardStore.getState().connectionStatus).toBe("connected");
  });

  it("setGracePeriod sets and clears the grace period", () => {
    useDashboardStore.getState().setGracePeriod(30);
    expect(useDashboardStore.getState().gracePeriodSeconds).toBe(30);
    useDashboardStore.getState().setGracePeriod(null);
    expect(useDashboardStore.getState().gracePeriodSeconds).toBeNull();
  });

  it("setCurrentDevice sets the active device", () => {
    useDashboardStore.getState().setCurrentDevice("device-123");
    expect(useDashboardStore.getState().currentDevice).toBe("device-123");
  });
});
