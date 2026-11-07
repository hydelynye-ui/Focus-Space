# Focus Space

Focus Space is a focus-centered workspace with an absolute-timestamp timer, independent timer and clock renderers, scene switching, tasks, schedule, notes, journey history, layout editing, and a PWA shell.

## Production build

The current checkout is a Vite static build around the existing browser application. It does not contain a React/TypeScript source tree or a CloudBase SDK client yet; the deployment preparation scripts deliberately report that fact instead of treating the static app as a React build.

```bash
npm ci
npm run build
npm run check:deploy
npm run typecheck
npm run lint
```

The build uses `vite.config.js` with `base: '/'` and writes the production site to `dist/`. Node.js `>=22.12.0` is declared in `package.json`.

## CloudBase

`.env.example` is pinned to the independent Focus Space environment:

- `VITE_CLOUDBASE_ENV_ID=focus-space-d5gmg1bimc422765f`
- `VITE_CLOUDBASE_REGION=ap-shanghai`
- `VITE_CLOUDBASE_PUBLISHABLE_KEY=`

Only the publishable client key may be used in browser code. `.env` and `.env.local` are ignored. No FOMS endpoint or secret key is present in this checkout. The CloudBase client module is a safe configuration scaffold; the actual CloudBase JS SDK/auth/sync adapter still needs to be wired before production data sync can be claimed.

## Local data safety

The app persists workspace state in IndexedDB with a localStorage fallback. The build only regenerates static files and does not access or clear browser storage, scene assets, or user settings.
