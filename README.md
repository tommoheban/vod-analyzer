# Voice of Developer (VoD) Analyzer

Analyze developer sentiment for any keyword across GitHub, Reddit, Stack Overflow, and HackerNews — powered by Gemini.

## Open in GitHub Codespace

1. Click **Code > Codespaces > New codespace** on this repo
2. Wait for the container to build (installs deps + starts server automatically)
3. The forwarded port URL will be available at:
   ```
   https://<codespace-name>-3000.app.github.dev
   ```
4. Share this URL with anyone — port is set to **public**

## Secrets Setup

Before running, configure these secrets in your Codespace (Settings > Secrets > Codespaces):

- `GEMINI_API_KEY` — Your Google Gemini API key
- `GH_TOKEN` — A GitHub personal access token (for GraphQL API)

## Run Locally

```bash
export GEMINI_API_KEY=AIza...
export GH_TOKEN=ghp_...
npm install
npm start
```

Open http://localhost:3000

## Example Keywords to Try

- `Playwright`
- `Vite`
- `Bun`
- `Tailwind CSS`
- `Next.js`
- `Bright Data`

## How It Works

1. Enter a keyword and click **Analyze**
2. The app scrapes Reddit, GitHub Issues/Discussions, Stack Overflow, and HackerNews in parallel
3. All posts are normalized and sent to Gemini for sentiment analysis
4. A detailed report is rendered with pros, cons, issues, recommendations, and notable quotes

## Tech Stack

- TypeScript + ts-node
- Express (server + UI)
- Google Generative AI SDK (Gemini analysis)
- No React, no build step, no database
