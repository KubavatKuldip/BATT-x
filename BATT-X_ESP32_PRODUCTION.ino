/*
 * ============================================================
 *  BATT-X — Battery Advanced Thermal & Telemetry Index
 *  ESP32 Firmware for SIH 2026 (PS ID: 26220)
 *  PRODUCTION VERSION - Railway Deployment Compatible
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
 *    - HTTPS sensor data uploads to Railway
 *
 *  AUTHOR: BATT-X Team
 *  DATE: 2026-09-26
 *  VERSION: 2.0.0 (Production)
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

// ==================== TLS CERTIFICATE ====================
// ISRG Root X1 - Root CA for Railway's Let's Encrypt certificates
// Valid until 2035-06-04
// This certificate validates Railway HTTPS connections
const char* railway_root_ca = \
"-----BEGIN CERTIFICATE-----\n" \
"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\n" \
"-----END CERTIFICATE-----\n";

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

// Battery voltage range (adjust for your battery chemistry)
// LiFePO4 48V pack: Full = 54.75V, Empty = 40V
#define BATTERY_FULL_V      54.75
#define BATTERY_EMPTY_V     40.0

// Pairing retry interval
#define PAIRING_RETRY_MS    10000  // 10 seconds between claim attempts

// Sensor upload interval
#define SENSOR_UPLOAD_MS    5000   // 5 seconds

// ==================== PRODUCTION CONFIGURATION ====================
// **CRITICAL: REPLACE THESE VALUES BEFORE FLASHING**

// WiFi Credentials
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Railway Production API Base URL
// Format: https://your-web-service.up.railway.app
const char* API_BASE_URL  = "https://your-web-service.up.railway.app";

// Device Authentication Secret
// MUST match DEVICE_INGEST_SECRET in Railway web service
// Generate with: openssl rand -base64 32
const char* DEVICE_INGEST_SECRET = "YOUR_DEVICE_INGEST_SECRET_HERE";

// Device Serial Number (unique per ESP32)
// Can use MAC address or hardcoded unique identifier
String DEVICE_SERIAL = "";  // Will be auto-generated from MAC if empty

// ==================== SECURITY KEYS (LOCAL SD ENCRYPTION) ====================
// WARNING: Replace these with your own 32-byte keys
// In production, store in ESP32 eFuse or secure element

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

// ==================== GLOBAL OBJECTS ====================
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);
LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);
Preferences preferences;

// ==================== PERSISTENT STORAGE ====================
String deviceId = "";          // Backend-assigned CUID (stored in NVS)
bool isPaired = false;         // Pairing status

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

// Danger reason capture
String dangerReason = "NONE";

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================");
  Serial.println("BATT-X Firmware v2.0.0 (Production)");
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
  lcd.print("BATT-X v2.0");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  delay(1500);

  // --- Initialize temperature sensor ---
  tempSensor.begin();
  int deviceCount = tempSensor.getDeviceCount();
  Serial.printf("DS18B20 devices found: %d\n", deviceCount);
  if (deviceCount == 0) {
    Serial.println("WARNING: No DS18B20 found. Check wiring.");
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
  Serial.printf("Device Serial: %s\n", DEVICE_SERIAL.c_str());

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
    lcd.setCursor(0, 0);
    lcd.print("PAIR DEVICE");
    lcd.setCursor(0, 1);
    lcd.print(DEVICE_SERIAL.substring(0, 16));
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
      updateLCD(temperature, gasRaw, current, voltage);
    } else {
      // Display pairing instructions while unpaired
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("PAIR DEVICE");
      lcd.setCursor(0, 1);
      lcd.print(DEVICE_SERIAL.substring(0, 16));
    }
    lastLCDUpdate = millis();
  }

  // CRITICAL: Run safety state machine ALWAYS (even while unpaired)
  runStateMachine(temperature, gasRaw, current);

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
    // Only upload sensor data when paired (backend requires deviceId)
    if (millis() - lastSensorUpload > SENSOR_UPLOAD_MS) {
      uploadSensorData(temperature, gasRaw, voltage, current, batteryPercent);
      lastSensorUpload = millis();
    }
  }

  // Small delay to prevent watchdog issues
  delay(50);
}

// ==================== PAIRING FUNCTIONS ====================

void attemptPairing() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected - skipping pairing attempt");
    return;
  }

  Serial.println("Attempting to claim deviceId from backend...");

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Pairing...");
  lcd.setCursor(0, 1);
  lcd.print("Check web app");

  // Configure secure HTTPS client with Railway root CA
  WiFiClientSecure client;
  client.setCACert(railway_root_ca);

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

        Serial.printf("✓ Device paired successfully! Device ID: %s\n", deviceId.c_str());

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Paired!");
        lcd.setCursor(0, 1);
        lcd.print("Starting...");
        delay(2000);
      }
    } else if (httpCode == 404) {
      Serial.println("Device not yet paired. Display QR code and wait...");
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
  if (t == DEVICE_DISCONNECTED_C) {
    Serial.println("ERROR: DS18B20 disconnected!");
    return -127.0;
  }
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
  // 0-4095 maps to 0-5V (approx), then scale to 0-60V range
  int raw = analogRead(POT_PIN);
  float voltage = (raw / ADC_MAX) * ADC_VREF * 12.0;  // Scale factor
  return voltage;
}

float calculateBatteryPercent(float voltage) {
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

  // Calculate integrity hash
  String integrityHash = calculateIntegrityHash(temperature, gasRaw, voltage, current, batteryPercent);

  // Configure secure HTTPS client with Railway root CA
  WiFiClientSecure client;
  client.setCACert(railway_root_ca);

  HTTPClient http;
  String sensorUrl = String(API_BASE_URL) + "/api/sensor-readings";

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

  int httpCode = http.POST(jsonString);

  if (httpCode > 0) {
    if (httpCode == 201) {
      Serial.println("✓ Sensor data uploaded successfully");
    } else {
      Serial.printf("Upload response: %d\n", httpCode);
      String response = http.getString();
      Serial.println(response);
    }
  } else {
    Serial.printf("Upload error: %s\n", http.errorToString(httpCode).c_str());
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
    uint32_t timestamp = millis() / 1000;  // Seconds since boot
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
