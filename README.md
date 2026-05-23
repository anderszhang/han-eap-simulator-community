# EAP Simulator Web UI

Vue 3 frontend for the EAP simulator. The frontend can run against a separately
hosted backend or be bundled into a backend distribution.

## Development

```bash
npm install
npm run dev
```

The Vite development server proxies `/api` and WebSocket traffic to a backend
running at `http://localhost:8080`.

## Configuration

Copy `.env.example` to an appropriate local environment file and set:

| Variable | Description | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | REST API base URL | `/api` |
| `VITE_WS_BASE_URL` | WebSocket base ending in `/api/ws` | same-origin `/api/ws` |
| `VITE_CHECKLIST_TEMPLATE_URL` | Reviewed public Excel template download URL | unavailable |

For a standalone frontend accessing another origin:

```bash
VITE_API_BASE_URL=https://api.example.test/api
VITE_WS_BASE_URL=wss://api.example.test/api/ws
```

## Build

```bash
npm run type-check
npm run build
```

The backend implementation and prebuilt application distributions are licensed
and released separately from this frontend source tree.

The internal checklist Excel template is intentionally excluded until a
reviewed public template is available.

## License

The frontend source code and frontend documentation in this repository are
licensed under the MIT License. Backend source code, prebuilt backend binaries,
application distributions, database migrations, seed datasets, and checklist
templates are excluded and require separate distribution terms.
