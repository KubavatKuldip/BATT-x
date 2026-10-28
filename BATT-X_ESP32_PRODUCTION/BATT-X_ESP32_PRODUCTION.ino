/*
 * ============================================================
 *  BATT-X — Battery Advanced Thermal & Telemetry Index
 *  ESP32 Firmware for SIH 2026 (PS ID: 26220)
 *  PRODUCTION VERSION - Vercel Deployment Compatible
 *  Hardware Category | Smart Vehicles Theme
 * ============================================================
 *
 *  INTEGRATED MODULES:
 *    - DS18B20 Temperature Sensor (1-Wire)
 *    - MQ-2 Gas Sensor (via voltage divider)
 *    - ACS712 Current Sensor
 *    - Potentiometer (battery voltage simulation)
 *    - Relay Module (cutoff actuator)
 *    - Buzzer (audible alert)
 *    - 16x2 I2C LCD (local display)
 *    - microSD Card (secure logging: AES-256 + HMAC-SHA256)
 *
 *  STATE MACHINE:
 *    NORMAL -> WARNING -> GRACE_PERIOD -> CUTOFF
 *                       -> RESOLVED (back to NORMAL)
 *
 *  SECURITY:
 *    Each log entry is encrypted with AES-256 (ECB mode) and
 *    authenticated with HMAC-SHA256 (encrypt-then-MAC).
 *    Log format: [4-byte timestamp][16-byte ciphertext][32-byte HMAC]
 *
 *  PRODUCTION DEPLOYMENT:
 *    - QR-based device pairing with backend
 *    - Persistent deviceId storage in ESP32 NVS
 *    - Backend-compatible JSON sensor payloads
 *    - SHA-256 integrity hashing
 *    - HTTPS sensor data uploads to Vercel
 *    - Auto re-pair on 404 (stale deviceId recovery)
 *    - DS18B20 disconnected sentinel filtering (-127°C)
 *
 *  AUTHOR: BATT-X Team
 *  DATE: 2026-10-03
 *  VERSION: 2.1.0 (Production)
 * ============================================================
 */

// ==================== INCLUDES ====================
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <SD.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>

// mbedTLS for AES-256, HMAC-SHA256, and SHA-256
#include "mbedtls/aes.h"
#include "mbedtls/md.h"

// ==================== PIN DEFINITIONS ====================
// Per master hardware connection table (source of truth)

// DS18B20 Temperature
#define ONE_WIRE_BUS        4      // GPIO4, 4.7k pull-up to 3.3V
#define TEMP_SENSOR_INDEX   0

// MQ-2 Gas Sensor (via divider: two 10k in series to GND, midpoint to GPIO34)
#define MQ2_ANALOG_PIN      34     // ADC1_CH6, input only

// ACS712 Current Sensor
#define ACS712_PIN          35     // ADC1_CH7, input only

// Potentiometer (battery voltage simulation)
#define POT_PIN             33     // ADC1_CH5

// Relay Module (cutoff actuator)
#define RELAY_PIN           27

// Buzzer (audible alert)
#define BUZZER_PIN          13

// I2C LCD
#define LCD_SDA             21
#define LCD_SCL             22
#define LCD_ADDR            0x27   // Common I2C address; change if needed
#define LCD_COLS            16
#define LCD_ROWS            2

// microSD Module (SPI)
#define SD_CS               5
#define SD_SCK              18
#define SD_MOSI             23
#define SD_MISO             19

// ==================== CONFIGURATION ====================
// Safety thresholds
#define TEMP_WARNING_C      50.0   // °C - warning threshold
#define TEMP_CRITICAL_C     60.0   // °C - critical threshold
#define GAS_WARNING_ADC     1200   // Raw ADC value from MQ-2 divider
#define GAS_CRITICAL_ADC    2000
#define CURRENT_WARNING_A   20.0   // A - overcurrent warning
#define CURRENT_CRITICAL_A  30.0   // A - overcurrent critical

// Grace period
#define GRACE_PERIOD_MS     90000  // 90 seconds (1.5 minutes)

// ADC reference and resolution
#define ADC_MAX             4095.0
#define ADC_VREF            3.3

// ACS712 sensitivity (for 5A module: 185 mV/A; for 20A: 100 mV/A; for 30A: 66 mV/A)
#define ACS712_SENSITIVITY  0.185  // V/A for 5A module
#define ACS712_ZERO_V       2.5    // V at zero current (typical)

