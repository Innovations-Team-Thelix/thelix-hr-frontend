# Deployment Guide

This guide outlines how to deploy the Thelix HRIS Frontend for production.

## Prerequisites

- Node.js 18+ (for local builds)
- Docker (optional, for containerized deployment)
- Access to the backend API URL

## Environment Variables

Create a `.env.production` or set these variables in your deployment platform:

```bash
NEXT_PUBLIC_API_URL=https://api.your-production-url.com/api/v1
```

> **Note:** `NEXT_PUBLIC_API_URL` is baked into the build for client-side usage. If you change it, you must rebuild the application.

## Option 1: Vercel (Recommended)

The easiest way to deploy Next.js apps.

1.  Push your code to a Git repository (GitHub, GitLab, Bitbucket).
2.  Import the project into Vercel.
3.  Add the `NEXT_PUBLIC_API_URL` environment variable in the Vercel dashboard.
4.  Deploy.

## Option 2: Docker

We provide a production-ready `Dockerfile`.

### Build the Image

You must provide the `NEXT_PUBLIC_API_URL` as a build argument because it gets inlined into the client-side bundle.

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.your-production-url.com/api/v1 \
  -t hris-frontend .
```

### Run the Container

```bash
docker run -p 3000:3000 hris-frontend
```

The application will be available at `http://localhost:3000`.

## Option 3: Manual Node.js Server

1.  **Install Dependencies:**
    ```bash
    npm ci
    ```

2.  **Build:**
    ```bash
    export NEXT_PUBLIC_API_URL=https://api.your-production-url.com/api/v1
    npm run build
    ```

3.  **Start:**
    ```bash
    npm start
    ```

## Performance Optimization

-   **Static Assets:** Served automatically by Next.js. For better performance, use a CDN.
-   **Image Optimization:** Ensure `next.config.js` allows remote patterns if you serve images from external domains.
-   **Caching:** React Query is configured with a 5-minute stale time. Adjust in `src/app/providers.tsx` if needed.
