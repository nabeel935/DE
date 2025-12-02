Bromcom-Style MIS Demo (docs)

This `docs/` folder mirrors the demo at `demo/mis` to allow GitHub Pages to serve the site directly from the `main` branch `docs` folder.

Run locally:

```bash
cd docs
python3 -m http.server 8000
```

Then open http://localhost:8000

If you prefer publishing from `gh-pages`, the repo already contains an Actions workflow that publishes `demo/mis` to the `gh-pages` branch.
