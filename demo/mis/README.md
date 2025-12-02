Bromcom-Style MIS Demo

Files:
- `index.html` — loads React, Recharts and `app.js` via CDN.
- `app.js` — the demo React app (JSX, transpiled in browser via Babel).

Run locally:

1. Start a simple HTTP server from the `demo/mis` directory (recommended):

```bash
cd demo/mis
python3 -m http.server 8000
```

2. Open http://localhost:8000 in your browser.

Notes:
- This is a development/demo setup using in-browser Babel. For production, build with a bundler.
- The app uses localStorage to persist data in your browser.
- The full per-page JSX was trimmed to placeholders so the demo mounts; paste the full page components into `app.js` if you want complete UI functionality.
 
Publish to GitHub Pages

- Option 1 — Automatic on push to `main` (recommended):
	- A GitHub Actions workflow is included at `.github/workflows/deploy-gh-pages.yml` which publishes the contents of `demo/mis` to the `gh-pages` branch on every push to `main`.
	- After the first successful run the site will be available at `https://<your-username>.github.io/<repo-name>/` (it can take a minute to appear).

- Option 2 — Manual upload:
	- You can manually upload the `demo/mis` folder to a branch named `gh-pages` or serve it from the `docs/` folder on `main`.

Notes:
- The workflow uses the repository `GITHUB_TOKEN` (no extra secrets required).
- If you prefer the demo to live under `docs/` instead, I can move files and update the workflow accordingly.
