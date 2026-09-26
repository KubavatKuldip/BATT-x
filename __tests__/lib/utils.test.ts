import {
  cn,
  formatTemperature,
  formatVoltage,
  formatCurrent,
  formatGasLevel,
  formatBatteryPercent,
  getStatusColor,
  getStatusBgColor,
  formatTimestamp,
  formatRelativeTime,
} from "@/lib/utils";

describe("cn (className merger)", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("filters out falsy values", () => {
    expect(cn("foo", false, null, undefined, "", "bar")).toBe("foo bar");
  });

  it("deduplicates conflicting tailwind classes", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

describe("formatters", () => {
  it("formats temperature with 1 decimal and °C", () => {
    expect(formatTemperature(45.678)).toBe("45.7°C");
    expect(formatTemperature(0)).toBe("0.0°C");
  });

  it("formats voltage with 2 decimals and V", () => {
    expect(formatVoltage(48.123)).toBe("48.12V");
  });

  it("formats current with 2 decimals and A", () => {
    expect(formatCurrent(2.5)).toBe("2.50A");
  });

  it("formats gas level rounded to integer", () => {
    expect(formatGasLevel(45.7)).toBe("46 ppm");
  });

  it("formats battery percent rounded to integer", () => {
    expect(formatBatteryPercent(76.4)).toBe("76%");
    expect(formatBatteryPercent(76.6)).toBe("77%");
  });
});

describe("status colors", () => {
  it("returns success color for normal", () => {
    expect(getStatusColor("normal")).toBe("text-success");
    expect(getStatusBgColor("normal")).toBe("bg-success/10");
  });

  it("returns warning color for warning", () => {
    expect(getStatusColor("warning")).toBe("text-warning");
  });

  it("returns danger color for cutoff", () => {
    expect(getStatusColor("cutoff")).toBe("text-danger");
  });
});

describe("formatTimestamp", () => {
  it("formats a Date object", () => {
    const d = new Date("2026-01-15T14:30:00Z");
    const out = formatTimestamp(d);
    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(0);
  });

  it("accepts a date string", () => {
    const out = formatTimestamp("2026-01-15T14:30:00Z");
    expect(typeof out).toBe("string");
  });
});

describe("formatRelativeTime", () => {
  it("returns 'just now' for under 60 seconds", () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe("just now");
  });

  it("returns minutes ago", () => {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMinsAgo)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatRelativeTime(twoHoursAgo)).toBe("2h ago");
  });

  it("returns days ago for less than 7 days", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeDaysAgo)).toBe("3d ago");
  });
});
