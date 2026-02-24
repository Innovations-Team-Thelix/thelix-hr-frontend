# Thelix HRIS Frontend — Engineering Documentation

**Version:** 1.0
**Last Updated:** February 24, 2026
**Audience:** All frontend engineers working on the Thelix HRIS codebase

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Getting Started](#4-getting-started)
5. [Folder Structure](#5-folder-structure)
6. [Key Concepts](#6-key-concepts)
   - [Authentication & State](#61-authentication--state)
   - [Data Fetching](#62-data-fetching)
   - [Routing & Layouts](#63-routing--layouts)
   - [Forms & Validation](#64-forms--validation)
7. [Common Patterns](#7-common-patterns)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Project Overview

Thelix HRIS Frontend is the user interface for the Human Resource Information System. It is a modern single-page application (SPA) built with Next.js 14, providing a responsive and interactive experience for Admins, Finance, SBU Heads, and Employees.

Key features include:
- **Dashboard**: Overview of HR metrics.
- **Employee Management**: CRUD operations for employee records.
- **Payroll**: Processing payroll runs and viewing payslips.
- **Leave & Attendance**: Managing leave requests and rosters.
- **Discipline**: Tracking disciplinary actions.
- **Policies**: Viewing company policies.
- **Reports**: Generating HR reports.

---

## 2. Architecture

The application follows the **Next.js App Router** architecture, emphasizing a clear separation between routing, data fetching, and UI presentation.

### Core Principles
- **Server vs. Client Components**: We use Client Components (`"use client"`) for interactive elements (forms, dashboards) and Server Components for static layouts where possible.
- **Feature-Based Organization**: Pages are organized by feature in `src/app`.
- **Centralized Logic**: Business logic and API calls are abstracted into custom hooks (`src/hooks`) and utility libraries (`src/lib`).
- **Type Safety**: TypeScript is used strictly across the entire codebase, sharing types with the backend where applicable (via `src/types`).

---

## 3. Technology Stack

| Technology | Purpose |
|-----------|---------|
| **Next.js 14 (App Router)** | React framework for routing and rendering |
| **TypeScript** | Static type checking |
| **Tailwind CSS** | Utility-first styling |
| **Zustand** | Client-side global state management (Auth) |
| **TanStack React Query** | Server state management, caching, and data fetching |
| **React Hook Form** | Performant form validation and state |
| **Zod** | Schema validation (used with forms) |
| **Axios** | HTTP client with interceptors |
| **Lucide React** | Icon set |
| **Recharts** | Data visualization and charts |
| **React Hot Toast** | Toast notifications |

---

## 4. Getting Started

### Prerequisites
- Node.js 18 or later
- npm or yarn

### Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd hris-frontend

# 2. Install dependencies
npm install

# 3. Configure Environment
# Create a .env.local file in the root directory
echo "NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1" > .env.local

# 4. Run Development Server
npm run dev
# The app will be available at http://localhost:3000 (or 3001 if 3000 is busy)
```

### Build for Production

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions including Docker and Environment Variables.

```bash
npm run build
npm start
```

---

## 5. Folder Structure

```
hris-frontend/
├── public/                 # Static assets (images, icons)
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── (auth)/         # Auth routes group
│   │   ├── dashboard/      # Dashboard page
│   │   ├── employees/      # Employee management pages
│   │   ├── ...             # Other feature routes
│   │   ├── layout.tsx      # Root layout
│   │   └── providers.tsx   # Global providers (QueryClient, Toaster)
│   ├── components/         # Reusable UI components
│   │   ├── layout/         # Sidebar, Header, AppLayout
│   │   ├── shared/         # Shared feature components (DataTables, Badges)
│   │   └── ui/             # Atomic UI components (Button, Input, Card)
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.ts      # Authentication logic
│   │   └── use*.ts         # Feature-specific data hooks
│   ├── lib/                # Utilities and libraries
│   │   ├── api.ts          # Axios instance configuration
│   │   └── utils.ts        # Helper functions (cn, formatters)
│   ├── styles/             # Global styles
│   │   └── globals.css     # Tailwind imports and base styles
│   └── types/              # TypeScript type definitions
│       └── index.ts        # Domain models (Employee, User, etc.)
├── next.config.js          # Next.js configuration
├── tailwind.config.ts      # Tailwind configuration
└── tsconfig.json           # TypeScript configuration
```

---

## 6. Key Concepts

### 6.1 Authentication & State
Authentication is managed via **Zustand** in `src/hooks/useAuth.ts`.
- **Login Flow**: The `login` action sends credentials to the backend.
- **Token Storage**: Access and Refresh tokens are stored in `localStorage`.
- **Interceptors**: `src/lib/api.ts` configures Axios interceptors to:
  - Attach the `Bearer` token to every request.
  - Automatically refresh the access token on `401 Unauthorized` responses.
  - Redirect to login if refresh fails.

### 6.2 Data Fetching
We use **TanStack React Query** for all data fetching.
- **Hooks**: Custom hooks in `src/hooks/` (e.g., `useEmployees`) wrap `useQuery` and `useMutation`.
- **Keys**: Query keys are centralized in the hook files (e.g., `employeeKeys`) to ensure consistency and enable easy cache invalidation.
- **Caching**: Default stale time is set to 5 minutes in `src/app/providers.tsx`.

Example:
```typescript
// src/hooks/useEmployees.ts
export function useEmployees(filters: EmployeeFilters) {
  return useQuery({
    queryKey: employeeKeys.list(filters),
    queryFn: () => api.get('/employees', { params: filters }).then(res => res.data),
  });
}
```

### 6.3 Routing & Layouts
- **App Layout**: `src/components/layout/AppLayout.tsx` wraps authenticated pages. It includes the `Sidebar` and `Header`.
- **Auth Guard**: `useAuth` hook checks authentication status in `AppLayout`. Unauthenticated users are redirected to `/login`.
- **Dynamic Routes**: Pages like `src/app/employees/[id]/page.tsx` use dynamic segments for detail views.

### 6.4 Forms & Validation
Forms are built using **React Hook Form** combined with **Zod** for schema validation.
- **Schema**: Define the shape and validation rules using Zod.
- **Hook**: Use `useForm({ resolver: zodResolver(schema) })`.
- **UI**: Connect form fields to UI components (Input, Select) using the `register` function or `Controller`.

---

## 7. Common Patterns

### Adding a New Page
1. Create a new directory in `src/app/` (e.g., `src/app/new-feature/`).
2. Add `page.tsx` with `"use client"`.
3. Wrap content in `<AppLayout pageTitle="New Feature">`.

### Adding a New API Integration
1. Define types in `src/types/index.ts`.
2. Create a new hook file `src/hooks/useNewFeature.ts`.
3. Define Query Keys.
4. Export `useQuery` hooks for fetching and `useMutation` hooks for creating/updating.

### Handling Loading & Errors
- Use the `isLoading` and `isError` flags provided by React Query.
- Use the `Loading` component from `src/components/ui/loading.tsx` for full-page or section loading.
- Use `react-hot-toast` for success/error notifications in mutations.

---

## 8. Troubleshooting

**"ChunkLoadError" / "Loading chunk failed"**
- This usually happens after a deployment or build update.
- **Fix**: Clear browser cache or hard refresh (Cmd+Shift+R). If in dev, delete `.next` folder and restart server.

**"401 Unauthorized" Loop**
- Check if the refresh token in `localStorage` is valid.
- Clear `localStorage` and log in again.

**Hydration Errors**
- Ensure that the initial UI rendered on the server matches the client.
- Avoid using `window` or `localStorage` directly in the initial render; use `useEffect` or `useAuth` which handles mounting state.
