# Deployment Guide — RedHydra AI

This project is already configured for GitHub Pages under the repository path `/RedHydraAI/`.

## Option 1: GitHub Actions

1. Extract the ZIP.
2. Upload or push all files to your GitHub repository.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose **GitHub Actions**.
5. Push to `main`.

GitHub will build and publish the app automatically.

## Option 2: Deploy from `/docs`

1. Extract the ZIP.
2. Upload or push all files to the repository.
3. Go to **Settings → Pages**.
4. Choose **Deploy from a branch**.
5. Select branch: `main`.
6. Select folder: `/docs`.
7. Save.

## Important

Do not select `main / root` for a Vite source project unless the compiled static files are placed at root. This project includes a prebuilt `/docs` folder for easy GitHub Pages deployment.

## Site URL

```txt
https://root60.github.io/RedHydraAI/
```
