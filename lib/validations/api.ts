import { z } from "zod";

// User schemas
export const userUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  preferredLanguage: z.enum(["en", "hi", "es"]).optional(),
  emergencyContacts: z.array(z.object({
    name: z.string().min(1).max(255),
    phone: z.string().min(10).max(20),
    email: z.string().email().optional(),
  })).optional(),
});

// Device schemas
export const deviceCreateSchema = z.object({
  serialNumber: z.string().min(6).max(50),
  vehicleType: z.enum(["TWO_WHEELER", "THREE_WHEELER", "FOUR_WHEELER"]),
  nickname: z.string().min(1).max(100).optional(),
});

export const deviceUpdateSchema = z.object({
  nickname: z.string().min(1).max(100).optional(),
  thresholds: z.object({
    tempMax: z.number().min(0).max(100),
    tempMin: z.number().min(-20).max(50),
    gasMax: z.number().min(0).max(1000),
    voltageMax: z.number().min(0).max(100),
    voltageMin: z.number().min(0).max(100),
    currentMax: z.number().min(0).max(50),
  }).optional(),
});

// Sensor reading schema
export const sensorReadingCreateSchema = z.object({
  deviceId: z.string().cuid(),
  temperature: z.number().min(-50).max(150),
  gasLevel: z.number().min(0).max(10000),
  voltage: z.number().min(0).max(100),
  current: z.number().min(-50).max(50),
  batteryPercent: z.number().min(0).max(100),
  integrityHash: z.string().min(32).max(128),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
});

// Alert schemas
export const alertCreateSchema = z.object({
  deviceId: z.string().cuid(),
  type: z.enum(["WARNING", "CUTOFF", "RESOLVED", "RESET", "INFO"]),
  reason: z.string().min(1).max(500),
  sensorValuesAtTrigger: z.record(z.string(), z.any()),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
});

export const alertUpdateSchema = z.object({
  resolvedAt: z.string().optional(),
});

// Charge session schemas
export const chargeSessionCreateSchema = z.object({
  deviceId: z.string().cuid(),
  startTime: z.string(),
  startBattery: z.number().min(0).max(100),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
});

export const chargeSessionUpdateSchema = z.object({
  endTime: z.string(),
  endBattery: z.number().min(0).max(100),
  avgTemp: z.number().min(-50).max(150).optional(),
  maxVoltage: z.number().min(0).max(100).optional(),
});

// Activity log schema
export const activityLogCreateSchema = z.object({
  action: z.string().min(1).max(255),
  details: z.record(z.string(), z.any()).optional(),
});

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const alertFilterSchema = paginationSchema.extend({
  type: z.enum(["WARNING", "CUTOFF", "RESOLVED", "RESET", "INFO"]).optional(),
  search: z.string().optional(),
}).merge(dateRangeSchema);

export const sensorReadingFilterSchema = paginationSchema.extend({
  deviceId: z.string().cuid().optional(),
}).merge(dateRangeSchema);
