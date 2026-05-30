# RedHydra AI

> Dynamic AI Security Platform for security analysis, tool generation, code review, threat intelligence, training, and guided research.

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Ready-222?style=for-the-badge&logo=github&logoColor=white)

## Live Site

```text
https://root60.github.io/RedHydraAI/
```

## Overview

RedHydra AI is a modern dark cybersecurity dashboard built with React, TypeScript, Vite, and Tailwind CSS. It combines multiple security-focused workflows in one interface, including an AI security agent, code analyzer, tool generator, threat intelligence module, training hub, and deep research workspace.

## Key Features

- Security dashboard with stats, quick actions, and vulnerability summaries
- AI security chat with personas and thinking modes
- Security tool generator for defensive and authorized testing workflows
- Code analyzer for vulnerability-style findings and fix guidance
- Threat intelligence browser with IOCs, MITRE-style context, and mitigation notes
- Training hub for lessons, quizzes, and security learning modules
- Deep research section for structured cybersecurity analysis
- Responsive dark UI with clean sidebar navigation

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Utilities | clsx, tailwind-merge |
| Packaging | vite-plugin-singlefile |
| Hosting | GitHub Pages |

## Quick Start

```bash
git clone https://github.com/root60/RedHydraAI.git
cd RedHydraAI
npm install
npm run dev
```

## Build for Production

```bash
npm run build
npm run preview
```

The production build is created in the `dist` folder.

## GitHub Pages Deployment

This project is already prepared for GitHub Pages.

### Recommended: GitHub Actions

A deployment workflow is included at:

```text
.github/workflows/deploy.yml
```

To enable it:

1. Go to your GitHub repository.
2. Open **Settings** > **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push the project to the `main` branch.
5. Check the **Actions** tab and wait for deployment to complete.

### Alternative: Deploy from `/docs`

A prebuilt static copy is also included in:

```text
docs/index.html
```

To use it:

1. Go to **Settings** > **Pages**.
2. Choose **Deploy from a branch**.
3. Select branch: `main`.
4. Select folder: `/docs`.
5. Save.

## Project Structure

```text
RedHydraAI/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── docs/
│   ├── .nojekyll
│   ├── index.html
│   └── 404.html
├── src/
│   ├── components/
│   ├── utils/
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── types.ts
├── DEPLOYMENT.md
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.ts
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local development server |
| `npm run build` | Create production build |
| `npm run preview` | Preview production build locally |

## Ethical Use

RedHydra AI is intended for learning, authorized security testing, defensive security workflows, and responsible research. Use it only on systems you own or have permission to test.

## License

Add your preferred license before public release.