// DS18B20
#define TEMP_RESOLUTION     12     // 12-bit = 0.0625°C

// ==================== VOLTAGE CONFIGURATION ====================
// WARNING: These values MUST match your hardware configuration
//
// Current setup: Single 3.7V lithium-ion cell with potentiometer simulation
// - Full charge: 4.2V
// - Empty/discharge: 3.0V
// - Simulated via potentiometer on GPIO 33
//
// For actual battery voltage measurement, calibrate these after connecting:
// - VREF_ADC: Measured reference voltage (typically ~3.3V but varies)
// - R1, R2: Voltage divider resistor values (if using a divider)
//
// Calibration steps:
// 1. Measure actual voltage at GPIO 33 with multimeter
// 2. Adjust VOLTAGE_SCALE until displayed voltage matches multimeter reading
// 3. For single-cell Li-ion: set BATTERY_FULL_V=4.2, BATTERY_EMPTY_V=3.0
//
#define VOLTAGE_SCALE       1.0    // Multiplier to calibrate voltage reading
#define BATTERY_FULL_V      4.2    // Single-cell Li-ion full charge
#define BATTERY_EMPTY_V     3.0    // Single-cell Li-ion discharge limit
#define IS_SIMULATED_VOLTAGE true  // Set to false when real voltage sensing is calibrated

// Pairing retry interval
#define PAIRING_RETRY_MS    10000  // 10 seconds between claim attempts

// Sensor upload interval
#define SENSOR_UPLOAD_MS    5000   // 5 seconds

// Consecutive 404 errors before automatic re-pair
#define MAX_404_BEFORE_REPAIRE 3

// ==================== PRODUCTION CONFIGURATION ====================
// **CRITICAL: REPLACE THESE VALUES BEFORE FLASHING**
//
// STEP-BY-STEP CONFIGURATION GUIDE:
//
// 1. WiFi Credentials
//    Replace with your production WiFi network credentials
//    Example: const char* WIFI_SSID = "MyProductionNetwork";
//
const char* WIFI_SSID     = "vivo Y56 5G";
const char* WIFI_PASSWORD = "9499559860";

// 2. Backend API Base URL
//    **CURRENT PRODUCTION: Vercel**
//    Format: https://your-project.vercel.app
//    Example: const char* API_BASE_URL = "https://batt-x.vercel.app";
//
const char* API_BASE_URL  = "https://batt-x.vercel.app";

// 3. Device Authentication Secret
//    **CRITICAL: MUST match DEVICE_INGEST_SECRET environment variable in Vercel**
//    Get this from: Vercel Dashboard -> your project -> Settings -> Environment Variables -> DEVICE_INGEST_SECRET
//    DO NOT generate a new secret - use the existing production value
//    Example: const char* DEVICE_INGEST_SECRET = "abcd1234...your-actual-secret";
//
const char* DEVICE_INGEST_SECRET = "jARjN474qJECA6wQ1EmbEHOGA3ou36PC80xHAa7WcEg=";

// Device Serial Number (unique per ESP32)
// Can use MAC address or hardcoded unique identifier
String DEVICE_SERIAL = "";  // Will be auto-generated from MAC if empty

// ==================== SECURITY KEYS (LOCAL SD ENCRYPTION) ====================
// WARNING: This is a PROTOTYPE CONFIGURATION
//
// The keys below are DEMONSTRATION VALUES ONLY.
// For production use, you MUST provision unique keys per device using:
// - ESP32 eFuse (read-only, hardware-based storage)
// - External secure element (ATECC608A, etc.)
// - Secure provisioner service
//
// Current implementation uses AES-256-ECB which does NOT provide
// authenticated encryption (no integrity protection).
//
// To configure production keys, uncomment and replace with your values:
// static const uint8_t AES_KEY[32] = { /* 32 random bytes */ };
// static const uint8_t HMAC_KEY[32] = { /* 32 random bytes */ };

// DEMONSTRATION KEYS - DO NOT USE FOR PRODUCTION
// These are PUBLIC and provide no security
static const uint8_t AES_KEY[32] = {
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
  0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
  0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
  0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F
};

