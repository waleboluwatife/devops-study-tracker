# DevOps Study Tracker

Cross-accountability tracker for a small study group working through the KodeKloud
DevOps Engineer path: verified study logs, rotating peer reviews, a weekly scoreboard
and automatic fines. Replaces the group's Google Sheet.

> Status: **Milestone 1** — rules engine, data model and seed. No UI yet.
> A full README with an architecture diagram arrives in Milestone 4.

## Run locally

Requires Node 20+ and Docker.

```bash
npm install
cp .env.example .env
npm run db:up        # Postgres 16 in Docker on localhost:5433
npm run db:migrate   # apply migrations
npm run db:seed      # group, Round 1, members, courses, syllabus
```

## Tests

```bash
npm test             # rules engine + seed parsing (no database needed)
npm run test:db      # against a real Postgres: migrates + seeds `tracker_test`, then checks it
npm run typecheck
npm run lint
```

## Layout

| Path | What |
|---|---|
| `src/lib/rules/` | Pure TypeScript business rules (weeks, rotation, fines, waivers, hours, standings) + unit tests |
| `src/lib/seed-data.ts` | CSV parsing for `seed/courses.csv` and `seed/syllabus.csv` |
| `src/server/round-data.ts` | Loads a round from Postgres into the rules engine's shapes |
| `prisma/` | Schema, migrations, seed script |
| `seed/` | Course list (and the 40-week syllabus once exported) |

Fines, verified hours, streaks and balances are always **calculated** from the
stored facts, never stored, so they can't drift.
