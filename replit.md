# Replit.md - 売上管理 (Sales Management App)

## Overview

This is a sales management mobile application for a Japanese massage/bodywork (整体) service business. The app allows a single practitioner to track daily sales by recording the date, service course type, and amount for each transaction. It provides simple summaries of daily and monthly totals, along with reporting capabilities.

The application is built as an Expo React Native app with a Node.js/Express backend, designed to run on iOS, Android, and web platforms. It follows a "register-like" (レジ感覚) user experience - minimal, focused, and easy to use.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Expo SDK 54 with React Native 0.81
- **Navigation**: Bottom tab navigation using React Navigation (three tabs: Sales Input, Cashbook, and Reports)
- **Web Deployment**: Expo web build served directly from `/dist` folder - works in any browser without Expo Go
- **State Management**: TanStack React Query for server state management
- **Styling**: StyleSheet-based with a soft, warm color theme (beige, pale green, warm brown)
- **UI Components**: Custom themed components (ThemedText, ThemedView, Button, Card) with consistent design tokens

### Backend Architecture
- **Server**: Express.js running on Node.js
- **API Design**: RESTful JSON API with endpoints for CRUD operations on sales and cashbook data
- **Routes**: 
  - `GET /api/sales` - Fetch all sales with summary totals
  - `POST /api/sales` - Create new sale entry
  - `PUT /api/sales/:id` - Update existing sale
  - `DELETE /api/sales/:id` - Delete sale entry
  - `GET /api/cashbook/:year/:month` - Get cashbook summary for a month
  - `POST /api/cashbook` - Create manual cashbook entry
  - `DELETE /api/cashbook/:id` - Delete manual cashbook entry

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: 
  - `sales` table: id, date, course, amount, createdAt
  - `cashbook` table: id, date, type (income/expense), description, amount, createdAt
- **Validation**: Zod schemas generated from Drizzle schema for type-safe API validation

### Features
- **Sales Input**: Record daily sales with date, course type, and amount
- **Cashbook (出納帳)**: Track income and expenses with automatic sales integration
  - Sales automatically appear as income entries
  - Manual entries for other income/expenses
  - CSV export and print functionality
- **Reports**: View daily and monthly sales summaries

### Key Design Decisions

1. **No Authentication**: This is a single-user local business tool. No login, signup, or account management is needed.

2. **Minimal Navigation**: Stack-only navigation was initially planned, but evolved to bottom tabs for separating sales input from reports while maintaining simplicity.

3. **Course Types**: Fixed set of service options (30分整体, 60分整体, 90分整体, 回数券, その他) defined in shared schema.

4. **Shared Types**: The `shared/` directory contains schema definitions used by both client and server, ensuring type consistency.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Database abstraction and migrations

### Third-Party Libraries
- **Expo SDK**: Core mobile development platform with various modules (splash-screen, haptics, image, etc.)
- **React Navigation**: Navigation framework for React Native
- **TanStack React Query**: Async state management for API calls
- **DateTimePicker**: Native date selection component
- **React Native Reanimated**: Animation library for smooth UI interactions

### Build & Development
- **tsx**: TypeScript execution for server development
- **esbuild**: Server bundling for production
- **Drizzle Kit**: Database migration tooling

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `EXPO_PUBLIC_DOMAIN`: API server domain for client requests
- `REPLIT_DEV_DOMAIN`: Development domain (Replit-specific)