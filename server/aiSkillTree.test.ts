import { describe, expect, it } from 'vitest';
import { generateSkillTree } from '../src/shared/skillTree.js';
import { buildSkillTreeFromAiGraph, expandSkillTreeFromAiBranch } from './aiSkillTree.js';

describe('Gemini skill tree conversion', () => {
  it('converts a strict AI graph into an inspectable Ascend tree', () => {
    const tree = buildSkillTreeFromAiGraph(
      {
        title: 'I want to learn chess',
        experienceLevel: 'Beginner',
        weeklyHours: 4,
        interests: 'tactics, openings, positional chess',
      },
      JSON.stringify({
        root: {
          id: 'start_chess',
          title: 'Start Chess Journey',
          description: 'Learn the basics and choose your chess identity.',
          children: ['rules_basic', 'play_first_games'],
          difficulty: 'starter',
          branch: 'origin',
          identity: 'Chess Explorer',
          tradeoff: 'Theory vs practical play',
          proofPrompt: 'Play one game and write what confused you.',
        },
        nodes: [
          {
            id: 'rules_basic',
            title: 'Learn Rules & Piece Movement',
            description: 'Understand legal movement and checkmate patterns.',
            children: ['tactics_intro', 'opening_fundamentals'],
            difficulty: 'apprentice',
            branch: 'foundation',
            identity: 'Rules Builder',
            tradeoff: 'Correctness vs speed',
            proofPrompt: 'Explain the special rules.',
          },
          {
            id: 'play_first_games',
            title: 'Play 10 Casual Games',
            description: 'Build practical comfort with real positions.',
            children: ['blunder_reduction', 'pattern_recognition'],
            difficulty: 'apprentice',
            branch: 'practical',
            identity: 'Practical Player',
            tradeoff: 'Volume vs analysis',
            proofPrompt: 'Log 10 games and mistakes.',
          },
          {
            id: 'tactics_intro',
            title: 'Basic Tactics',
            description: 'Train forks, pins, skewers, and discovered attacks.',
            children: ['tactics_specialist', 'positional_basics'],
            difficulty: 'adept',
            branch: 'tactical',
            identity: 'Tactical Initiate',
            tradeoff: 'Calculation vs patience',
            proofPrompt: 'Solve 20 tactics.',
          },
          {
            id: 'opening_fundamentals',
            title: 'Opening Principles',
            description: 'Learn center control, development, and king safety.',
            children: ['opening_specialist'],
            difficulty: 'adept',
            branch: 'opening',
            identity: 'Opening Architect',
            tradeoff: 'Preparation vs flexibility',
            proofPrompt: 'Annotate three openings.',
          },
          {
            id: 'blunder_reduction',
            title: 'Reduce Blunders',
            description: 'Build a scan routine before every move.',
            children: ['defensive_player'],
            difficulty: 'adept',
            branch: 'defense',
            identity: 'Solid Defender',
            tradeoff: 'Safety vs initiative',
            proofPrompt: 'Review five blunders.',
          },
          {
            id: 'pattern_recognition',
            title: 'Recognize Common Patterns',
            description: 'Spot recurring motifs and weak-square patterns.',
            children: ['attacking_style'],
            difficulty: 'adept',
            branch: 'pattern',
            identity: 'Pattern Hunter',
            tradeoff: 'Instinct vs calculation',
            proofPrompt: 'Collect five pattern positions.',
          },
          {
            id: 'tactics_specialist',
            title: 'Tactical Specialist Path',
            description: 'Lean into forcing moves and combinations.',
            children: ['sacrifice_master'],
            difficulty: 'expert',
            branch: 'tactical',
            identity: 'Tactical Specialist',
            tradeoff: 'Sharp attacks vs structural risk',
            proofPrompt: 'Complete a timed tactic set.',
          },
          {
            id: 'positional_basics',
            title: 'Positional Understanding',
            description: 'Study pawn structure and improving moves.',
            children: ['grandmaster_thinking'],
            difficulty: 'expert',
            branch: 'positional',
            identity: 'Strategic Builder',
            tradeoff: 'Long-term pressure vs immediate tactics',
            proofPrompt: 'Annotate a positional game.',
          },
          {
            id: 'opening_specialist',
            title: 'Opening Specialist',
            description: 'Build a compact repertoire with plans.',
            children: [],
            difficulty: 'expert',
            branch: 'opening',
            identity: 'Prepared Player',
            tradeoff: 'Memory vs adaptability',
            proofPrompt: 'Write a repertoire note.',
          },
          {
            id: 'defensive_player',
            title: 'Defensive Player',
            description: 'Survive pressure and simplify danger.',
            children: [],
            difficulty: 'expert',
            branch: 'defense',
            identity: 'Defender',
            tradeoff: 'Safety vs counterplay',
            proofPrompt: 'Save two worse positions.',
          },
          {
            id: 'attacking_style',
            title: 'Attacking Style',
            description: 'Coordinate pieces toward the king.',
            children: [],
            difficulty: 'expert',
            branch: 'attacking',
            identity: 'Attacker',
            tradeoff: 'Initiative vs material',
            proofPrompt: 'Annotate two attacks.',
          },
          {
            id: 'sacrifice_master',
            title: 'Sacrifice Master',
            description: 'Learn material sacrifice and compensation.',
            children: [],
            difficulty: 'legendary',
            branch: 'tactical',
            identity: 'Sacrifice Artist',
            tradeoff: 'Attack vs safety',
            proofPrompt: 'Annotate three sacrifices.',
            hidden: true,
            unlockCondition: 'Unlock after repeated sacrifice or attack proof.',
          },
          {
            id: 'grandmaster_thinking',
            title: 'Grandmaster Thinking',
            description: 'Evaluate plans before calculating moves.',
            children: [],
            difficulty: 'legendary',
            branch: 'positional',
            identity: 'Strategist',
            tradeoff: 'Plans vs tactics',
            proofPrompt: 'Annotate a master game.',
            hidden: true,
            unlockCondition: 'Unlock after repeated positional annotations.',
          },
        ],
      }),
    );

    expect(tree.generationSource).toBe('gemini');
    expect(tree.edges.filter((edge) => edge.source === tree.nodes[0].id)).toHaveLength(2);
    expect(tree.nodes.find((node) => node.title === 'Tactical Specialist Path')?.tradeoff).toBe(
      'Sharp attacks vs structural risk',
    );
    expect(tree.nodes.filter((node) => node.hidden)).toHaveLength(2);
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