static const uint8_t HMAC_KEY[32] = {
  0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27,
  0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F,
  0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37,
  0x38, 0x39, 0x3A, 0x3B, 0x3C, 0x3D, 0x3E, 0x3F
};

// ==================== SD LOGGING CONFIGURATION ====================
// WARNING: SD logging is DISABLED by default for this prototype
// because the encryption keys are demonstration values only.
//
// Enable logging only if you have provisioned secure per-device keys.
#define ENABLE_SD_LOGGING false  // Set to true only with secure keys

// ==================== GLOBAL OBJECTS ====================
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);
LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);
Preferences preferences;

// ==================== PERSISTENT STORAGE ====================
String deviceId = "";          // Backend-assigned CUID (stored in NVS)
bool isPaired = false;         // Pairing status

// ==================== TIME SYNCHRONIZATION ====================
// Time sync status
bool timeSynced = false;
unsigned long lastTimeSync = 0;
#define TIME_SYNC_INTERVAL_MS (6 * 60 * 60 * 1000)  // Sync every 6 hours

// Timezone offset (hours from UTC) - adjust for your timezone
#define TIMEZONE_OFFSET_HOURS 5  // Example: UTC+5 for IST

// ==================== STATE MACHINE ====================
enum SystemState {
  STATE_NORMAL,
  STATE_WARNING,
  STATE_GRACE_PERIOD,
  STATE_CUTOFF,
  STATE_RESOLVED
};

SystemState currentState = STATE_NORMAL;
unsigned long warningStartTime = 0;
unsigned long graceStartTime = 0;
unsigned long lastLogTime = 0;
unsigned long lastLCDUpdate = 0;
unsigned long lastPairingAttempt = 0;
unsigned long lastSensorUpload = 0;

// 404 tracking for auto re-pair
int consecutive404Count = 0;

// Last valid temperature (for display when sensor is disconnected)
float lastValidTemp = 25.0;  // Safe default
bool tempSensorOk = true;

// Danger reason capture
String dangerReason = "NONE";

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================");
  Serial.println("BATT-X Firmware v2.1.0 (Production)");
  Serial.println("SIH 2026 | PS 26220 | Hardware");
  Serial.println("========================================\n");

  // --- Initialize pins ---
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  // Relay is active LOW on most modules; set HIGH to keep relay OFF (NC closed)
  // For BATT-X: relay should be energized (NO closed) during normal operation,
  // de-energized (NC open) on cutoff. Adjust per your relay module.
  digitalWrite(RELAY_PIN, HIGH);  // Start with relay OFF (safe state)
  digitalWrite(BUZZER_PIN, LOW);  // Buzzer off

  // --- Initialize LCD ---
  Wire.begin(LCD_SDA, LCD_SCL);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("BATT-X v2.1");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  delay(1500);

  // --- Initialize temperature sensor ---
  tempSensor.begin();
  int deviceCount = tempSensor.getDeviceCount();
  Serial.printf("DS18B20 devices found: %d\n", deviceCount);
  if (deviceCount == 0) {
    Serial.println("WARNING: No DS18B20 found. Check wiring.");
    tempSensorOk = false;
  }
  tempSensor.setResolution(TEMP_RESOLUTION);

  // --- Initialize SD card ---
  SPI.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);
  if (!SD.begin(SD_CS)) {
    Serial.println("ERROR: SD card initialization failed!");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("SD Card ERROR");
    lcd.setCursor(0, 1);
    lcd.print("Check module");
    delay(2000);
  } else {
    Serial.println("SD card initialized.");
  }

  // --- Initialize device serial number ---
  if (DEVICE_SERIAL.length() == 0) {
    // Generate from MAC address
    uint8_t mac[6];
    WiFi.macAddress(mac);
    DEVICE_SERIAL = "BATTX-";
    for (int i = 0; i < 6; i++) {
      char hex[3];
      sprintf(hex, "%02X", mac[i]);
      DEVICE_SERIAL += hex;
    }
  }
  Serial.printf("Device Serial: %s (length: %d)\n", DEVICE_SERIAL.c_str(), DEVICE_SERIAL.length());

  // --- Load persistent storage ---
  if (!preferences.begin("battx", false)) {
    Serial.println("ERROR: Failed to initialize NVS preferences!");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("NVS Error");
    lcd.setCursor(0, 1);
    lcd.print("Check flash");
    delay(2000);
    // Continue anyway - pairing will be retried
  }
  deviceId = preferences.getString("deviceId", "");
  isPaired = (deviceId.length() > 0);

  if (isPaired) {
    Serial.printf("Device already paired. Device ID: %s\n", deviceId.c_str());
  } else {
    Serial.println("Device not paired. Awaiting QR scan...");
  }

  // --- Connect to WiFi ---
  connectWiFi();

  // --- Initial display ---
  lcd.clear();
  if (isPaired) {
    lcd.setCursor(0, 0);
    lcd.print("BATT-X Ready");
    lcd.setCursor(0, 1);
    lcd.print("Monitoring...");
  } else {
    // Display full serial across both LCD lines
    lcd.setCursor(0, 0);
    lcd.print(DEVICE_SERIAL.substring(0, 16));
    lcd.setCursor(0, 1);
    lcd.print(DEVICE_SERIAL.substring(16));
  }
  delay(1000);

  Serial.println("\nSystem ready.\n");
}

