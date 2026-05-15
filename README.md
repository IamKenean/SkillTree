# Ascend

AI-powered adaptive skill tree web app (Next.js, Prisma, React Flow). Set `OPENAI_API_KEY` for live tree generation and evolution; otherwise the app uses resilient offline blueprints.

## Setup

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js 15 (App Router), React 19, Tailwind CSS 4
- Prisma 5 + SQLite
- NextAuth (credentials)
- `@xyflow/react` skill tree canvas
- OpenAI (`gpt-4o-mini`) for graph generation and adaptive evolution
