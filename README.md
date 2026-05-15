# Ascend (AI Skill Tree App)

Ascend is a full-stack adaptive skill tree platform for personal growth.  
Users create a goal, get an AI-generated RPG-style progression graph, complete nodes for XP, and unlock evolving specialization branches based on real activity.

## MVP Features in this repo

- User signup/login with JWT auth
- Goal creation (goal, level, weekly time, interests)
- AI-generated initial skill tree
- Interactive skill tree graph UI (React Flow)
- Node completion with journal/proof/tags
- XP, level, streak, dashboard analytics
- Adaptive branch evolution from repeated focus tags (e.g. calisthenics, frontend, ML)

## Tech Stack

- Frontend: React + Vite + TypeScript + React Flow
- Backend: Express + TypeScript + Zod + JWT
- Persistence: JSON file storage (`server/data/store.json`)

## Quick Start

1. Install dependencies:

`npm install`

2. Start frontend + backend:

`npm run dev`

3. Open:

`http://localhost:5173`

API runs at:

`http://localhost:4000`

## Scripts

- `npm run dev` - run both apps
- `npm run build` - build backend and frontend
- `npm run test` - run backend test suite
- `npm run lint` - lint frontend