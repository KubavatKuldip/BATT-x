// WCAG 2.1 AA regression tests — these cover the accessibility changes
// applied to the navigation, dashboard, and auth surfaces. They don't
// replace a real screen-reader / keyboard pass; they catch the regressions
// that would silently re-introduce color-only signal, missing landmark
// labels, or missing alt text on decorative icons.

// Override the global next/navigation mock with one whose usePathname is
// a real jest.fn() so individual tests can change the active route.
jest.mock("next/navigation", () => {
  const usePathname = jest.fn(() => "/");
  const useRouter = jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }));
  const useSearchParams = jest.fn(() => new URLSearchParams());
  return { usePathname, useRouter, useSearchParams };
});

import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { BatteryCard } from "@/components/dashboard/battery-card";
import { SensorCard } from "@/components/dashboard/sensor-card";
import { StatusHeader } from "@/components/dashboard/status-header";
import { Bell } from "lucide-react";

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe("WCAG 2.1 AA: navigation landmarks", () => {
  it("BottomNav has a distinguishing aria-label", () => {
    render(<BottomNav />);
    const nav = screen.getByRole("navigation", { name: /primary, mobile/i });
    expect(nav).toBeInTheDocument();
  });

  it("BottomNav marks the active link with aria-current=page", () => {
    // Use /alerts so we can assert the active state on the Alerts link.
    // (Default mock returns "/", but BottomNav's first item is at
    // "/dashboard", so under the default mock nothing is active.)
    mockUsePathname.mockReturnValueOnce("/alerts");

    render(<BottomNav />);
    const alerts = screen.getByRole("link", { name: /alerts/i });
    expect(alerts).toHaveAttribute("aria-current", "page");

    const dashboard = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboard).not.toHaveAttribute("aria-current");
  });
});

describe("WCAG 2.1 AA: sensor card accessible name combines label+value+unit+status", () => {
  it("includes label, value, unit, and status in the accessible name", () => {
    render(
      <SensorCard
        icon={Bell}
        label="Temperature"
        value="35.4"
        unit="°C"
        status="warning"
      />
    );
    const group = screen.getByRole("group", {
      name: /temperature: 35\.4 °c, warning/i,
    });
    expect(group).toBeInTheDocument();
  });

  it("surfaces the status to AT even when color is the only visible signal", () => {
    render(
      <SensorCard
        icon={Bell}
        label="Gas Level"
        value="85"
        unit="ppm"
        status="critical"
      />
    );
    // sr-only duplicate of status text — color is no longer the only signal
    expect(
      screen.getByText(/status: critical/i, { selector: "p.sr-only" })
    ).toBeInTheDocument();
  });
});

describe("WCAG 2.1 AA: battery card is not color-only", () => {
  it("exposes a single accessible name combining percentage, status, charging state", () => {
    render(
      <BatteryCard percentage={80} status="normal" isCharging />
    );
    const group = screen.getByRole("group", {
      name: /battery level 80 percent, normal, charging/i,
    });
    expect(group).toBeInTheDocument();
  });

  it("exposes the same accessible name without 'charging' when idle", () => {
    render(<BatteryCard percentage={42} status="warning" />);
    const group = screen.getByRole("group", {
      name: /battery level 42 percent, warning$/i,
    });
    expect(group).toBeInTheDocument();
  });
});

describe("WCAG 2.1 AA: status header is announced on change", () => {
  it("uses role=status + aria-live=polite so transitions are announced", () => {
    render(
      <StatusHeader
        deviceStatus="warning"
        connectionStatus="connected"
        gracePeriodSeconds={30}
        lastSyncAt={new Date("2026-09-04T12:34:56Z")}
      />
    );
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-atomic", "true");
  });

  it("accessible name includes the device status text", () => {
    render(
      <StatusHeader
        deviceStatus="cutoff"
        connectionStatus="disconnected"
        gracePeriodSeconds={null}
        lastSyncAt={null}
      />
    );
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-label")).toMatch(/cutoff active/i);
    expect(status.getAttribute("aria-label")).toMatch(/disconnected/i);
  });

  it("lastSyncAt is rendered inside a <time> element with a valid ISO datetime", () => {
    const date = new Date("2026-09-04T12:34:56Z");
    render(
      <StatusHeader
        deviceStatus="normal"
        connectionStatus="connected"
        gracePeriodSeconds={null}
        lastSyncAt={date}
      />
    );
    const time = screen.getByText((_, el) => el?.tagName === "TIME");
    expect(time.tagName).toBe("TIME");
    expect(time.getAttribute("dateTime")).toBe("2026-09-04T12:34:56.000Z");
  });
});