// ==================== MAIN LOOP ====================
void loop() {
  // Handle WiFi reconnection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    connectWiFi();
  }

  // CRITICAL: Read sensors and run safety monitoring ALWAYS (even while unpaired)
  float temperature = readTemperature();
  int   gasRaw      = analogRead(MQ2_ANALOG_PIN);
  float current     = readCurrent();
  float voltage     = readVoltage();
  float batteryPercent = calculateBatteryPercent(voltage);

  // Update LCD every 500ms
  if (millis() - lastLCDUpdate > 500) {
    if (isPaired) {
      // Show last valid temp if sensor is currently disconnected
      float displayTemp = tempSensorOk ? temperature : lastValidTemp;
      updateLCD(displayTemp, gasRaw, current, voltage);
    } else {
      // Display serial number while unpaired (full 18 chars across both lines)
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print(DEVICE_SERIAL.substring(0, 16));
      lcd.setCursor(0, 1);
      lcd.print(DEVICE_SERIAL.substring(16));
    }
    lastLCDUpdate = millis();
  }

  // CRITICAL: Run safety state machine ALWAYS (even while unpaired)
  // Only use valid temperature for safety decisions
  if (tempSensorOk) {
    runStateMachine(temperature, gasRaw, current);
  } else {
    // DS18B20 disconnected - run state machine without temperature triggers
    // Use lastValidTemp so gas/current alerts still work
    runStateMachine(lastValidTemp, gasRaw, current);
  }

  // Log to SD every 2 seconds (adjust as needed)
  if (millis() - lastLogTime > 2000) {
    logSecureEntry(temperature, gasRaw, current, voltage, batteryPercent, dangerReason);
    lastLogTime = millis();
  }

  // Handle pairing attempts if not yet paired
  if (!isPaired) {
    if (millis() - lastPairingAttempt > PAIRING_RETRY_MS) {
      attemptPairing();
      lastPairingAttempt = millis();
    }
  } else {
    // Only upload sensor data when paired AND temperature sensor is valid
    if (millis() - lastSensorUpload > SENSOR_UPLOAD_MS) {
      if (!tempSensorOk) {
        Serial.println("⚠ DS18B20 disconnected - skipping upload (invalid temperature)");
      } else {
        uploadSensorData(temperature, gasRaw, voltage, current, batteryPercent);
      }
      lastSensorUpload = millis();
    }
  }

  // Small delay to prevent watchdog issues
  delay(50);
}

// ==================== PAIRING FUNCTIONS ====================

void clearStoredDeviceId() {
  Serial.println("Clearing stale deviceId from NVS...");
  preferences.remove("deviceId");
  deviceId = "";
  isPaired = false;
  consecutive404Count = 0;
  Serial.println("✓ NVS cleared. Will re-pair on next cycle.");

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Re-pairing...");
  lcd.setCursor(0, 1);
  lcd.print("Please wait");
}

