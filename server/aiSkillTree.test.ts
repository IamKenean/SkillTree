import { describe, expect, it } from 'vitest';
import { generateSkillTree } from '../src/shared/skillTree.js';
import { buildSkillTreeFromAiGraph, expandSkillTreeFromAiBranch } from './aiSkillTree.js';

describe('Gemini skill tree conversion', () => {
  it('converts a small AI seed graph into an inspectable Ascend tree', () => {
    const tree = buildSkillTreeFromAiGraph(
      {
        title: 'I want to learn chess',
        experienceLevel: 'Beginner',
        weeklyHours: 4,
        interests: 'tactics, openings, positional chess',
      },
      JSON.stringify({
        root: {
          id: 'chess_start',
          title: 'Start Chess',
          description: 'Choose the first identity direction for your chess journey.',
          children: ['calculation_style', 'strategy_style'],
          difficulty: 'starter',
          branch: 'origin',
          identity: 'Chess Explorer',
          tradeoff: 'Calculation vs strategic understanding',
          proofPrompt: 'Play one game and write which style felt more natural.',
        },
        nodes: [
          {
            id: 'calculation_style',
            title: 'Calculation-Based Player',
            description: 'Develop through tactics, forcing lines, and concrete move-by-move reading.',
            children: [],
            difficulty: 'apprentice',
            branch: 'calculation',
            identity: 'Calculator',
            tradeoff: 'Sharp tactics vs long-term planning',
            proofPrompt: 'Solve 10 tactics and note which motif repeats.',
          },
          {
            id: 'strategy_style',
            title: 'Strategy-Based Player',
            description: 'Develop through plans, positional choices, endgames, and long-term pressure.',
            children: [],
            difficulty: 'apprentice',
            branch: 'strategy',
            identity: 'Strategic Builder',
            tradeoff: 'Long-term pressure vs immediate tactics',
            proofPrompt: 'Review one game and identify the main plan.',
          },
        ],
      }),
    );

    expect(tree.generationSource).toBe('gemini');
    expect(tree.nodes).toHaveLength(3);
    expect(tree.edges.filter((edge) => edge.source === tree.nodes[0].id)).toHaveLength(2);
    expect(tree.nodes.find((node) => node.title === 'Calculation-Based Player')?.tradeoff).toBe(
      'Sharp tactics vs long-term planning',
    );
    expect(tree.nodes.slice(1).every((node) => node.prerequisites.length === 1)).toBe(true);
  });

  it('expands a selected node with concrete child and grandchild nodes', () => {
    const tree = generateSkillTree({
      title: 'I want to improve at photography',
      experienceLevel: 'Beginner',
      weeklyHours: 4,
      interests: 'street photography, portraits',
    });
    const selected = tree.nodes.find((node) => node.title === 'Street Photography Path') ?? tree.nodes[0];
    const expanded = expandSkillTreeFromAiBranch(
      tree,
      selected.id,
      JSON.stringify({
        nodes: [
          {
            id: 'street_sequences',
            title: 'Street Sequence Building',
            description: 'Create a connected set of street images around one visual theme.',
            children: ['gesture_hunting', 'layered_composition'],
            difficulty: 'adept',
            branch: 'street-growth',
            identity: 'Street Storyteller',
            tradeoff: 'Narrative cohesion vs spontaneous moments',
            proofPrompt: 'Shoot a five-photo street sequence.',
          },
          {
            id: 'gesture_hunting',
            title: 'Gesture Hunting',
            description: 'Anticipate small human gestures that create emotion and story.',
            children: ['hidden_documentary_access'],
            difficulty: 'expert',
            branch: 'street-growth',
            identity: 'Moment Hunter',
            tradeoff: 'Patience vs volume',
            proofPrompt: 'Capture three gesture-led frames.',
          },
          {
            id: 'layered_composition',
            title: 'Layered Composition',
            description: 'Use foreground, subject, and background relationships deliberately.',
            children: [],
            difficulty: 'expert',
            branch: 'street-growth',
            identity: 'Layered Composer',
            tradeoff: 'Complex frames vs clarity',
            proofPrompt: 'Create three layered frames.',
          },
          {
            id: 'hidden_documentary_access',
            title: 'Documentary Access Branch',
            description: 'Grow toward deeper access, trust, and long-form documentary work.',
            children: [],
            difficulty: 'legendary',
            branch: 'street-growth',
            identity: 'Documentarian',
            tradeoff: 'Access depth vs candid distance',
            proofPrompt: 'Build a subject-access plan.',
            hidden: true,
            unlockCondition: 'Unlock after repeated street sequence and human story proof.',
          },
        ],
      }),
    );

    expect(expanded.nodes.length).toBe(tree.nodes.length + 4);
    const streetSequence = expanded.nodes.find((node) => node.title === 'Street Sequence Building');
    expect(expanded.edges.some((edge) => edge.source === selected.id && edge.target === streetSequence?.id)).toBe(true);
    expect(expanded.nodes.find((node) => node.title === 'Documentary Access Branch')?.hidden).toBe(true);
    expect(expanded.edges.some((edge) => edge.target.includes('hidden-documentary-access'))).toBe(true);
  });
});
