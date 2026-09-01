# Project guidance

## Architecture

- Keep external provider schemas inside `src/server`; React consumes only internal schemas.
- Keep statistical interpretation in `src/domain/analyzePlayer.ts` and thresholds in `src/domain/statThresholds.ts`.
- Keep Parse and Groq credentials server-side. API keys never use a `VITE_` prefix.
- Parse MCP is development-only discovery tooling; deployed code uses Parse REST.
- The MVP player flow uses exactly two Parse calls (`get_player_matches` + `get_player_profile`) for 3 credits; agent statistics are derived from recent matches.

## Verification

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`. Tests mock Parse and Groq and never consume provider credits.

## Safety

- Do not log keys, complete upstream payloads, snapshots, or user-provided model instructions.
- Do not expose raw Parse responses through internal APIs.
- Do not add real `.env` files; only `.env.example` is versioned.
