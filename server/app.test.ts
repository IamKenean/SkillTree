import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { JsonStore } from './dataStore.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'ascend-test-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('Ascend API', () => {
  it('signs up, creates a goal, completes a node, and adapts the tree', async () => {
    const app = createApp({
      store: new JsonStore(join(tempDir, 'db.json')),
      jwtSecret: 'test-secret',
    });

    const signup = await request(app)
      .post('/api/auth/signup')
      .send({ username: 'tester', password: 'password123', avatar: 'T' })
      .expect(201);
    const token = signup.body.token as string;

    const goal = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'I want to get stronger',
        experienceLevel: 'Beginner',
        weeklyHours: 5,
        interests: 'pushups, dips, pullups',
      })
      .expect(201);

    const rootId = goal.body.nodes[0].id as string;
    const completed = await request(app)
      .post(`/api/goals/${goal.body.id}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        nodeId: rootId,
        note: 'Finished my baseline session.',
        focusTags: ['pushups', 'dips', 'pullups'],
      })
      .expect(200);

    expect(completed.body.totalXp).toBe(50);
    expect(completed.body.nodes.some((node: { status: string }) => node.status === 'unlocked')).toBe(true);

    const adapted = await request(app)
      .post(`/api/goals/${goal.body.id}/adapt`)
      .set('Authorization', `Bearer ${token}`)
      .send({ signals: ['pushups', 'dips', 'pullups', 'handstands'] })
      .expect(200);

    expect(adapted.body.nodes.map((node: { title: string }) => node.title)).toContain('Muscle up pathway');
  });

  it('surfaces Gemini errors when GEMINI_API_KEY is configured', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    const originalFetch = globalThis.fetch;
    process.env.GEMINI_API_KEY = 'test-key';

    globalThis.fetch = (async () => {
      return new Response('bad key', { status: 401 });
    }) as typeof fetch;

    try {
      const app = createApp({
        store: new JsonStore(join(tempDir, 'db.json')),
        jwtSecret: 'test-secret',
      });

      const signup = await request(app)
        .post('/api/auth/signup')
        .send({ username: 'tester2', password: 'password123', avatar: 'T' })
        .expect(201);
      const token = signup.body.token as string;

      const goal = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Learn React',
          experienceLevel: 'Beginner',
          weeklyHours: 5,
          interests: 'react, ui',
        })
        .expect(400);

      expect(String(goal.body.error)).toMatch(/Gemini request failed/i);
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
      globalThis.fetch = originalFetch;
    }
  });
});
