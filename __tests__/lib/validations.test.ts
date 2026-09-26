import {
  userUpdateSchema,
  deviceCreateSchema,
  deviceUpdateSchema,
  sensorReadingCreateSchema,
  alertCreateSchema,
  alertUpdateSchema,
  chargeSessionCreateSchema,
  chargeSessionUpdateSchema,
  activityLogCreateSchema,
  paginationSchema,
  dateRangeSchema,
  alertFilterSchema,
  sensorReadingFilterSchema,
} from "@/lib/validations/api";

describe("userUpdateSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    expect(userUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("accepts valid name + language", () => {
    const r = userUpdateSchema.safeParse({ name: "Alice", preferredLanguage: "en" });
    expect(r.success).toBe(true);
  });

  it("rejects invalid language", () => {
    const r = userUpdateSchema.safeParse({ preferredLanguage: "fr" });
    expect(r.success).toBe(false);
  });

  it("accepts emergency contacts with valid phone", () => {
    const r = userUpdateSchema.safeParse({
      emergencyContacts: [
        { name: "Bob", phone: "+1-555-1234567" },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects emergency contact with too-short phone", () => {
    const r = userUpdateSchema.safeParse({
      emergencyContacts: [{ name: "Bob", phone: "123" }],
    });
    expect(r.success).toBe(false);
  });
});

describe("deviceCreateSchema", () => {
  it("accepts valid two-wheeler device", () => {
    const r = deviceCreateSchema.safeParse({
      serialNumber: "SN-123456",
      vehicleType: "TWO_WHEELER",
      nickname: "My Scooter",
    });
    expect(r.success).toBe(true);
  });

  it("rejects too-short serial", () => {
    const r = deviceCreateSchema.safeParse({
      serialNumber: "AB",
      vehicleType: "TWO_WHEELER",
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid vehicle type", () => {
    const r = deviceCreateSchema.safeParse({
      serialNumber: "SN-123456",
      vehicleType: "PLANE",
    });
    expect(r.success).toBe(false);
  });

  it("accepts three- and four-wheeler", () => {
    expect(deviceCreateSchema.safeParse({ serialNumber: "SN-AAA", vehicleType: "THREE_WHEELER" }).success).toBe(true);
    expect(deviceCreateSchema.safeParse({ serialNumber: "SN-BBB", vehicleType: "FOUR_WHEELER" }).success).toBe(true);
  });
});

describe("deviceUpdateSchema", () => {
  it("accepts nickname only", () => {
    const r = deviceUpdateSchema.safeParse({ nickname: "Scooty" });
    expect(r.success).toBe(true);
  });

  it("accepts full thresholds", () => {
    const r = deviceUpdateSchema.safeParse({
      thresholds: {
        tempMax: 60, tempMin: 0, gasMax: 500,
        voltageMax: 50, voltageMin: 0, currentMax: 10,
      },
    });
    expect(r.success).toBe(true);
  });

  it("rejects out-of-range temperature max", () => {
    const r = deviceUpdateSchema.safeParse({
      thresholds: {
        tempMax: 200, tempMin: 0, gasMax: 500,
        voltageMax: 50, voltageMin: 0, currentMax: 10,
      },
    });
    expect(r.success).toBe(false);
  });
});

describe("sensorReadingCreateSchema", () => {
  const validReading = {
    deviceId: "ckl5g0z0x0000abcd1234efgh",
    temperature: 25,
    gasLevel: 100,
    voltage: 48,
    current: 2,
    batteryPercent: 80,
    integrityHash: "a".repeat(64),
  };

  it("accepts a valid reading", () => {
    expect(sensorReadingCreateSchema.safeParse(validReading).success).toBe(true);
  });

  it("rejects out-of-range temperature", () => {
    expect(sensorReadingCreateSchema.safeParse({ ...validReading, temperature: 200 }).success).toBe(false);
  });

  it("rejects batteryPercent over 100", () => {
    expect(sensorReadingCreateSchema.safeParse({ ...validReading, batteryPercent: 150 }).success).toBe(false);
  });

  it("rejects short integrity hash", () => {
    expect(sensorReadingCreateSchema.safeParse({ ...validReading, integrityHash: "short" }).success).toBe(false);
  });

  it("accepts optional location", () => {
    const r = sensorReadingCreateSchema.safeParse({
      ...validReading,
      locationLat: 12.34,
      locationLng: 56.78,
    });
    expect(r.success).toBe(true);
  });
});

describe("alertCreateSchema", () => {
  const base = {
    deviceId: "ckl5g0z0x0000abcd1234efgh",
    type: "WARNING" as const,
    reason: "Temperature exceeded threshold",
    sensorValuesAtTrigger: { temperature: 75 },
  };

  it("accepts valid alert", () => {
    expect(alertCreateSchema.safeParse(base).success).toBe(true);
  });

  it("accepts all valid alert types", () => {
    ["WARNING", "CUTOFF", "RESOLVED", "RESET", "INFO"].forEach((t) => {
      expect(alertCreateSchema.safeParse({ ...base, type: t }).success).toBe(true);
    });
  });

  it("rejects empty reason", () => {
    expect(alertCreateSchema.safeParse({ ...base, reason: "" }).success).toBe(false);
  });

  it("rejects invalid type", () => {
    expect(alertCreateSchema.safeParse({ ...base, type: "FIRE" }).success).toBe(false);
  });
});

describe("alertUpdateSchema", () => {
  it("accepts resolvedAt string", () => {
    expect(alertUpdateSchema.safeParse({ resolvedAt: "2026-09-04T12:00:00Z" }).success).toBe(true);
  });

  it("accepts empty object", () => {
    expect(alertUpdateSchema.safeParse({}).success).toBe(true);
  });
});

describe("chargeSessionCreateSchema", () => {
  it("accepts valid session", () => {
    const r = chargeSessionCreateSchema.safeParse({
      deviceId: "ckl5g0z0x0000abcd1234efgh",
      startTime: "2026-09-04T12:00:00Z",
      startBattery: 20,
    });
    expect(r.success).toBe(true);
  });

  it("rejects startBattery > 100", () => {
    const r = chargeSessionCreateSchema.safeParse({
      deviceId: "ckl5g0z0x0000abcd1234efgh",
      startTime: "2026-09-04T12:00:00Z",
      startBattery: 150,
    });
    expect(r.success).toBe(false);
  });
});

describe("chargeSessionUpdateSchema", () => {
  it("accepts valid end values", () => {
    const r = chargeSessionUpdateSchema.safeParse({
      endTime: "2026-09-04T13:00:00Z",
      endBattery: 100,
      avgTemp: 30,
      maxVoltage: 50,
    });
    expect(r.success).toBe(true);
  });
});

describe("activityLogCreateSchema", () => {
  it("accepts valid action", () => {
    expect(activityLogCreateSchema.safeParse({ action: "user.login" }).success).toBe(true);
  });

  it("rejects empty action", () => {
    expect(activityLogCreateSchema.safeParse({ action: "" }).success).toBe(false);
  });

  it("accepts details object", () => {
    const r = activityLogCreateSchema.safeParse({
      action: "device.pair",
      details: { deviceId: "abc", pairingCode: "1234" },
    });
    expect(r.success).toBe(true);
  });
});

describe("paginationSchema", () => {
  it("uses defaults when input is empty", () => {
    const r = paginationSchema.parse({});
    expect(r.page).toBe(1);
    expect(r.limit).toBe(20);
  });

  it("coerces string numbers", () => {
    const r = paginationSchema.parse({ page: "3", limit: "50" });
    expect(r.page).toBe(3);
    expect(r.limit).toBe(50);
  });

  it("rejects limit over 100", () => {
    expect(paginationSchema.safeParse({ limit: 500 }).success).toBe(false);
  });

  it("rejects page 0", () => {
    expect(paginationSchema.safeParse({ page: 0 }).success).toBe(false);
  });
});

describe("dateRangeSchema", () => {
  it("accepts empty object", () => {
    expect(dateRangeSchema.safeParse({}).success).toBe(true);
  });

  it("accepts both start and end dates", () => {
    const r = dateRangeSchema.safeParse({
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    expect(r.success).toBe(true);
  });
});

describe("alertFilterSchema", () => {
  it("merges pagination + filter + date range", () => {
    const r = alertFilterSchema.parse({
      type: "WARNING",
      search: "temp",
      page: "2",
      limit: "10",
      startDate: "2026-01-01",
    });
    expect(r.type).toBe("WARNING");
    expect(r.search).toBe("temp");
    expect(r.page).toBe(2);
    expect(r.limit).toBe(10);
    expect(r.startDate).toBe("2026-01-01");
  });

  it("rejects invalid type filter", () => {
    expect(alertFilterSchema.safeParse({ type: "FOO" }).success).toBe(false);
  });
});

describe("sensorReadingFilterSchema", () => {
  it("accepts deviceId filter", () => {
    const r = sensorReadingFilterSchema.parse({
      deviceId: "ckl5g0z0x0000abcd1234efgh",
    });
    expect(r.deviceId).toBe("ckl5g0z0x0000abcd1234efgh");
    expect(r.page).toBe(1);
  });

  it("rejects invalid cuid", () => {
    expect(sensorReadingFilterSchema.safeParse({ deviceId: "not-a-cuid" }).success).toBe(false);
  });
});
