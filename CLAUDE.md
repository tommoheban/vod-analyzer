# VoD Analyzer

Voice of Developer Analyzer — TypeScript/Express app that analyzes developer sentiment.

## Commands

- `npm start` — Start the server on port 3000
- `npm run dev` — Same as start

## Architecture

- `server.ts` — Express server, serves UI (inline HTML) and handles `/analyze` SSE endpoint
- `src/scrapers/` — Reddit, GitHub, Stack Overflow, HackerNews scrapers (all normalize to CommonPost)
- `src/analyzer.ts` — Sends collected posts to OpenRouter for structured analysis
- `src/report.ts` — Renders VoDReport JSON to an HTML string
- `src/types.ts` — CommonPost and VoDReport type definitions

## Secrets

- `OPENROUTER_API_KEY` — Required for OpenRouter analysis
- `GH_TOKEN` — Required for GitHub GraphQL API

## Rules

- No React, no build step — just ts-node + Express
- All scrapers normalize to CommonPost before returning
- Scrapers run in parallel with Promise.allSettled
- Each file stays under 150 lines
- UI is inline HTML in server.ts — no public/ folder
