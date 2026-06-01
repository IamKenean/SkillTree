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
        palette: {
          name: 'Ivory Board',
          primary: '#E7D8B1',
          secondary: '#8B5E34',
          accent: '#FACC15',
          background: '#16110B',
          surface: '#2A1F14',
          text: '#FFF8E7',
        },
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
            tips: ['Start untimed.', 'Name the motif.', 'Review missed tactics.'],
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
            tips: ['Find the worst piece.', 'Name one plan.', 'Compare the endgame.'],
          },
        ],
      }),
    );

    expect(tree.generationSource).toBe('gemini');
    expect(tree.palette?.name).toBe('Ivory Board');
    expect(tree.nodes).toHaveLength(3);
    expect(tree.edges.filter((edge) => edge.source === tree.nodes[0].id)).toHaveLength(2);
    expect(tree.nodes.find((node) => node.title === 'Calculation-Based Player')?.tradeoff).toBe(
      'Sharp tactics vs long-term planning',
    );
    expect(tree.nodes.find((node) => node.title === 'Calculation-Based Player')?.tips).toContain('Start untimed.');
    expect(tree.nodes.slice(1).every((node) => node.prerequisites.length === 1)).toBe(true);
  });


  it('drops short Gemini unlockCondition strings instead of failing validation', () => {
    const tree = buildSkillTreeFromAiGraph(
      {
        title: 'I want to learn chess',
        experienceLevel: 'Beginner',
        weeklyHours: 4,
        interests: 'tactics, openings',
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
            unlockCondition: 'locked',
          },
          {
            id: 'strategy_style',
            title: 'Strategy-Based Player',
            description: 'Develop through plans, positional choices, endgames, and long-term pressure.',
            children: [],
            difficulty: 'apprentice',
            branch: 'strategy',
            identity: 'Strategist',
            tradeoff: 'Long-term pressure vs immediate tactics',
            proofPrompt: 'Review one game and identify the main plan.',
            unlockCondition: 'none',
          },
        ],
      }),
    );

    expect(tree.generationSource).toBe('gemini');
    expect(tree.nodes.every((node) => node.unlockCondition === undefined)).toBe(true);
  });

  it('normalizes over-generated Gemini seed graphs instead of falling back', () => {
    const tree = buildSkillTreeFromAiGraph(
      {
        title: 'I want to learn chess',
        experienceLevel: 'Beginner',
        weeklyHours: 4,
        interests: 'tactics, openings',
      },
      JSON.stringify({
        root: {
          id: 'chess_start',
          title: 'Start Chess',
          description: 'Choose an initial chess identity direction.',
          children: ['calculation_style', 'strategy_style', 'opening_style', 'endgame_style'],
          difficulty: 'starter',
          branch: 'origin',
          identity: 'Chess Explorer',
          tradeoff: 'Calculation vs strategy',
          proofPrompt: 'Play one game and note your preferred style.',
        },
        nodes: [
          {
            id: 'calculation_style',
            title: 'Calculation-Based Player',
            description: 'Develop through tactics and forcing lines.',
            children: ['tactics_depth'],
            difficulty: 'apprentice',
            branch: 'calculation',
            identity: 'Calculator',
            tradeoff: 'Sharp tactics vs long-term planning',
            proofPrompt: 'Solve 10 tactics.',
          },
          {
            id: 'strategy_style',
            title: 'Strategy-Based Player',
            description: 'Develop through plans and positional choices.',
            children: ['positional_depth'],
            difficulty: 'apprentice',
            branch: 'strategy',
            identity: 'Strategist',
            tradeoff: 'Long-term pressure vs immediate tactics',
            proofPrompt: 'Review one strategic game.',
          },
          {
            id: 'opening_style',
            title: 'Opening-Based Player',
            description: 'Develop through repertoire and opening plans.',
            children: [],
            difficulty: 'apprentice',
            branch: 'opening',
            identity: 'Prepared Player',
            tradeoff: 'Preparation vs flexibility',
            proofPrompt: 'Write one opening note.',
          },
          {
            id: 'endgame_style',
            title: 'Endgame-Based Player',
            description: 'Develop through conversion and simplified positions.',
            children: [],
            difficulty: 'apprentice',
            branch: 'endgame',
            identity: 'Endgame Grinder',
            tradeoff: 'Conversion skill vs attacking initiative',
            proofPrompt: 'Study one pawn ending.',
          },
          {
            id: 'tactics_depth',
            title: 'Tactics Depth',
            description: 'Deeper tactics node that should wait for branch growth.',
            children: [],
            difficulty: 'adept',
            branch: 'calculation',
            identity: 'Tactician',
            tradeoff: 'Speed vs accuracy',
            proofPrompt: 'Solve harder tactics.',
          },
          {
            id: 'positional_depth',
            title: 'Positional Depth',
            description: 'Deeper strategy node that should wait for branch growth.',
            children: [],
            difficulty: 'adept',
            branch: 'strategy',
            identity: 'Strategist',
            tradeoff: 'Plans vs tactics',
            proofPrompt: 'Annotate pawn structure.',
          },
        ],
      }),
    );

    expect(tree.generationSource).toBe('gemini');
    expect(tree.nodes.map((node) => node.title)).toEqual([
      'I want to learn chess',
      'Calculation-Based Player',
      'Strategy-Based Player',
    ]);
    expect(tree.edges.filter((edge) => edge.source === tree.nodes[0].id)).toHaveLength(2);
    expect(tree.nodes.slice(1).every((node) => node.prerequisites.length === 1)).toBe(true);
  });



  it('normalizes overlong ids and missing proof prompts during branch expansion', () => {
    const tree = generateSkillTree({
      title: 'Build boxing knockout power',
      experienceLevel: 'Beginner',
      weeklyHours: 4,
      interests: 'boxing, power, footwork',
    });
    const selected = tree.nodes[0];
    const longId = 'explosive_power_chain_progression_drill_pathway_level_two';

    const expanded = expandSkillTreeFromAiBranch(
      tree,
      selected.id,
      JSON.stringify({
        nodes: [
          {
            id: 'first_rep',
            title: 'First Power Rep',
            description: 'Practice the smallest real version of explosive punching mechanics.',
            children: [longId],
            difficulty: 'apprentice',
            branch: 'power-growth',
            identity: 'Power Builder',
            tradeoff: 'Speed vs technique',
            proofPrompt: 'Throw 20 focused power shots and log what improved.',
          },
          {
            id: longId,
            title: 'Chain Power Transfer',
            description: 'Link hip rotation, foot pivot, and shoulder whip into one knockout line.',
            children: [],
            difficulty: 'adept',
            branch: 'power-growth',
            identity: 'Chain Striker',
            tradeoff: 'Power vs balance',
          },
        ],
      }),
    );

    expect(expanded.nodes.some((node) => node.title === 'Chain Power Transfer')).toBe(true);
    expect(expanded.nodes.find((node) => node.title === 'Chain Power Transfer')?.proof?.prompt.length).toBeGreaterThanOrEqual(8);
  });

  it('accepts null unlockCondition and truncates long branch expansion proof prompts', () => {
    const tree = generateSkillTree({
      title: 'I want to improve at photography',
      experienceLevel: 'Beginner',
      weeklyHours: 4,
      interests: 'street photography, portraits',
    });
    const selected = tree.nodes.find((node) => node.title === 'Street Photography Path') ?? tree.nodes[0];
    const longPrompt = 'Capture three layered street frames with foreground, subject, and background relationships. '.repeat(4).slice(0, 220);

    const expanded = expandSkillTreeFromAiBranch(
      tree,
      selected.id,
      JSON.stringify({
        nodes: [
          {
            id: 'street_sequences',
            title: 'Street Sequence Building',
            description: 'Create a connected set of street images around one visual theme.',
            children: ['gesture_hunting'],
            difficulty: 'adept',
            branch: 'street-growth',
            identity: 'Street Storyteller',
            tradeoff: 'Narrative cohesion vs spontaneous moments',
            proofPrompt: 'Shoot a five-photo street sequence.',
            unlockCondition: null,
          },
          {
            id: 'gesture_hunting',
            title: 'Gesture Hunting',
            description: 'Anticipate small human gestures that create emotion and story.',
            children: [],
            difficulty: 'expert',
            branch: 'street-growth',
            identity: 'Moment Hunter',
            tradeoff: 'Patience vs volume',
            proofPrompt: longPrompt,
            unlockCondition: null,
          },
        ],
      }),
    );

    const gesture = expanded.nodes.find((node) => node.title === 'Gesture Hunting');
    expect(expanded.nodes.find((node) => node.title === 'Street Sequence Building')?.unlockCondition).toBeUndefined();
    expect(gesture?.proof?.prompt.length).toBeLessThanOrEqual(180);
    expect(gesture?.proof?.prompt.length).toBeGreaterThanOrEqual(8);
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

  it('removes AI wrapper roots and branches children directly from the selected node', () => {
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
            id: 'street_growth_root',
            title: 'Start Street Photography Branch',
            description: 'Wrapper node that should not appear in the actual graph.',
            children: ['candid_timing', 'urban_layering'],
            difficulty: 'apprentice',
            branch: 'street-growth',
            identity: 'Street Explorer',
            tradeoff: 'Wrapper vs real branch',
            proofPrompt: 'This should not be shown.',
          },
          {
            id: 'candid_timing',
            title: 'Candid Timing',
            description: 'Practice anticipating gestures and decisive moments.',
            children: ['gesture_sequence'],
            difficulty: 'adept',
            branch: 'street-growth',
            identity: 'Moment Hunter',
            tradeoff: 'Patience vs volume',
            proofPrompt: 'Capture three timed candid frames.',
          },
          {
            id: 'urban_layering',
            title: 'Urban Layering',
            description: 'Compose foreground, subject, and background relationships.',
            children: [],
            difficulty: 'adept',
            branch: 'street-growth',
            identity: 'Layered Composer',
            tradeoff: 'Complexity vs clarity',
            proofPrompt: 'Create three layered street frames.',
          },
          {
            id: 'gesture_sequence',
            title: 'Gesture Sequence',
            description: 'Build a short sequence around repeated human gestures.',
            children: [],
            difficulty: 'expert',
            branch: 'street-growth',
            identity: 'Street Storyteller',
            tradeoff: 'Narrative vs single-image impact',
            proofPrompt: 'Create a five-image gesture sequence.',
          },
        ],
      }),
    );

    expect(expanded.nodes.some((node) => node.title === 'Start Street Photography Branch')).toBe(false);
    const candidTiming = expanded.nodes.find((node) => node.title === 'Candid Timing');
    const urbanLayering = expanded.nodes.find((node) => node.title === 'Urban Layering');
    expect(expanded.edges.some((edge) => edge.source === selected.id && edge.target === candidTiming?.id)).toBe(true);
    expect(expanded.edges.some((edge) => edge.source === selected.id && edge.target === urbanLayering?.id)).toBe(true);
  });

  it('rejects recursive generic branch-growth titles', () => {
    const tree = generateSkillTree({
      title: 'I want to ask my crush out',
      experienceLevel: 'Beginner',
      weeklyHours: 2,
      interests: 'confidence, conversation',
    });
    const selected = tree.nodes[0];

    expect(() =>
      expandSkillTreeFromAiBranch(
        tree,
        selected.id,
        JSON.stringify({
          nodes: [
            {
              id: 'bold_feedback',
              title: `${selected.title} Feedback Loop`,
              description: 'This recursive meta node should be rejected.',
              children: [],
              difficulty: 'apprentice',
              branch: 'social-growth',
              identity: 'Bold Initiator',
              tradeoff: 'Reflection vs action',
              proofPrompt: 'Rejected generic prompt.',
            },
            {
              id: 'bold_pressure',
              title: 'Clear Invitation',
              description: 'This recursive pressure node should be rejected.',
              children: [],
              difficulty: 'adept',
              branch: 'social-growth',
              identity: 'Bold Initiator',
              tradeoff: 'Pressure vs confidence',
              proofPrompt: 'Rejected generic prompt.',
            },
          ],
        }),
      ),
    ).toThrow(/generic or recursive title/i);
  });
});