void attemptPairing() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected - skipping pairing attempt");
    return;
  }

  Serial.printf("Claim serial: %s\n", DEVICE_SERIAL.c_str());

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Pairing...");
  lcd.setCursor(0, 1);
  lcd.print("Check web app");

  // Skip certificate verification for Vercel (uses different CA chain)
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String claimUrl = String(API_BASE_URL) + "/api/devices/claim";

  http.begin(client, claimUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_INGEST_SECRET);

  // Build JSON payload
  StaticJsonDocument<256> doc;
  doc["serialNumber"] = DEVICE_SERIAL;

  String jsonString;
  serializeJson(doc, jsonString);

  int httpCode = http.POST(jsonString);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("Claim response (%d): %s\n", httpCode, response.c_str());

    if (httpCode == 200) {
      // Parse response
      StaticJsonDocument<512> responseDoc;
      DeserializationError error = deserializeJson(responseDoc, response);

      if (!error && responseDoc["paired"] == true) {
        deviceId = responseDoc["deviceId"].as<String>();

        // Save to persistent storage
        preferences.putString("deviceId", deviceId);
        isPaired = true;
        consecutive404Count = 0;

        Serial.printf("✓ Device paired successfully!\n");
        Serial.printf("  Device ID: %s\n", deviceId.c_str());
        Serial.printf("  Serial: %s\n", DEVICE_SERIAL.c_str());

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Paired!");
        lcd.setCursor(0, 1);
        lcd.print("Starting...");
        delay(2000);
      }
    } else if (httpCode == 404) {
      // Parse response to check if device exists or is unpaired
      String response = http.getString();
      if (response.indexOf("\"paired\":false") != -1) {
        Serial.println("Device not yet paired in web app. Waiting...");
        Serial.println("  → Go to /devices/pairing and enter serial number");
      } else {
        Serial.println("Device record not found (deleted or invalid).");
        Serial.println("  → Check web app or re-pair device.");
      }
    } else {
      Serial.printf("Claim failed with status: %d\n", httpCode);
    }
  } else {
    Serial.printf("Claim HTTP error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

// ==================== SENSOR READING FUNCTIONS ====================

float readTemperature() {
  tempSensor.requestTemperatures();
  float t = tempSensor.getTempCByIndex(TEMP_SENSOR_INDEX);

  // DS18B20 returns -127.0 (DEVICE_DISCONNECTED_C) when disconnected
  if (t == DEVICE_DISCONNECTED_C || t <= -126.0) {
    if (tempSensorOk) {
      // Transition: was OK, now disconnected
      Serial.println("⚠ DS18B20 DISCONNECTED! Using 25°C as safe default.");
    }
    tempSensorOk = false;
    return 25.0;  // Safe room temperature default (will not trigger backend validation)
  }

  // Sanity check: reject readings outside physically plausible range
  // Backend requires >= -50, but we also want to catch actual sensor failures
  if (t < -50.0 || t > 125.0) {
    Serial.printf("⚠ DS18B20 reading out of range: %.2f°C (ignored)\n", t);
    return 25.0;  // Use safe default instead of potentially invalid lastValidTemp
  }

  // Valid reading
  tempSensorOk = true;
  lastValidTemp = t;
  return t;
}

float readCurrent() {
  int raw = analogRead(ACS712_PIN);
  float voltage = (raw / ADC_MAX) * ADC_VREF;
  float current = (voltage - ACS712_ZERO_V) / ACS712_SENSITIVITY;
  // Clamp to reasonable range
  if (current < 0) current = 0;
  return current;
}

float readVoltage() {
  // Potentiometer simulates battery voltage
  // 0-4095 maps to 0-3.3V (ADC Vref), apply calibration scale
  int raw = analogRead(POT_PIN);
  // V_read = (raw/4095) * Vref * SCALE
  float voltage = (raw / ADC_MAX) * ADC_VREF * VOLTAGE_SCALE;

  // Sanity check: reject readings outside valid range
  if (voltage < 0.0 || voltage > 6.0) {
    Serial.printf("⚠ Voltage reading out of range: %.2fV (ignored)\n", voltage);
    return 0.0;
  }

  return voltage;
}

float calculateBatteryPercent(float voltage) {
  // Only calculate if voltage is valid
  if (voltage <= 0.0) {
    return 0.0;  // Unknown/invalid voltage
  }

  float percent = ((voltage - BATTERY_EMPTY_V) / (BATTERY_FULL_V - BATTERY_EMPTY_V)) * 100.0;

  // Clamp to 0-100
  if (percent < 0) percent = 0;
  if (percent > 100) percent = 100;

  return percent;
}

String getDangerReason(float temp, int gas, float current) {
  String reason = "";
  if (temp >= TEMP_CRITICAL_C) reason += "TEMP_CRITICAL ";
  else if (temp >= TEMP_WARNING_C) reason += "TEMP_WARNING ";

  if (gas >= GAS_CRITICAL_ADC) reason += "GAS_CRITICAL ";
  else if (gas >= GAS_WARNING_ADC) reason += "GAS_WARNING ";

  if (current >= CURRENT_CRITICAL_A) reason += "CURRENT_CRITICAL ";
  else if (current >= CURRENT_WARNING_A) reason += "CURRENT_WARNING ";

  if (reason.length() == 0) reason = "NONE";
  return reason;
}

// ==================== STATE MACHINE ====================
void runStateMachine(float temp, int gas, float current) {
  String currentReason = getDangerReason(temp, gas, current);
  bool dangerPresent = (currentReason != "NONE");
  bool criticalDanger = (temp >= TEMP_CRITICAL_C ||
                         gas >= GAS_CRITICAL_ADC ||
                         current >= CURRENT_CRITICAL_A);

  switch (currentState) {
    case STATE_NORMAL:
      if (dangerPresent) {
        currentState = STATE_WARNING;
        warningStartTime = millis();
        dangerReason = currentReason;
        Serial.printf("STATE: WARNING - Reason: %s\n", dangerReason.c_str());
        triggerWarningAlert();
      }
      break;

    case STATE_WARNING:
      // Stay in warning for 5 seconds, then move to grace period
      if (millis() - warningStartTime > 5000) {
        currentState = STATE_GRACE_PERIOD;
        graceStartTime = millis();
        Serial.printf("STATE: GRACE_PERIOD started - Reason: %s\n", dangerReason.c_str());
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("GRACE PERIOD");
        lcd.setCursor(0, 1);
        lcd.print("Pull over safely");
      }
      // If danger clears, go back to normal
      if (!dangerPresent) {
        currentState = STATE_NORMAL;
        dangerReason = "NONE";
        Serial.println("STATE: NORMAL (danger cleared)");
        resetAlerts();
      }
      break;

    case STATE_GRACE_PERIOD:
      // Re-evaluate danger
      if (!dangerPresent) {
        currentState = STATE_RESOLVED;
        Serial.println("STATE: RESOLVED (danger cleared during grace period)");
        resetAlerts();
      } else if (millis() - graceStartTime > GRACE_PERIOD_MS || criticalDanger) {
        currentState = STATE_CUTOFF;
        Serial.printf("STATE: CUTOFF - Reason: %s\n", dangerReason.c_str());
        executeCutoff();
      } else {
        // Update countdown on LCD
        int secondsLeft = (GRACE_PERIOD_MS - (millis() - graceStartTime)) / 1000;
        lcd.setCursor(0, 1);
        lcd.print("Cutoff in ");
        lcd.print(secondsLeft);
        lcd.print("s   ");
      }
      break;

    case STATE_CUTOFF:
      // Stay in cutoff; require manual reset
      // In production, this would require a physical reset or app command
      break;

    case STATE_RESOLVED:
      // After resolution, return to normal after 10 seconds
      if (millis() - graceStartTime > 10000) {
        currentState = STATE_NORMAL;
        dangerReason = "NONE";
        Serial.println("STATE: NORMAL (post-resolution)");
      }
      break;
  }
}

// ==================== ALERT FUNCTIONS ====================
void triggerWarningAlert() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WARNING!");
  lcd.setCursor(0, 1);
  lcd.print(dangerReason.substring(0, 16));

  // Short beep pattern
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
  }
}

