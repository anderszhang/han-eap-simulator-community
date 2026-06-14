# Developer Guide

This document covers local development for HH EAP Simulator Web UI.

## Project Scope

This repository contains the public frontend source tree only.

Included:

- Vue frontend source code
- Frontend pages and components
- Frontend documentation and screenshots

Excluded:

- Go backend source code
- Database migrations and seed datasets
- Backend binaries and full application distributions
- Internal checklist Excel templates

## Tech Stack

- Vue 3
- TypeScript
- Vite
- Vue Router
- Element Plus
- Monaco Editor
- Vue Flow
- Axios

## Backend Requirement

The frontend needs a running HH EAP Simulator backend.

Default development API endpoint:

```text
http://localhost:8080/api
```

When working from the main private project checkout, start the full development stack from the main project root:

```bash
./run.sh dev
```

That starts:

- Backend API at `http://localhost:8080`
- Frontend Vite dev server at `http://localhost:3000`

## Frontend Development

Install dependencies:

```bash
npm install
```

Start Vite:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Vite supports HMR, so normal UI and TypeScript edits should update in the browser without running a production build.

## Configuration

Copy `.env.example` to the environment file you need and set:

| Variable | Description | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | REST API base URL | `/api` |
| `VITE_WS_BASE_URL` | WebSocket endpoint, usually ending in `/api/ws` | same-origin `/api/ws` |
| `VITE_CHECKLIST_TEMPLATE_URL` | Public checklist Excel template download URL | unavailable |

For a standalone frontend connected to another backend:

```bash
VITE_API_BASE_URL=https://api.example.test/api
VITE_WS_BASE_URL=wss://api.example.test/api/ws
```

## Common Commands

```bash
# Start development server
npm run dev

# TypeScript check
npm run type-check

# Production build
npm run build

# Preview production build
npm run preview
```

## Validation Guidance

- For simple UI text/layout changes, rely on Vite HMR and browser inspection.
- For TypeScript-sensitive changes, run `npm run type-check`.
- Before release or larger refactors, run `npm run build`.

## Default Development Login

The actual accounts depend on the backend database seed data in use.
