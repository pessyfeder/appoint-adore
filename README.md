# Appoint Adore — Electrolysis Scheduler

Appointment scheduling for a one-person electrolysis studio. A static single-page app: Vite + React 19 + TanStack Router + Tailwind 4. No server and no Lovable dependency; records stay in the browser on the device.

- **Public demo:** `/demo` runs the app on made-up sample data with its own separate storage (Admin password `demo`). It never touches the real records on the same device.

## Development

```sh
npm i
npm run dev      # http://localhost:8080  (demo at /demo)
npm test
npm run build    # static site in ./dist
```

## Hosting

Upload `dist` to any static host (`404.html` and `_redirects` are generated for deep links). For a sub-path such as GitHub Pages, build with `VITE_BASE=/appoint-adore/ npm run build`; `.github/workflows/pages.yml` does that on pushes to `main`.