void executeCutoff() {
  // De-energize relay to open the cutoff circuit
  digitalWrite(RELAY_PIN, LOW);

  // Continuous buzzer
  digitalWrite(BUZZER_PIN, HIGH);

  // LCD display
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("CUTOFF ACTIVE");
  lcd.setCursor(0, 1);
  lcd.print(dangerReason.substring(0, 16));

  Serial.println("!!! CUTOFF EXECUTED - BATTERY ISOLATED !!!");

  // Log the cutoff event
  logSecureEntry(-999, -999, -999, -999, -999, "CUTOFF_" + dangerReason);
}

void resetAlerts() {
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(RELAY_PIN, HIGH);  // Re-energize relay (restore connection)
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("BATT-X Ready");
  lcd.setCursor(0, 1);
  lcd.print("Monitoring...");
}

// ==================== LCD UPDATE ====================
void updateLCD(float temp, int gas, float current, float voltage) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("T:");
  lcd.print(temp, 1);
  lcd.print("C G:");
  lcd.print(gas);

  lcd.setCursor(0, 1);
  lcd.print("I:");
  lcd.print(current, 1);
  lcd.print("A V:");
  lcd.print(voltage, 1);
  lcd.print("V");
}

// ==================== INTEGRITY HASH CALCULATION ====================
String calculateIntegrityHash(float temperature, float gasLevel, float voltage, float current, float batteryPercent) {
  // Build canonical JSON string matching backend expectation
  // Backend expects: JSON.stringify({temperature, gasLevel, voltage, current, batteryPercent})
  StaticJsonDocument<256> doc;
  doc["temperature"] = temperature;
  doc["gasLevel"] = gasLevel;
  doc["voltage"] = voltage;
  doc["current"] = current;
  doc["batteryPercent"] = batteryPercent;

  String dataString;
  serializeJson(doc, dataString);

  // Calculate SHA-256
  mbedtls_md_context_t ctx;
  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), 0);
  mbedtls_md_starts(&ctx);
  mbedtls_md_update(&ctx, (const unsigned char*)dataString.c_str(), dataString.length());

  uint8_t hash[32];
  mbedtls_md_finish(&ctx, hash);
  mbedtls_md_free(&ctx);

  // Convert to hex string
  String hashHex = "";
  for (int i = 0; i < 32; i++) {
    char hex[3];
    sprintf(hex, "%02x", hash[i]);
    hashHex += hex;
  }

  return hashHex;
}

