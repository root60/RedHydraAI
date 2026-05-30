# RedHydra AI Deployment Guide

## Best option: GitHub Actions

1. Extract the final ZIP.
2. Upload/push everything to `https://github.com/root60/RedHydraAI`.
3. Open the repository on GitHub.
4. Go to **Settings → Pages**.
5. Under **Build and deployment**, select **GitHub Actions**.
6. Push to `main` or manually run the workflow.

The workflow builds the Vite app into `/docs` and publishes it to GitHub Pages.

## Backup option: `/docs` branch deployment

If you do not want to use GitHub Actions:

1. Upload all files including `/docs`.
2. Go to **Settings → Pages**.
3. Choose **Deploy from a branch**.
4. Select `main` and `/docs`.
5. Save.

## Important

Do not deploy this Vite source from `main / root` unless GitHub Actions builds it first. Raw Vite source files cannot run as a finished React app on GitHub Pages.

## Repository URL base

The Vite base is already configured as:

```ts
base: "/RedHydraAI/"
```

This matches:

```txt
https://root60.github.io/RedHydraAI/
```
