# BATT-X Railway Deployment Guide

**Last Updated**: 2026-09-26  
**Platform**: Railway.app

---

## 🚂 OVERVIEW

This guide provides step-by-step instructions to deploy BATT-X on Railway with:
- **Next.js Web Service** (Web UI + API)
- **Socket.io Service** (Real-time WebSocket)
- **PostgreSQL Database** (Railway-managed)

---

## 📋 PREREQUISITES

1. Railway account (https://railway.app)
2. GitHub/GitLab repository with BATT-X code
3. Railway CLI installed (optional): `npm i -g @railway/cli`

---

## 🏗️ ARCHITECTURE

```
┌─────────────────────────────────────────────────┐
│                Railway Project                   │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │  Web Service │  │Socket Service│            │
│  │  (Next.js)   │  │ (Socket.io)  │            │
│  │  Port: 3000  │  │  Port: 3001  │            │
│  └──────┬───────┘  └──────┬───────┘            │
│         │                  │                     │
│         └────────┬─────────┘                    │
│                  │                               │
│         ┌────────▼────────┐                     │
│         │   PostgreSQL    │                     │
│         │    Database     │                     │
│         └─────────────────┘                     │
│                                                  │
└─────────────────────────────────────────────────┘
         │                  │
         ▼                  ▼
    HTTPS/WSS         ESP32 Devices
    Browser Clients   (POST /api/sensor-readings)
```

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Create Railway Project

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your BATT-X repository
5. Railway will create an initial service

### Step 2: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database" → "Add PostgreSQL"**
3. Railway provisions the database automatically
4. **DATABASE_URL** is automatically added as a shared variable

### Step 3: Configure Web Service (Next.js)

#### 3.1 Rename Initial Service
1. Click the initial service
2. Click **Settings**
3. Change name to **"web"**

#### 3.2 Set Build & Start Commands
**In Settings → Deploy:**
- **Build Command**: `npm install && npx prisma generate && npm run build`
- **Start Command**: `npm start`

Or use the provided `railway.web.json` configuration file.

#### 3.3 Add Environment Variables
Click **Variables** tab and add:

```bash
# Authentication (Generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-generated-secret-here
AUTH_TRUST_HOST=true

# Will be set after deployment - use Railway URL
NEXTAUTH_URL=${{RAILWAY_PUBLIC_DOMAIN}}
AUTH_URL=${{RAILWAY_PUBLIC_DOMAIN}}

# ESP32 Device Secret (Generate with: openssl rand -base64 32)
DEVICE_INGEST_SECRET=your-generated-device-secret-here

# Socket.io Configuration (Will be updated in Step 4)
NEXT_PUBLIC_SOCKET_URL=https://your-socket-service.up.railway.app

# Production Settings
NODE_ENV=production
SOCKET_DEMO_MODE=false
```

**Note**: `${{RAILWAY_PUBLIC_DOMAIN}}` is a Railway variable that auto-populates with your service URL.

#### 3.4 Generate Domain
1. In **Settings → Networking**
2. Click **"Generate Domain"**
3. Copy the generated URL (e.g., `batt-x-web-production.up.railway.app`)
4. This is your **NEXTAUTH_URL**

### Step 4: Create Socket.io Service

#### 4.1 Add New Service
1. Click **"+ New"** in your project
2. Select **"Empty Service"**
3. Name it **"socket"**

#### 4.2 Connect to GitHub Repo
1. In Settings → Source
2. Connect to the same GitHub repository
3. Select the same branch as web service

#### 4.3 Set Build & Start Commands
**In Settings → Deploy:**
- **Build Command**: `npm install && npx prisma generate`
- **Start Command**: `node server.js`

Or use the provided `railway.socket.json` configuration file.

#### 4.4 Add Environment Variables
Click **Variables** tab and add:

```bash
# Database (Reference from PostgreSQL service)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Authentication (SAME as web service)
NEXTAUTH_SECRET=same-secret-as-web-service
AUTH_URL=https://your-web-service.up.railway.app

# ESP32 Device Secret (SAME as web service)
DEVICE_INGEST_SECRET=same-device-secret-as-web-service

# Socket.io Configuration
SOCKET_PORT=3001
SOCKET_DEMO_MODE=false
NODE_ENV=production
```

#### 4.5 Expose Public Port
1. In **Settings → Networking**
2. Click **"Generate Domain"**
3. Copy the socket URL (e.g., `batt-x-socket-production.up.railway.app`)

#### 4.6 Update Web Service Socket URL
1. Go back to **web** service
2. Update `NEXT_PUBLIC_SOCKET_URL` variable:
   ```bash
   NEXT_PUBLIC_SOCKET_URL=https://batt-x-socket-production.up.railway.app
   ```
3. Web service will auto-redeploy

### Step 5: Run Database Migrations

#### Option A: Using Railway CLI
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Select the web service
railway service

# Run migrations
railway run npx prisma migrate deploy
```

#### Option B: Temporary Deploy Script
1. In **web** service Settings → Deploy
2. Temporarily change **Start Command** to:
   ```bash
   npx prisma migrate deploy && npm start
   ```
3. Redeploy
4. After successful migration, change back to:
   ```bash
   npm start
   ```

#### Option C: Railway Dashboard
1. In **web** service, click **"Deployments"**
2. Find the latest deployment
3. Click **"View Logs"**
4. Click **"Shell"** (if available)
5. Run: `npx prisma migrate deploy`

### Step 6: Verify Deployment

#### 6.1 Check Web Service
```bash
curl https://your-web-service.up.railway.app/api/users/me
```
**Expected**: `{"error":"Unauthorized. Please sign in."}`  
**Meaning**: API is working, authentication is enforcing

#### 6.2 Check Socket.io Service
```bash
curl https://your-socket-service.up.railway.app
```
**Expected**:
```json
{
  "status": "Socket.io server running",
  "port": 3001,
  "connections": 0,
  "authenticated": true
}
```

#### 6.3 Test Web Application
1. Open: `https://your-web-service.up.railway.app`
2. Should redirect to `/auth/signin`
3. Try demo login: `demo@battx.com` / `demo123`
4. Should redirect to `/dashboard` with real-time sensor data

#### 6.4 Check Logs
**Web Service:**
```bash
railway logs --service web
```

**Socket Service:**
```bash
railway logs --service socket
```

---

## 🔐 ENVIRONMENT VARIABLES SUMMARY

### Required Secrets (Generate Once)
```bash
# Run these commands locally:
openssl rand -base64 32  # NEXTAUTH_SECRET
openssl rand -base64 32  # DEVICE_INGEST_SECRET
```

### Web Service Variables
| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | Auto from Postgres | Shared variable |
| `NEXTAUTH_SECRET` | Generated secret | Same in both services |
| `NEXTAUTH_URL` | `${{RAILWAY_PUBLIC_DOMAIN}}` | Auto-populated |
| `AUTH_URL` | `${{RAILWAY_PUBLIC_DOMAIN}}` | Auto-populated |
| `AUTH_TRUST_HOST` | `true` | Required for Railway |
| `DEVICE_INGEST_SECRET` | Generated secret | Same in both services |
| `NEXT_PUBLIC_SOCKET_URL` | Socket service URL | Update after socket deployed |
| `NODE_ENV` | `production` | |
| `SOCKET_DEMO_MODE` | `false` | Production only |

### Socket Service Variables
| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Reference from Postgres service |
| `NEXTAUTH_SECRET` | Same as web | Must match |
| `AUTH_URL` | Web service URL | For CORS |
| `DEVICE_INGEST_SECRET` | Same as web | Must match |
| `SOCKET_PORT` | `3001` | Internal port |
| `SOCKET_DEMO_MODE` | `false` | Production only |
| `NODE_ENV` | `production` | |

---

## 📡 ESP32 CONFIGURATION

After deployment, configure your ESP32 devices:

### Production API Endpoints
```cpp
// In your ESP32 firmware:
const char* apiUrl = "https://your-web-service.up.railway.app";
const char* sensorEndpoint = "/api/sensor-readings";
const char* deviceSecret = "your-DEVICE_INGEST_SECRET";

// HTTP Headers
headers["Content-Type"] = "application/json";
headers["X-Device-Key"] = deviceSecret;

// POST Request
POST https://your-web-service.up.railway.app/api/sensor-readings
```

### Test ESP32 Connection
```bash
# Simulate ESP32 POST request
curl -X POST https://your-web-service.up.railway.app/api/sensor-readings \
  -H "Content-Type: application/json" \
  -H "X-Device-Key: your-DEVICE_INGEST_SECRET" \
  -d '{
    "deviceId": "test-device-1",
    "temperature": 45.5,
    "voltage": 50.2,
    "current": 5.1,
    "gasLevel": 15,
    "batteryPercent": 85
  }'
```

**Expected**: `{"success":true}`

---

## 🔌 QR DEVICE PAIRING

### Test QR Pairing After Deployment

1. **Generate Pairing Code** (Backend creates QR)
   - In your application, the pairing code is auto-generated
   - ESP32 devices display QR code on OLED/LCD

2. **Scan QR Code**
   - Navigate to: `https://your-web-service.up.railway.app/devices/pairing`
   - Click **"Start Scanning"**
   - Allow camera access
   - Scan the QR code from ESP32 device

3. **Verify Pairing**
   - Device should appear in `/dashboard` device selector
   - Device status shows "Connected" or "Offline"

4. **Test Real-time Data**
   - Navigate to dashboard
   - Select paired device
   - ESP32 sends sensor data → API stores → Socket.io broadcasts
   - Dashboard updates in real-time (every 5 seconds)

---

## 🧪 TESTING REAL-TIME SENSOR DATA

### Manual Test Flow

1. **Open Dashboard**
   ```
   https://your-web-service.up.railway.app/dashboard
   ```

2. **Open Browser Console**
   - Press F12
   - Go to Console tab

3. **Check WebSocket Connection**
   - Should see: `Connected to Socket.io` (in app logs)
   - No WebSocket errors

4. **Send Test Sensor Data** (From ESP32 or curl)
   ```bash
   curl -X POST https://your-web-service.up.railway.app/api/sensor-readings \
     -H "Content-Type: application/json" \
     -H "X-Device-Key: your-DEVICE_INGEST_SECRET" \
     -d '{
       "deviceId": "demo-device-1",
       "temperature": 52.3,
       "voltage": 49.8,
       "current": 7.2,
       "gasLevel": 25,
       "batteryPercent": 75
     }'
   ```

5. **Verify Dashboard Updates**
   - Temperature, voltage, current, gas level, battery should update
   - Status indicators change based on thresholds
   - "Last synced" timestamp updates

### Check Socket.io Logs
```bash
railway logs --service socket
```

Look for:
```
[2026-09-26T...] Client connected: ... (user: demo-user)
[2026-09-26T...] User demo-user subscribed to device:demo-device-1
[2026-09-26T...] Emitted sensor data to 1 client(s) in device:demo-device-1
```

---

## 🔧 TROUBLESHOOTING

### Issue: "Socket.io not connecting"

**Check:**
1. `NEXT_PUBLIC_SOCKET_URL` in web service matches socket service URL
2. Socket service has public domain generated
3. CORS origin in `server.js` matches web service URL
4. Check socket logs: `railway logs --service socket`

**Fix:**
- Ensure `AUTH_URL` in socket service = web service URL
- Regenerate both services if URLs changed

### Issue: "Database connection failed"

**Check:**
1. PostgreSQL service is running
2. `DATABASE_URL` is set in both services
3. Prisma migrations completed

**Fix:**
```bash
railway run npx prisma migrate deploy
```

### Issue: "ESP32 POST returns 403 Forbidden"

**Check:**
1. `X-Device-Key` header matches `DEVICE_INGEST_SECRET`
2. `DEVICE_INGEST_SECRET` is same in both services
3. Secret is at least 16 characters

**Fix:**
- Regenerate `DEVICE_INGEST_SECRET` with: `openssl rand -base64 32`
- Update in both web and socket services
- Update ESP32 firmware

### Issue: "Prisma migrations not running"

**Option 1: Railway Shell**
```bash
railway run npx prisma migrate deploy
```

**Option 2: Temporary Start Command**
In web service:
```bash
npx prisma migrate deploy && npm start
```

### Issue: "Web service won't start"

**Check logs:**
```bash
railway logs --service web --since 1h
```

**Common causes:**
- Missing `NEXTAUTH_SECRET`
- Missing `DATABASE_URL`
- Build failed (check build logs)
- Port already in use (Railway auto-assigns)

---

## 📊 MONITORING

### Health Check Endpoints

**Web Service:**
```bash
curl https://your-web-service.up.railway.app/api/users/me
```

**Socket.io Service:**
```bash
curl https://your-socket-service.up.railway.app
```

### View Logs
```bash
# Web service
railway logs --service web --follow

# Socket service
railway logs --service socket --follow

# All services
railway logs --follow
```

### Metrics
Railway provides:
- CPU usage
- Memory usage
- Network traffic
- Deployment history
- Error rates

Access in Railway dashboard → Service → Metrics

---

## 🔄 UPDATING DEPLOYMENT

### Automatic Deployments
Railway auto-deploys on git push to connected branch.

### Manual Redeploy
1. In Railway dashboard
2. Select service
3. Click **"Deployments"**
4. Click **"Redeploy"** on any deployment

### Rolling Back
1. In Railway dashboard
2. Select service
3. Click **"Deployments"**
4. Find previous successful deployment
5. Click **"Redeploy"**

---

## 💰 COST ESTIMATION

**Railway Pricing** (as of 2026):
- **Free Tier**: $5/month credit (500 hours)
- **Pro Plan**: $20/month + usage

**BATT-X Usage:**
- Web Service: ~$5-10/month
- Socket Service: ~$5-10/month
- PostgreSQL: ~$5/month
- **Total**: ~$15-25/month (Pro plan)

---

## ✅ POST-DEPLOYMENT CHECKLIST

- [ ] Web service deployed and accessible
- [ ] Socket.io service deployed and accessible
- [ ] PostgreSQL database running
- [ ] Prisma migrations completed successfully
- [ ] Environment variables set correctly
- [ ] Health check endpoints returning 200
- [ ] Web UI loads and authentication works
- [ ] Socket.io connects (check browser console)
- [ ] Real-time sensor data updates dashboard
- [ ] QR device pairing functional
- [ ] ESP32 can POST to /api/sensor-readings
- [ ] HTTPS enabled on web service
- [ ] WSS enabled on socket service
- [ ] CORS configured correctly
- [ ] Logs show no errors

---

## 📞 SUPPORT

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **BATT-X Issues**: [Your GitHub Issues]

---

**Deployment Guide Version**: 1.0  
**Last Updated**: 2026-09-26  
**Platform**: Railway.app
