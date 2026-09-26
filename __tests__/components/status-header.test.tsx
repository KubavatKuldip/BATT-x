import { render, screen } from "@testing-library/react";
import { StatusHeader } from "@/components/dashboard/status-header";

describe("StatusHeader", () => {
  it("renders Normal status text and success badge", () => {
    render(
      <StatusHeader
        deviceStatus="normal"
        connectionStatus="connected"
        gracePeriodSeconds={null}
        lastSyncAt={null}
      />
    );
    expect(screen.getByText("Normal")).toBeInTheDocument();
    expect(screen.getByText("All systems operating normally")).toBeInTheDocument();
    expect(screen.getByText("NORMAL")).toBeInTheDocument();
  });

  it("renders Warning status with grace period description", () => {
    render(
      <StatusHeader
        deviceStatus="warning"
        connectionStatus="pairing"
        gracePeriodSeconds={42}
        lastSyncAt={null}
      />
    );
    expect(screen.getByText("Warning")).toBeInTheDocument();
    expect(screen.getByText("Grace period: 42s remaining")).toBeInTheDocument();
    expect(screen.getByText("Pairing...")).toBeInTheDocument();
  });

  it("renders Warning without grace period when null", () => {
    render(
      <StatusHeader
        deviceStatus="warning"
        connectionStatus="connected"
        gracePeriodSeconds={null}
        lastSyncAt={null}
      />
    );
    expect(screen.getByText("Threshold exceeded - monitoring")).toBeInTheDocument();
  });

  it("renders Cutoff Active status and disconnected connection", () => {
    render(
      <StatusHeader
        deviceStatus="cutoff"
        connectionStatus="disconnected"
        gracePeriodSeconds={null}
        lastSyncAt={null}
      />
    );
    expect(screen.getByText("Cutoff Active")).toBeInTheDocument();
    expect(screen.getByText("Safety cutoff triggered - charging stopped")).toBeInTheDocument();
    expect(screen.getByText("Disconnected")).toBeInTheDocument();
  });

  it("renders Offline connection text when status is offline", () => {
    render(
      <StatusHeader
        deviceStatus="normal"
        connectionStatus="offline"
        gracePeriodSeconds={null}
        lastSyncAt={null}
      />
    );
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("renders last sync time when lastSyncAt is provided", () => {
    const date = new Date("2026-09-04T12:34:00Z");
    render(
      <StatusHeader
        deviceStatus="normal"
        connectionStatus="connected"
        gracePeriodSeconds={null}
        lastSyncAt={date}
      />
    );
    // toLocaleTimeString varies by environment; just confirm "Last synced:" prefix appears
    expect(screen.getByText(/Last synced:/)).toBeInTheDocument();
  });
});
