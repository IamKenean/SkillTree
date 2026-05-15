import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "./app.js";
import { resetStore } from "./db.js";

describe("Ascend API", () => {
  beforeEach(() => {
    resetStore();
  });

  it("creates a user, goal, and adaptive unlocks on focus tags", async () => {
    const signup = await request(app).post("/api/auth/signup").send({
      email: "user@example.com",
      password: "password123",
      username: "ranger",
    });
    expect(signup.status).toBe(201);

    const token = signup.body.token as string;
    const authHeader = { Authorization: `Bearer ${token}` };

    const createGoal = await request(app)
      .post("/api/goals")
      .set(authHeader)
      .send({
        mainGoal: "I want to get stronger with calisthenics",
        experienceLevel: "beginner",
        timePerWeek: 5,
        interests: ["bodyweight", "pullups"],
      });
    expect(createGoal.status).toBe(201);
    expect(createGoal.body.nodes.length).toBeGreaterThan(0);

    const rootNode = createGoal.body.nodes.find((node: { category: string }) => node.category === "root");
    expect(rootNode).toBeTruthy();

    const firstComplete = await request(app)
      .post(`/api/goals/${createGoal.body.goal.id}/nodes/${rootNode.id}/complete`)
      .set(authHeader)
      .send({
        journalEntry: "Started today",
        tags: ["pushups", "dips", "pullups"],
      });
    expect(firstComplete.status).toBe(200);
    expect(firstComplete.body.user.totalXp).toBeGreaterThan(0);

    const unlockedNode = firstComplete.body.nodes.find(
      (node: { status: string; category: string }) =>
        node.status === "unlocked" && node.category === "practice",
    );
    expect(unlockedNode).toBeTruthy();

    const secondComplete = await request(app)
      .post(`/api/goals/${createGoal.body.goal.id}/nodes/${unlockedNode.id}/complete`)
      .set(authHeader)
      .send({
        journalEntry: "Worked on pullup and dip volume",
        tags: ["calisthenics", "pullups", "dips"],
      });
    expect(secondComplete.status).toBe(200);
    const addedTitles = (secondComplete.body.newlyAddedNodes as Array<{ title: string }>).map(
      (node) => node.title,
    );
    expect(addedTitles).toContain("Muscle Up Path");
  });
});
