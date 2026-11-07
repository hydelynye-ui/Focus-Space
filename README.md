# Focus Space

Focus Space is a calm, focus-centered workspace with an absolute-timestamp timer, independent timer and clock renderers, scene switching, tasks, schedule, notes, journey history, layout editing, and a PWA shell.

## Run locally

```bash
python3 -m http.server 4173 --directory dist
```

The current static slice persists workspace state locally and never labels local persistence as cloud sync. The repository also includes the CloudBase SQL migration scaffold and environment template for the next backend phase.

## Build / deploy

The published Site is a static build from `dist/`. For CloudBase hosting, use Node.js 22, `npm ci`, `npm run build`, and deploy `dist/`. Configure `VITE_CLOUDBASE_ENV_ID` and `VITE_CLOUDBASE_PUBLISHABLE_KEY` through the hosting environment; do not commit `.env` or server secrets.
