# ReStocka

Auto-replenishment system for small restaurants.

## Overview

ReStocka solves a critical operational problem: restaurant owners are the purchasing bottleneck because managers are not empowered or reliable. When supplies run out, operations stop and owners are constantly interrupted.

This system automates replenishment with rule-based ordering, keeping businesses running even when humans fail.

## Features

### Dashboard
- Real-time stock status overview (OK, Low, Critical, Out)
- Active alerts count
- Pending orders count
- Critical items list
- Recent orders list

### Inventory Management
- View stock levels by location
- Color-coded status indicators
- Days remaining calculation based on daily usage
- Multi-location support for owners

### Purchase Orders
- Full order lifecycle tracking (Draft → Sent → Delivered/Not Delivered)
- Manager delivery confirmation with one tap
- Automatic stock level updates on delivery
- Alert creation on delivery failures

### Alerts
- Low stock warnings
- Draft PO pending approval
- Emergency reorder notifications
- Delivery failure alerts
- Dismissable by owners

### Role-Based Access
- **Owner**: Full access to all locations, products, suppliers, and settings
- **Manager**: Limited to assigned location, can only view stock and confirm deliveries

## Tech Stack

### Frontend (Mobile App)
- Expo SDK 53
- React Native 0.76.7
- React Query for server state
- NativeWind (TailwindCSS)
- Expo Router for navigation

### Backend
- Bun runtime
- Hono server
- Prisma ORM with SQLite
- Better Auth for authentication

## Project Structure

```
/
├── src/
│   ├── app/
│   │   ├── (tabs)/          # Tab screens
│   │   │   ├── index.tsx    # Dashboard
│   │   │   ├── inventory.tsx
│   │   │   ├── orders.tsx
│   │   │   ├── alerts.tsx
│   │   │   └── settings.tsx
│   │   ├── login.tsx
│   │   ├── onboarding.tsx
│   │   └── _layout.tsx
│   ├── components/
│   └── lib/
│       ├── api.ts           # API client
│       ├── authClient.ts    # Auth client
│       └── useSession.tsx   # Session hook
├── backend/
│   ├── src/
│   │   ├── routes/          # API routes
│   │   │   ├── me.ts
│   │   │   ├── onboarding.ts
│   │   │   ├── locations.ts
│   │   │   ├── products.ts
│   │   │   ├── suppliers.ts
│   │   │   ├── stock.ts
│   │   │   ├── orders.ts
│   │   │   ├── alerts.ts
│   │   │   └── dashboard.ts
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   └── index.ts
│   └── prisma/
│       └── schema.prisma
└── shared/
    └── contracts.ts         # Shared API types
```

## API Endpoints

### Authentication
- `POST /api/auth/sign-up` - Create account
- `POST /api/auth/sign-in` - Sign in
- `POST /api/auth/sign-out` - Sign out

### User
- `GET /api/me` - Get current user with membership

### Onboarding
- `POST /api/onboarding` - Create organization (become owner)

### Locations
- `GET /api/locations` - List locations
- `POST /api/locations` - Create location (owner only)

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product (owner only)
- `PUT /api/products/:id` - Update product (owner only)

### Suppliers
- `GET /api/suppliers` - List suppliers
- `POST /api/suppliers` - Create supplier (owner only)

### Stock
- `GET /api/stock/:locationId` - Get stock levels
- `PUT /api/stock/:locationId/:productId` - Update stock (owner only)

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order (owner only)
- `PUT /api/orders/:id/send` - Send order (owner only)
- `PUT /api/orders/:id/confirm` - Confirm delivery

### Alerts
- `GET /api/alerts` - List alerts
- `PUT /api/alerts/:id/read` - Mark as read
- `PUT /api/alerts/:id/dismiss` - Dismiss alert (owner only)

### Dashboard
- `GET /api/dashboard` - Get dashboard summary

## Design System

### Colors
- **Primary**: Teal `#0D9488`
- **Dark**: Navy `#0F172A`
- **Success**: Emerald `#10B981`
- **Warning**: Amber `#F59E0B`
- **Critical**: Orange `#F97316`
- **Danger**: Rose `#EF4444`

### Stock Status Colors
- **OK**: Green - plenty of stock
- **Low**: Yellow - getting low
- **Critical**: Orange - urgent
- **Out**: Red - out of stock

## UX Features

- **Cancel/Close buttons**: All forms and modal screens have X buttons so users can easily back out
- **Pull-to-refresh**: All list screens support pull-down to refresh
- **Clear error states**: Form errors displayed inline, not as alerts
- **Loading indicators**: Activity indicators during async operations

## Getting Started

1. Sign up for an account
2. Create your organization with first location
3. Add products to your catalog
4. Add suppliers
5. Set up reorder rules (V2)
6. Monitor dashboard for stock status

## V2 Features (Planned)

- Reorder rules with automation modes (Manual, Assisted, Auto, Emergency)
- WhatsApp notifications
- Delivery SLA tracking
- Feature flags for gradual rollout
