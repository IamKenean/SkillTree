import { describe, expect, it } from 'vitest';
import { adaptSkillTree, completeNode, generateSkillTree } from './skillTree.js';

describe('skill tree engine', () => {
  it('generates a branching tree with locked progression and hidden future nodes', () => {
    const tree = generateSkillTree({
      title: 'I want to get stronger',
      experienceLevel: 'Beginner',
      weeklyHours: 4,
      interests: 'pushups, dips, pullups',
    });

    expect(tree.nodes.length).toBeGreaterThanOrEqual(12);
    expect(tree.edges.length).toBeGreaterThanOrEqual(9);
    expect(tree.nodes.filter((node) => node.status === 'unlocked').map((node) => node.title)).toContain(
      'I want to get stronger',
    );
    expect(tree.nodes.some((node) => node.hidden)).toBe(true);
  });

  it('awards XP, unlocks dependent nodes, and records achievements', () => {
    const tree = generateSkillTree({
      title: 'I want to improve at coding',
      experienceLevel: 'Novice',
      weeklyHours: 6,
      interests: 'frontend, react',
    });
    const completed = completeNode(tree, tree.nodes[0].id, 'Started the baseline quest.', ['react']);

    expect(completed.totalXp).toBe(50);
    expect(completed.streak).toBe(1);
    expect(completed.nodes.filter((node) => node.status === 'unlocked').length).toBeGreaterThan(1);
    expect(completed.achievements.map((achievement) => achievement.id)).toContain('first-step');
  });

  it('adds adaptive calisthenics branches from repeated progress signals', () => {
    const tree = generateSkillTree({
      title: 'I want to get stronger',
      experienceLevel: 'Beginner',
      weeklyHours: 5,
      interests: 'pushups',
    });
    const adapted = adaptSkillTree(tree, ['pushups', 'dips', 'pullups', 'handstand']);

    expect(adapted.interests).toContain('calisthenics');
    expect(adapted.nodes.map((node) => node.title)).toEqual(expect.arrayContaining(['Muscle up pathway', 'Front lever basics']));
  });
});
