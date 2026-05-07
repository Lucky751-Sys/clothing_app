# Clothify (Clothes Shopping Web App)

A modern **static** shopping clothes web app (catalog + cart + checkout demo) built with **HTML/CSS/JavaScript** — no Node/npm required.

## Run locally

Option A (recommended): VS Code / Cursor Live Server extension

- Install **Live Server**
- Right click `index.html` → **Open with Live Server**

Option B: Python (if installed)

```bash
python -m http.server 5173
```

Then open `http://localhost:5173`.

## Deploy to GitHub Pages

1. Push this repo to GitHub (steps below).
2. In GitHub: **Settings → Pages**
3. **Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: `main` / `(root)`
4. Save. Your site will be available at `https://<username>.github.io/<repo>/`

## Project structure

- `index.html` — app shell (catalog, dialogs, cart drawer)
- `styles.css` — modern UI styling
- `src/data.js` — products dataset
- `src/app.js` — app logic (search/filter/sort/cart/localStorage/checkout)
