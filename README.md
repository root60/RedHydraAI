# RedHydra AI

**RedHydra AI** is a free and open-source defensive cybersecurity AI workspace focused on **AI Chat + AI Agent workflows**. It is designed for security learning, secure coding, defensive script generation, vulnerability intelligence, OPSEC guidance, training content, and lab-safe simulations.

> Main experience: users land directly on the Chat + Agent interface. There is no dashboard-first flow.

## Features

- AI Chat for cybersecurity Q&A and guidance
- AI Agent mode for structured security tasks
- Defensive security tool generator
- Static code security analyzer
- CVE and threat intelligence workspace
- Training hub for security concepts
- Deep research workspace using pasted sources and public APIs
- Local CSV-style data analysis lab
- Optional OpenAI-compatible API integration
- Optional local Ollama endpoint integration
- Experimental browser WebLLM mode
- GitHub Pages-ready static deployment

## Responsible use

RedHydra AI is built for defensive security, authorized testing, education, secure coding, incident response, and lab-safe simulations. It does not generate malware, credential theft tooling, stealth/evasion logic, persistence mechanisms, destructive payloads, or unauthorized exploitation workflows.

## GitHub Pages deployment

This project is configured for the repository page URL:

```txt
https://root60.github.io/RedHydraAI/
```

### Recommended deployment

1. Upload or push all files to your `RedHydraAI` repository.
2. Go to **Settings → Pages**.
3. Set **Build and deployment** to **GitHub Actions**.
4. Push to `main`.
5. The workflow will build and deploy the site automatically.

### Backup deployment

The compiled static site is also included in `/docs`.

In **Settings → Pages**, choose:

```txt
Source: Deploy from a branch
Branch: main
Folder: /docs
```

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The production output is written to `/docs`.

## AI provider notes

Because GitHub Pages is static hosting, there is no private backend. API keys entered in the app are handled in the browser. Use restricted keys only. For private code, prefer local mode or a local Ollama endpoint.

## License

MIT
