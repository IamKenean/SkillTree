# Ascend Skill Tree

Ascend is a full-stack adaptive skill tree MVP for personal growth. Users create an account, describe a goal, receive an RPG-style skill tree, complete unlockable nodes for XP, and evolve the tree based on the interests they repeatedly practice.

## Features

- JWT authentication with bcrypt password hashing.
- Goal creation with experience level, weekly time, and focus interests.
- AI-style deterministic skill tree generation with XP rewards, prerequisites, proof prompts, hidden future nodes, and rarity tiers.
- React Flow skill graph with zoom, pan, locked/unlocked/complete states, node detail panels, and dashboard metrics.
- Progress tracking with journal entries, proof URLs, focus tags, streaks, levels, achievements, and adaptive specialization branches.
- Express API with JSON persistence for local development and production demo deployments.

## Tech Stack

- React 19, TypeScript, Vite, React Flow.
- Express 5, Zod, JWT, bcryptjs.
- Vitest, Testing Library, Supertest.

## Getting Started

```bash
npm install
npm run dev
```

The web app runs on `http://localhost:5173` and proxies API calls to `http://localhost:4173`.

For a production build:

```bash
npm run build
NODE_ENV=production npm start
```

## Scripts

- `npm run dev` starts the API and Vite client together.
- `npm run build` type-checks, builds the client, and compiles the server.
- `npm test` runs the automated unit and API tests.

## Local Data

The API stores local development data in `data/ascend.json`. Set `ASCEND_DB_PATH` to use another path and `JWT_SECRET` for a production-grade signing secret.