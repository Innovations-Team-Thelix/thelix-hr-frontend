# Thelix HRIS Frontend

Thelix HRIS Frontend is a modern single-page application (SPA) built with Next.js 14, serving as the user interface for the Human Resource Information System. It provides a comprehensive and responsive experience for Admins, Finance, SBU Heads, and Employees to manage HR operations.

## Features

-   **Dashboard**: Real-time overview of key HR metrics and statistics.
-   **Employee Management**: Complete CRUD operations for employee records and profiles.
-   **Payroll Management**: Processing payroll runs, salary reports, and viewing payslips.
-   **Leave & Attendance**: Streamlined leave request management and roster planning.
-   **Discipline**: Tracking and managing disciplinary actions and records.
-   **Policy Hub**: Centralized access to company policies.
-   **Reports**: Generation of detailed HR and financial reports.

## Technology Stack

The project leverages a modern and robust tech stack:

| Category | Technology |
| :--- | :--- |
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **State Management** | Zustand (Auth), TanStack React Query (Server State) |
| **Forms** | React Hook Form + Zod |
| **Networking** | Axios |
| **UI Components** | Lucide React (Icons), Recharts (Charts), React Hot Toast |

## Getting Started

### Prerequisites

-   Node.js 18 or later
-   npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd hris-frontend
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Copy the example environment file and configure it:
    ```bash
    cp .env.example .env.local
    ```
    Update `.env.local` with your API URL:
    ```env
    NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    The app will be available at [http://localhost:3000](http://localhost:3000).

## Scripts

-   `npm run dev`: Starts the development server.
-   `npm run build`: Builds the application for production.
-   `npm start`: Starts the production server (requires build).
-   `npm run lint`: Runs ESLint to check for code quality issues.
-   `npm run type-check`: Runs TypeScript type checking.

## Project Structure

```
hris-frontend/
├── public/                 # Static assets
├── src/
│   ├── app/                # Next.js App Router pages & layouts
│   ├── components/         # Reusable UI components
│   │   ├── layout/         # Layout components (Sidebar, Header)
│   │   ├── shared/         # Feature-specific shared components
│   │   └── ui/             # Generic UI atoms (Button, Input)
│   ├── hooks/              # Custom React hooks (Auth, Data fetching)
│   ├── lib/                # Utilities and API configuration
│   ├── styles/             # Global styles
│   └── types/              # TypeScript definitions
├── next.config.js          # Next.js configuration
└── tsconfig.json           # TypeScript configuration
```

## Documentation

-   **[Engineering Docs](./ENGINEERING_DOCS.md)**: Detailed architecture, key concepts, and common patterns.
-   **[Deployment Guide](./DEPLOYMENT.md)**: Instructions for deploying to production using Vercel or Docker.
