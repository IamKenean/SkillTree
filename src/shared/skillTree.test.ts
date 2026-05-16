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
    expect(adapted.nodes.map((node) => node.title)).toEqual(expect.arrayContaining(['Muscle Up Pathway', 'Front Lever Basics']));
    expect(adapted.nodes.find((node) => node.title === 'Muscle Up Pathway')?.hidden).toBe(false);
  });

  it('unlocks the first adaptive node when it grows from completed progress', () => {
    const tree = generateSkillTree({
      title: 'I want to get stronger',
      experienceLevel: 'Beginner',
      weeklyHours: 5,
      interests: 'pushups',
    });
    const completed = completeNode(tree, tree.nodes[0].id, 'Finished the baseline quest.', ['pullups']);
    const adapted = adaptSkillTree(completed, ['pushups', 'dips', 'pullups', 'handstand']);

    expect(adapted.nodes.find((node) => node.title === 'Muscle Up Pathway')?.status).toBe('unlocked');
  });

  it('generates a non-linear chess tree with identities, tradeoffs, and hidden logic', () => {
    const tree = generateSkillTree({
      title: 'I want to learn chess',
      experienceLevel: 'Beginner',
      weeklyHours: 3,
      interests: 'tactics, openings, rating climb',
    });
    const rootChildren = tree.edges.filter((edge) => edge.source === tree.nodes[0].id);
    const tactical = tree.nodes.find((node) => node.title === 'Tactical Specialist Path');
    const positional = tree.nodes.find((node) => node.title === 'Positional Understanding');

    expect(rootChildren).toHaveLength(2);
    expect(tactical?.identity).toBe('Tactical Specialist');
    expect(positional?.tradeoff).toContain('Long-term pressure');
    expect(tree.nodes.some((node) => node.unlockCondition?.includes('repeated'))).toBe(true);
  });

  it('generates boxing as a career-style graph toward first fight', () => {
    const tree = generateSkillTree({
      title: 'I want to learn boxing and maybe fight',
      experienceLevel: 'New',
      weeklyHours: 6,
      interests: 'jab, defense, sparring',
    });

    expect(tree.nodes.map((node) => node.title)).toEqual(
      expect.arrayContaining(['Outboxing Style', 'Counterfighter Path', 'First Amateur Fight']),
    );
    expect(tree.edges.filter((edge) => edge.source === tree.nodes[0].id)).toHaveLength(2);
    expect(tree.nodes.find((node) => node.title === 'First Amateur Fight')?.hidden).toBe(true);
  });

  it('generates photography genre divergence across street, portrait, cinematic, and commercial paths', () => {
    const tree = generateSkillTree({
      title: 'I want to improve at photography',
      experienceLevel: 'Beginner',
      weeklyHours: 4,
      interests: 'street photography, portraits, cinematic color',
    });

    expect(tree.nodes.map((node) => node.title)).toEqual(
      expect.arrayContaining(['Street Photography Path', 'Portrait Photography Path', 'Cinematic Photo Style']),
    );
    expect(tree.nodes.find((node) => node.title === 'Commercial / Paid Work Ready')?.unlockCondition).toContain(
      'portrait',
    );
  });
});
