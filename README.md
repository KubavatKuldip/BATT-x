# BATT-X | EV Battery Safety Monitor

A production-ready, mobile-first IoT dashboard web application for monitoring electric vehicle battery safety and charging health.

## 🎯 Features

### ✅ Implemented

- **Live Dashboard** - Real-time sensor monitoring with claymorphic design
  - Temperature, Voltage, Current, Gas Level, Battery Percentage
  - Animated circular battery indicator
  - Connection status tracking
  - Grace period countdown for warnings
  - Auto-refresh and manual sync

- **Alerts System** - Comprehensive alert management
  - Search and filter alerts by type
  - Expandable alert cards with sensor snapshots
  - Alert history with timestamps and locations
  - Visual status indicators (Warning, Cutoff, Resolved)

- **Analytics** - Data visualization and charge history
  - Interactive charts (Battery %, Temperature, Voltage trends)
  - Charging session tracking
  - Data integrity verification badges
  - PDF and CSV export capabilities
  - Date range filtering (7d, 30d, custom)

- **Location Tracking** - GPS integration ready
  - Map view placeholder (ready for Leaflet/Mapbox)
  - Recent location history
  - Alert location tagging

- **Settings** - Complete device and preference management
  - Device information display
  - Notification preferences (Push, Email, SMS)
  - Theme toggle (Light/Dark mode)
  - Alert threshold configuration
  - Multi-language support (English, Hindi, Spanish)
  - Firmware update checking

- **Responsive Navigation**
  - Desktop: Sidebar navigation
  - Mobile: Bottom navigation bar
  - Seamless responsive design (375px to 4K)

- **Design System**
  - Premium Minimalism + Professional Claymorphism
  - Subtle shadows with 4 depth levels (0-3)
  - Consistent spacing, typography, and color palette
  - Dark/Light mode with intentional design
  - Accessible focus states and ARIA labels

## 🛠 Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom claymorphism tokens
- **UI Components**: Radix UI primitives + custom components
- **State Management**: Zustand
- **Data Fetching**: React Query (TanStack Query)
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Database**: PostgreSQL + Prisma ORM (schema ready)
- **Theme**: next-themes

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd "BATT-X web"

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client
npm run prisma:generate

# Run database migrations (when DB is set up)
npm run prisma:push

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

## 🗂 Project Structure

```
BATT-X web/
├── app/
│   ├── dashboard/          # Main dashboard page
│   ├── alerts/            # Alerts management page
│   ├── analytics/         # Analytics and charts page
│   ├── location/          # Location tracking page
│   ├── settings/          # Settings page
│   ├── layout.tsx         # Root layout with theme provider
│   ├── page.tsx           # Root redirect to dashboard
│   └── globals.css        # Global styles with claymorphism tokens
├── components/
│   ├── dashboard/         # Dashboard-specific components
│   │   ├── battery-card.tsx
│   │   ├── sensor-card.tsx
│   │   └── status-header.tsx
│   ├── navigation/        # Navigation components
│   │   ├── sidebar.tsx
│   │   └── bottom-nav.tsx
│   ├── ui/                # Reusable UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── input.tsx
│   │   ├── toast.tsx
│   │   ├── switch.tsx
│   │   └── label.tsx
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── lib/
│   ├── stores/
│   │   └── dashboard-store.ts  # Zustand state management
│   ├── types.ts           # TypeScript type definitions
│   ├── utils.ts           # Utility functions
│   └── prisma.ts          # Prisma client instance
├── prisma/
│   └── schema.prisma      # Database schema
├── hooks/
│   └── use-toast.ts       # Toast notification hook
├── public/                # Static assets
├── .env                   # Environment variables (not in git)
├── .env.example           # Environment template
├── next.config.js         # Next.js configuration
├── tailwind.config.ts     # Tailwind with claymorphism design tokens
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## 🎨 Design System

### Color Palette

**Light Mode:**
- Background: `slate-50`
- Cards: `white`
- Primary: `indigo-600`
- Success: `emerald-600`
- Warning: `amber-500`
- Danger: `rose-600`

**Dark Mode:**
- Background: `slate-950`
- Cards: `slate-900`
- Primary: `indigo-400`
- Success: `emerald-400`
- Warning: `amber-400`
- Danger: `rose-500`

### Claymorphism Levels

- **Level 0**: Flat background
- **Level 1**: Soft surface (shadow-clay-sm)
- **Level 2**: Raised surface (shadow-clay-md)
- **Level 3**: Elevated surface (shadow-clay-lg)

### Typography Scale

- Display: 3.5rem (56px)
- Heading 1: 2.5rem (40px)
- Heading 2: 2rem (32px)
- Heading 3: 1.5rem (24px)
- Body: 1rem (16px)
- Caption: 0.75rem (12px)

### Responsive Breakpoints

- Mobile: 375px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+
- Large Desktop: 1440px+

## 🔐 Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/battx?schema=public"

# Auth (for future NextAuth integration)
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Socket.io (for real-time features)
SOCKET_PORT=3001
```

## 📊 Database Schema

The Prisma schema includes:
- **Users** - Authentication and profile data
- **Devices** - IoT device information
- **SensorReadings** - Time-series sensor data with integrity hashing
- **Alerts** - Alert history with sensor snapshots
- **ChargeSessions** - Charging event tracking
- **FirmwareUpdates** - OTA update management
- **ActivityLogs** - User action auditing

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Environment Setup

1. Set up PostgreSQL database (Supabase, Railway, or self-hosted)
2. Configure environment variables in deployment platform
3. Run database migrations
4. Deploy

## 🔄 Real-time Features (To Implement)

The dashboard currently uses mock data with simulated real-time updates. To connect to actual IoT devices:

1. Set up Socket.io server in `app/api/socket/route.ts`
2. Implement device authentication and pairing
3. Create webhook endpoints for sensor data ingestion
4. Add data integrity verification (checksums)

## 📱 PWA Setup (To Complete)

1. Create `public/manifest.json`
2. Add service worker for offline caching
3. Generate app icons (192x192, 512x512)
4. Configure `next-pwa` in `next.config.js`

## 🔒 Security Considerations

- Input validation with Zod schemas
- SQL injection prevention via Prisma
- XSS protection (React escaping)
- CSRF tokens for state-changing operations
- Rate limiting on API routes
- Secure WebSocket authentication
- Data integrity verification via checksums

## 🧪 Testing (To Implement)

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

## 📄 License

MIT

## 🤝 Contributing

This is a production-ready foundation. Key areas for contribution:

1. Real-time Socket.io integration
2. Authentication system (NextAuth.js)
3. Map integration (Leaflet/Mapbox)
4. PWA offline mode
5. Comprehensive test coverage
6. IoT device firmware integration
7. Fleet management features
8. Advanced analytics

## 📞 Support

For issues or questions, please open a GitHub issue.

---

**Built with ❤️ for EV Battery Safety**
