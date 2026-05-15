# Ascend — AI Skill Tree

> An adaptive RPG for your real life. Tell Ascend any goal, and it generates a personalized, branching skill tree that evolves as you do.

Ascend turns any goal — coding, gym, drawing, guitar, public speaking — into a personalized AI‑generated skill tree. Branch into specializations, earn XP, level up, and watch the tree evolve toward mastery as you focus on what matters to you.

## Stack

- **Frontend** — React + TypeScript + Vite, TailwindCSS, [@xyflow/react](https://reactflow.dev) (React Flow) for the skill tree, Framer Motion for animation, React Router.
- **Backend** — Node.js + Express, SQLite (`better-sqlite3`), JWT auth, bcrypt.
- **AI** — OpenAI (`gpt-4o-mini` by default) for tree generation and adaptive evolution, with a built-in heuristic generator that produces rich, multi-branch trees fully offline when no API key is configured.

## Features (MVP shipped)

- Account signup / login with avatar sigil picker
- AI goal → personalized branching skill tree (18–30 nodes across 3–6 branches)
- Interactive React Flow tree (pan, zoom, mini-map, branch filters, branch progress)
- Locked / available / completed states with unlock animations and "available" pulsing
- Rarity tiers — common, rare, epic, **legendary** — plus hidden future nodes
- Node detail drawer with description, XP reward, difficulty, time estimate, journal entry, and proof URL
- XP system, level curve, streak tracking, dashboard analytics
- **Adaptive evolution** — once you've completed nodes, hit *✨ Evolve tree* to grow new advanced branches based on your focus tags

## Quick start

The app runs entirely offline thanks to the heuristic fallback generator — no API keys required.

```bash
# Terminal 1 — backend
cd server
cp .env.example .env       # edit JWT_SECRET (and optionally OPENAI_API_KEY)
npm install
npm start                   # http://localhost:4000

# Terminal 2 — frontend
cd client
npm install
npm run dev                 # http://localhost:5173
```

Then open `http://localhost:5173` and start your ascent.

### Optional — connect OpenAI

Set `OPENAI_API_KEY` in `server/.env`. The server will generate richer, domain-aware trees and evolutions through the OpenAI API. Without it, the heuristic generator covers gym/calisthenics, coding, drawing, music, public speaking, and a generic fallback.

### Production build

```bash
cd client && npm run build
cd ../server && npm start
```

The Express server will serve the built client from `client/dist` if it exists.

## API

| Method | Route                          | Description                              |
| ------ | ------------------------------ | ---------------------------------------- |
| POST   | `/api/auth/signup`             | Create account, returns JWT              |
| POST   | `/api/auth/login`              | Log in                                   |
| GET    | `/api/me`                      | Get current user                         |
| POST   | `/api/goals`                   | Create goal + generate skill tree        |
| GET    | `/api/goals/:id`               | Goal + nodes + edges                     |
| POST   | `/api/nodes/:id/complete`      | Mark node complete, gain XP, advance     |
| POST   | `/api/goals/:id/evolve`        | Grow new branches from focus tags        |
| GET    | `/api/dashboard`               | Stats, goals, recent completions         |

## Project structure

```
server/
  src/
    index.js              Express server + routes
    db.js                 SQLite schema + connection
    auth.js               JWT helpers / middleware
    aiTreeGenerator.js    OpenAI + heuristic generator + evolution
    layout.js             Tree (x,y) layout for React Flow
client/
  src/
    pages/                Landing, Login, Signup, Dashboard, NewGoal, GoalView
    components/           Navbar, SkillTree, SkillNodeCard, NodeDetailDrawer, XpToast
    lib/                  api client, auth context
```

## Roadmap

- Image/video proof uploads (currently URL only)
- Achievements & weekly quests
- Public trees, leaderboards, rivals
- AI mentor chat keyed to your current tree
- Cooperative goals