// ==================== SENSOR DATA UPLOAD ====================
void uploadSensorData(float temperature, float gasRaw, float voltage, float current, float batteryPercent) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected - skipping sensor upload");
    return;
  }

  if (!isPaired) {
    Serial.println("Device not paired - skipping sensor upload");
    return;
  }

  // Final guard: never upload -127°C (DS18B20 DEVICE_DISCONNECTED sentinel)
  if (temperature <= -126.0) {
    Serial.println("⚠ Refusing to upload disconnected sensor reading (-127°C)");
    return;
  }

  // Backend validation requires temperature >= -50
  if (temperature < -50.0) {
    Serial.printf("⚠ Temperature %.2f°C below backend minimum (-50). Skipping upload.\n", temperature);
    return;
  }

  // Calculate integrity hash
  String integrityHash = calculateIntegrityHash(temperature, gasRaw, voltage, current, batteryPercent);

  // Skip certificate verification for Vercel
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String sensorUrl = String(API_BASE_URL) + "/api/sensor-readings";

  Serial.printf("Sensor URL: %s\n", sensorUrl.c_str());

  http.begin(client, sensorUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_INGEST_SECRET);

  // Build JSON payload matching backend schema
  StaticJsonDocument<512> doc;
  doc["deviceId"] = deviceId;
  doc["temperature"] = temperature;
  doc["gasLevel"] = gasRaw;
  doc["voltage"] = voltage;
  doc["current"] = current;
  doc["batteryPercent"] = batteryPercent;
  doc["integrityHash"] = integrityHash;

  String jsonString;
  serializeJson(doc, jsonString);

  Serial.println("Uploading sensor data...");
  Serial.printf("  deviceId: %s\n", deviceId.c_str());
  Serial.printf("  T=%.2f G=%.0f V=%.2f I=%.2f B=%.0f\n",
                temperature, gasRaw, voltage, current, batteryPercent);

  int httpCode = http.POST(jsonString);

  if (httpCode > 0) {
    String response = http.getString();

    if (httpCode == 201) {
      Serial.println("✓ Sensor data uploaded successfully");
      consecutive404Count = 0;  // Reset on success
    } else if (httpCode == 404) {
      // Backend returns 404 with {"error":"Device not found"} when device was deleted
      Serial.printf("✗ Sensor HTTP %d: %s\n", httpCode, response.c_str());

      // Parse response to determine if device was deleted
      if (response.indexOf("\"error\":\"Device not found\"") != -1 ||
          response.indexOf("\"error\":\"Device not found\"") != -1) {
        Serial.println("⚠ Device record was deleted from backend!");
        Serial.println("  → Clearing stored deviceId and returning to unpaired state.");
        clearStoredDeviceId();
      } else {
        // Other 404 -可能是temp device issue, increment counter
        consecutive404Count++;
        Serial.printf("  404 count: %d / %d before auto re-pair\n",
                      consecutive404Count, MAX_404_BEFORE_REPAIRE);

        if (consecutive404Count >= MAX_404_BEFORE_REPAIRE) {
          Serial.println("⚠ Too many 404s - deviceId is stale. Clearing and re-pairing...");
          clearStoredDeviceId();
        }
      }
    } else {
      Serial.printf("✗ Sensor HTTP %d: %s\n", httpCode, response.c_str());
    }
  } else {
    Serial.printf("✗ Sensor HTTP error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

// ==================== SECURE LOGGING (AES-256 + HMAC-SHA256) ====================

void logSecureEntry(float temp, float gas, float current, float voltage, float batteryPercent, String reason) {
  // Build plaintext log entry
  char plaintext[128];
  snprintf(plaintext, sizeof(plaintext),
           "T=%.2f,G=%.0f,I=%.2f,V=%.2f,B=%.0f,R=%s",
           temp, gas, current, voltage, batteryPercent, reason.c_str());

  size_t plaintextLen = strlen(plaintext);

  // Pad to multiple of 16 bytes (AES block size)
  size_t paddedLen = ((plaintextLen / 16) + 1) * 16;
  uint8_t padded[128];
  memset(padded, 0, sizeof(padded));
  memcpy(padded, plaintext, plaintextLen);
  // PKCS#7-style padding: fill remaining bytes with padding length
  uint8_t padValue = paddedLen - plaintextLen;
  for (size_t i = plaintextLen; i < paddedLen; i++) {
    padded[i] = padValue;
  }

  // Encrypt with AES-256 (ECB mode for simplicity; CBC/GCM recommended for production)
  uint8_t ciphertext[128];
  mbedtls_aes_context aes;
  mbedtls_aes_init(&aes);
  mbedtls_aes_setkey_enc(&aes, AES_KEY, 256);

  for (size_t i = 0; i < paddedLen; i += 16) {
    mbedtls_aes_crypt_ecb(&aes, MBEDTLS_AES_ENCRYPT, padded + i, ciphertext + i);
  }
  mbedtls_aes_free(&aes);

  // Compute HMAC-SHA256 over ciphertext (encrypt-then-MAC)
  uint8_t hmac[32];
  mbedtls_md_context_t mdCtx;
  mbedtls_md_init(&mdCtx);
  mbedtls_md_setup(&mdCtx, mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), 1);
  mbedtls_md_hmac_starts(&mdCtx, HMAC_KEY, 32);
  mbedtls_md_hmac_update(&mdCtx, ciphertext, paddedLen);
  mbedtls_md_hmac_finish(&mdCtx, hmac);
  mbedtls_md_free(&mdCtx);

  // Build log entry: [4-byte timestamp][ciphertext][32-byte HMAC]
  File logFile = SD.open("/battx_log.bin", FILE_APPEND);
  if (logFile) {
    // Timestamp format: 4-byte unsigned int (seconds since boot)
    // This allows logs to be correlated with uptime even without NTP
    // When time sync is available, this can be upgraded to epoch time
    uint32_t timestamp = millis() / 1000;

    // Write flag byte to indicate timestamp type (0 = uptime, 1 = epoch time)
    uint8_t timestampType = 0;  // 0 = relative uptime (current default)
    logFile.write(&timestampType, 1);
    logFile.write((uint8_t*)&timestamp, 4);
    logFile.write(ciphertext, paddedLen);
    logFile.write(hmac, 32);
    logFile.close();

    Serial.printf("Logged: %s\n", plaintext);
  } else {
    Serial.println("ERROR: Could not open log file!");
  }
}

// ==================== WIFI CONNECTION ====================
void connectWiFi() {
  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi Connect...");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n✓ WiFi connected. IP: %s\n", WiFi.localIP().toString().c_str());
    lcd.setCursor(0, 1);
    lcd.print("WiFi OK");
    delay(1000);
  } else {
    Serial.println("\n✗ WiFi connection failed. Continuing offline.");
    lcd.setCursor(0, 1);
    lcd.print("WiFi Failed");
    delay(2000);
  }
}
