# Clutch or Cringe

Generate a playful bilingual VALORANT roast card from real recent statistics. Statistical interpretation is deterministic application logic; the LLM only turns trusted facts into friendly gameplay trash talk.

## Quick start

```bash
pnpm install
cp .env.example .env.local
pnpm dev:vercel
```

Fill the local environment file with server-side credentials. Never use `VITE_` prefixes:

| Variable | Purpose |
| --- | --- |
| `PARSE_API_KEY` | Parse.bot REST authentication |
| `GROQ_API_KEY` | Groq server-side authentication |
| `GROQ_MODEL` | Groq model with reliable structured output |
| `PLAYER_STATS_SIGNING_SECRET` | HMAC secret for 10-minute player snapshots |

## Architecture

```text
Browser → GET /api/player → Parse.bot → normalize PlayerStats
        ← PlayerStats + signed snapshot
Browser → POST /api/roast → verify snapshot → analyzePlayer → Groq/fallback
        ← validated RoastResult
```

- `src/shared` owns browser/server schemas.
- `src/domain` owns Riot ID parsing, thresholds, analysis, and deterministic fallback.
- `src/server/valorant` isolates the statistics provider and normalization boundary.
- `src/server/ai` isolates Groq.
- `api` contains Vercel Functions. The browser never receives Parse payloads or credentials.

The signed snapshot prevents browser-edited statistics and avoids a second Parse lookup. There is deliberately no database, authentication, Express server, or cross-request cache.

## Parse.bot integration

The development-only Parse MCP identified scraper `6517942a-644e-4cbc-9349-6e6d5ddaa622`, release 11:

| Endpoint | Input | Role | Credits |
| --- | --- | --- | --- |
| `get_player_matches` | `player_id` | Required recent matches | 1 |
| `get_player_profile` | `player_id` | Optional player card/avatar enrichment | 2 |

Runtime calls use `https://api.parse.bot/scraper/{scraper_id}/{endpoint_name}` with `X-API-Key`. A card makes exactly two concurrent calls for a total of 3 credits. Profile enrichment degrades gracefully; match failure stops normalization. Agent and map performance are derived only from the recent-match window. Automated tests use synthetic fixtures and mocks and MUST NOT consume credits.

## Groq and fallback

Groq receives whitelisted gameplay stats plus deterministic strengths, weaknesses, facts, archetypes, intensity, and language. It cannot receive user prompts or choose the model. Responses use JSON Schema structured output and are validated again with Zod. Timeout, 429, invalid JSON, or invalid content uses a deterministic bilingual fallback without retrying.

## Commands

```bash
pnpm dev          # frontend only
pnpm dev:vercel   # frontend + serverless API
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Deploy to Vercel

1. Import the repository in Vercel.
2. Configure all four environment variables.
3. Deploy with the default Vite settings.
4. Confirm `/api/player` and `/api/roast` run server-side and keys are absent from browser bundles.

## Known limits

- Results cover the matches returned by Tracker, not complete lifetime history.
- RR, weapon performance, and party size are omitted unless reliable data exists. The player card/avatar is omitted when the optional profile response does not provide one.
- Agent performance reflects recent matches, not the complete act or lifetime history.
- Maps require two matches and agents three before comparative conclusions.
- There is no shared cache or product-level rate limiter yet; provider boundaries are ready for those additions.

## Disclaimer

Valorant Roast Card is an independent project and is not affiliated with or endorsed by Riot Games, Tracker Network, or Parse.bot.
