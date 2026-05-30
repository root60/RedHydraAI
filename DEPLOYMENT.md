# Deployment Guide for RedHydraAI

## Recommended: GitHub Actions Pages

1. Upload all files from this ZIP into your GitHub repository.
2. Commit and push to `main`.
3. Open repository `Settings` -> `Pages`.
4. Select `GitHub Actions` as the source.
5. Open the `Actions` tab and run `Deploy RedHydraAI to GitHub Pages` if it does not run automatically.

## Backup: `/docs` folder deployment

This ZIP includes a prebuilt static copy in `/docs`.

1. Open repository `Settings` -> `Pages`.
2. Select `Deploy from a branch`.
3. Branch: `main`.
4. Folder: `/docs`.
5. Save.

## Why the old site was not working

A Vite React app cannot be served directly from raw source files on GitHub Pages. The browser cannot run `/src/main.tsx` directly as a production website. The project must be built first. This package includes both a GitHub Actions build workflow and a `/docs` fallback build.

## AI notes

- The AI chat is now local-first and tries to load an open-source browser model.
- WebGPU support depends on the visitor's browser/device.
- No API key or backend server is required for the default mode.
- Static GitHub Pages cannot perform true autonomous model training or self-code upgrades. The monthly workflow refreshes dependencies/build files safely.
