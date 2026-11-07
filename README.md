# Focus Space

Focus Space is a focus-centered workspace with an absolute-timestamp timer, scenes, tasks, schedule, notes, journey history, theme switching, and an offline-first PWA shell.

## Run locally

Serve `dist/` with any static server, for example:

```bash
python3 -m http.server 4173 --directory dist
```

The app stores demo workspace data in IndexedDB-compatible local storage for this first published slice and registers a service worker for offline launch.
