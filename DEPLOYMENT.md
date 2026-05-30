# RedHydra AI GitHub Pages Deployment

Your live URL should be:

```text
https://root60.github.io/RedHydraAI/
```

## Why the old GitHub Pages site did not work

This project is a Vite + React + TypeScript app. GitHub Pages can host static files, but it cannot compile `src/main.tsx` directly in the browser. The app must be built first with:

```bash
npm run build
```

The final static site is generated inside the `dist` folder.

## Recommended method: GitHub Actions

This ZIP already includes:

```text
.github/workflows/deploy.yml
```

After uploading/pushing the files to the `main` branch:

1. Open your repository on GitHub.
2. Go to **Settings**.
3. Go to **Pages**.
4. Under **Build and deployment**, set **Source** to **GitHub Actions**.
5. Go to **Actions** and run/confirm the workflow named **Deploy RedHydra AI to GitHub Pages**.
6. Visit:

```text
https://root60.github.io/RedHydraAI/
```

## Alternative method: deploy from `/docs`

This ZIP also includes a prebuilt static version in:

```text
docs/index.html
```

If you do not want to use GitHub Actions:

1. Upload all files to the repository.
2. Go to **Settings** > **Pages**.
3. Set **Source** to **Deploy from a branch**.
4. Select branch: **main**.
5. Select folder: **/docs**.
6. Save.

## Local testing

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```
