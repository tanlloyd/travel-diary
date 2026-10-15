# Frontend

React with Vite and JavaScript. Use Node.js 24 LTS and npm.

From the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite.

## Checks

Run these commands inside `frontend`:

```sh
npm run lint
npm run build
```

`npm run preview` serves the production build locally after building.

## Source structure

- `src/components/`: reusable UI components as they are needed.
- `src/pages/`: Home (`/`) and NotFound (`*`) pages.
- `src/services/`: shared API configuration and service functions.
- `src/App.jsx`: route definitions.
- `src/main.jsx`: React entry point and browser router.
- `src/index.css`: minimal shared styles.

The ESLint configuration is unchanged from the official `create-vite@8.2.0`
React JavaScript template. Newer Vite templates use Oxlint instead.

When deploying, configure the host to serve `index.html` for frontend routes
so that opening or refreshing a route directly works with BrowserRouter.
