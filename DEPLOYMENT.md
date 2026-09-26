# Production Deployment Guide

**Platform**: Any Node.js hosting platform (Vercel, Railway, Render, etc.)

## Prerequisites

1. PostgreSQL database (v12+)
2. Node.js 18+ runtime
3. Two separate processes or services:
   - Next.js web server (port 3000)
   - Socket.io server (port 3001 or configured)

---

## Environment Variables

Create these in your production environment:

### Required (Critical)
```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Authentication (Generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="[32-byte-base64-random-string]"
NEXTAUTH_URL="https://yourdomain.com"
AUTH_URL="https://yourdomain.com"
AUTH_TRUST_HOST=true

# ESP32 Device Authentication (Generate with: openssl rand -base64 32)
DEVICE_INGEST_SECRET="[32-byte-base64-random-string]"
```

### Socket.io Configuration
```bash
SOCKET_PORT=3001
NEXT_PUBLIC_SOCKET_URL="https://yourdomain.com:3001"  # or wss://socket.yourdomain.com
SOCKET_DEMO_MODE=false  # MUST be false in production
```

### Optional
```bash
NODE_ENV=production
```

---

## Deployment Steps

### 1. Install Dependencies
```bash
npm install --production=false
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Run Database Migrations
```bash
npx prisma migrate deploy
```

### 4. Build Next.js Application
```bash
npm run build
```

### 5. Start Production Servers

**Option A: Single Command (using concurrently)**
```bash
npm run start:prod
```

**Option B: Separate Processes**
```bash
# Terminal 1: Next.js
npm start

# Terminal 2: Socket.io
node server.js
```

---

## Platform-Specific Notes

### Vercel
- Vercel runs Next.js automatically
- Deploy Socket.io server separately (Railway, Render, etc.)
- Set `NEXT_PUBLIC_SOCKET_URL` to your Socket.io server URL
- Add all environment variables in Vercel dashboard

### Railway
- Create two services:
  1. Web service: `npm run build && npm start`
  2. Socket service: `node server.js`
- Both services can share the same DATABASE_URL
- Expose Socket.io port publicly
- Set `NEXT_PUBLIC_SOCKET_URL` to Socket.io service public URL

### Render
- Create two web services:
  1. Next.js: Build=`npm run build`, Start=`npm start`
  2. Socket.io: Build=`npm install`, Start=`node server.js`
- Add PostgreSQL database
- Configure environment variables in Render dashboard

### Docker
```dockerfile
# Dockerfile.web (Next.js)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]

# Dockerfile.socket (Socket.io)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY server.js ./
COPY prisma ./prisma
RUN npx prisma generate
EXPOSE 3001
CMD ["node", "server.js"]
```

---

## Security Checklist

- [ ] `NEXTAUTH_SECRET` is strong random value (32+ bytes)
- [ ] `DEVICE_INGEST_SECRET` is strong random value (32+ bytes)
- [ ] `SOCKET_DEMO_MODE=false` in production
- [ ] Database has strong password
- [ ] HTTPS enabled for web server
- [ ] WSS (secure WebSocket) enabled for Socket.io in production
- [ ] `.env` file NOT committed to git
- [ ] CORS configured correctly in server.js
- [ ] Database connection pool limits configured

---

## Health Checks

### Next.js Web Server
```bash
curl https://yourdomain.com/api/users/me
# Should return 401 Unauthorized (auth working)
```

### Socket.io Server
```bash
curl http://yourdomain.com:3001
# Should return: {"status":"Socket.io server running",...}
```

### Database
```bash
npx prisma db pull
# Should connect successfully
```

---

## Troubleshooting

### Socket.io Not Connecting
- Check `NEXT_PUBLIC_SOCKET_URL` matches Socket.io server URL
- Verify Socket.io port is publicly accessible
- Check CORS origin in server.js matches NEXTAUTH_URL
- Enable WSS for production (not HTTP)

### Demo Login Not Working in Production
- Expected behavior: Demo login disabled in production
- Use real user accounts created via signup

### Database Connection Errors
- Verify DATABASE_URL format
- Check firewall rules allow connection
- Ensure database accepts external connections

### TypeScript Build Warnings
- `ignoreBuildErrors: true` is set in next.config.js
- This is intentional for NextAuth v5 beta compatibility
- Does not affect runtime functionality

---

## Monitoring

Recommended monitoring:
- Database connection pool usage
- Socket.io active connections
- API response times
- ESP32 device connection status
- Alert delivery (email/SMS/push)

---

## Scaling

- Next.js: Scale horizontally (multiple instances behind load balancer)
- Socket.io: Use Redis adapter for multi-instance support
- Database: Connection pooling (PgBouncer recommended)
- Consider CDN for static assets
